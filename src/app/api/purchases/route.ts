import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiHandler, apiSuccess, ApiError } from "@/lib/api-error";
import { getBusinessContext, requireRoleOrDemo } from "@/lib/business-context";
import { computeLine, deriveSupplyType, type LineInput } from "@/lib/gst";

export const GET = apiHandler(async (req: NextRequest) => {
  const ctx = await getBusinessContext(req);
  
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";
  const where: Record<string, unknown> = { businessId: ctx.businessId, deletedAt: null };
  if (q) where.OR = [{ number: { contains: q } }, { partyName: { contains: q } }];

  const items = await db.purchase.findMany({
    where,
    orderBy: { invoiceDate: "desc" },
    take: 100,
    include: { party: true },
  });
  return apiSuccess({
    items: items.map((p) => ({
      id: p.id, number: p.number, status: p.status,
      partyName: p.partyName, partyPhone: p.party?.phone ?? null,
      invoiceNumber: p.invoiceNumber, invoiceDate: p.invoiceDate,
      grandTotal: p.grandTotal, paidAmount: p.paidAmount, balance: p.balance,
      supplyType: p.supplyType,
    })),
  });
});

export const POST = apiHandler(async (req: NextRequest) => {
  const ctx = await getBusinessContext(req);
  
  const body = await req.json();
  const { partyId, invoiceDate, items, notes, invoiceNumber, supplyType, partyName, partyGstin, partyStateCode } = body as {
    partyId?: string; invoiceDate: string; items: LineInput[]; notes?: string; invoiceNumber?: string;
    supplyType?: "intra" | "inter"; partyName?: string; partyGstin?: string; partyStateCode?: string;
  };
  if (!items?.length) return apiSuccess({ error: "items required" }, { status: 400 });

  const party = partyId ? await db.party.findUnique({ where: { id: partyId } }) : null;
  const finalSupply = supplyType ?? deriveSupplyType(ctx.businessId, party?.stateCode ?? partyStateCode);
  const computed = items.map((l) => computeLine(l, finalSupply));
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const subtotal = r2(computed.reduce((s, l) => s + l.gross, 0));
  const taxableValue = r2(computed.reduce((s, l) => s + l.taxable, 0));
  const cgstTotal = r2(computed.reduce((s, l) => s + l.cgst, 0));
  const sgstTotal = r2(computed.reduce((s, l) => s + l.sgst, 0));
  const igstTotal = r2(computed.reduce((s, l) => s + l.igst, 0));
  const rawGrand = r2(taxableValue + cgstTotal + sgstTotal + igstTotal);
  const grandTotal = Math.round(rawGrand);
  const roundOff = r2(grandTotal - rawGrand);

  const seq = (await db.purchase.count({ where: { businessId: ctx.businessId } })) + 1;
  const number = `PUR-${String(seq).padStart(4, "0")}`;

  const pur = await db.purchase.create({
    data: {
      businessId: ctx.businessId, number, seq, type: "purchase", status: "received",
      partyId: party?.id ?? null, partyName: party?.name ?? partyName ?? "Unknown",
      partyGstin: party?.gstin ?? partyGstin ?? null, partyStateCode: party?.stateCode ?? partyStateCode ?? null,
      invoiceNumber: invoiceNumber || null, invoiceDate: new Date(invoiceDate), receivedDate: new Date(),
      supplyType: finalSupply, subtotal, taxableValue, cgstTotal, sgstTotal, igstTotal, roundOff,
      grandTotal, paidAmount: grandTotal, balance: 0, notes,
    },
  });
  await db.purchaseItem.createMany({
    data: computed.map((l) => ({
      purchaseId: pur.id, productId: l.productId ?? null, name: l.name, hsn: l.hsn ?? null,
      quantity: l.quantity, unit: l.unit ?? null, price: l.price,
      discountPct: l.discountPct ?? 0, discountAmt: l.discountAmt ?? 0, taxRate: l.taxRate,
      taxable: l.taxable, cgst: l.cgst, sgst: l.sgst, igst: l.igst, total: l.total,
    })),
  });

  const warehouse = await db.warehouse.findFirst({ where: { businessId: ctx.businessId } });
  for (const l of computed) {
    if (!l.productId) continue;
    await db.product.update({ where: { id: l.productId }, data: { stock: { increment: l.quantity } } });
    if (warehouse) {
      await db.stockMovement.create({
        data: { businessId: ctx.businessId, productId: l.productId, warehouseId: warehouse.id, type: "purchase", direction: "in", quantity: l.quantity, refType: "purchase", refId: pur.id },
      });
    }
  }
  return apiSuccess({ purchase: { id: pur.id, number: pur.number } }, undefined, 201);
});
