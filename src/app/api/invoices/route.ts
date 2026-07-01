import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiHandler, apiList, apiSuccess, ApiError } from "@/lib/api-error";
import { getBusinessContext, requireRoleOrDemo } from "@/lib/business-context";
import { computeLine, deriveSupplyType, type LineInput } from "@/lib/gst";
import { recordAudit } from "@/lib/audit";
import { createInvoiceSchema, listQuerySchema } from "@/lib/schemas";

/**
 * GET /api/invoices — list invoices
 * Auth: any authenticated user (or demo mode in dev)
 * See: docs/04_API_SPECIFICATION.md
 */
export const GET = apiHandler(async (req: NextRequest) => {
  const ctx = await getBusinessContext(req);

  const url = new URL(req.url);
  const parsed = listQuerySchema.safeParse({
    q: url.searchParams.get("q") || undefined,
    status: url.searchParams.get("status") || undefined,
    limit: url.searchParams.get("limit") || undefined,
  });
  if (!parsed.success) {
    throw ApiError.validation("Invalid query parameters", parsed.error.issues);
  }
  const { q, status, limit } = parsed.data;

  const where: Record<string, unknown> = { businessId: ctx.businessId, deletedAt: null };
  if (status) where.status = status;
  if (q) {
    where.OR = [{ number: { contains: q } }, { partyName: { contains: q } }];
  }

  const items = await db.invoice.findMany({
    where,
    orderBy: { invoiceDate: "desc" },
    take: limit,
    include: { party: true },
  });

  return apiSuccess({
    items: items.map((i) => ({
      id: i.id,
      number: i.number,
      type: i.type,
      status: i.status,
      partyId: i.partyId,
      partyName: i.partyName,
      partyPhone: i.party?.phone ?? null,
      partyGstin: i.partyGstin,
      invoiceDate: i.invoiceDate,
      dueDate: i.dueDate,
      supplyType: i.supplyType,
      subtotal: i.subtotal,
      taxableValue: i.taxableValue,
      cgstTotal: i.cgstTotal,
      sgstTotal: i.sgstTotal,
      igstTotal: i.igstTotal,
      roundOff: i.roundOff,
      grandTotal: i.grandTotal,
      paidAmount: i.paidAmount,
      balance: i.balance,
    })),
  }, { isDemoMode: ctx.isDemoMode });
});

/**
 * POST /api/invoices — create a tax invoice
 * Auth: owner, partner, manager, sales (or demo mode in dev)
 */
export const POST = apiHandler(async (req: NextRequest) => {
  const ctx = await requireRoleOrDemo(req, ["owner", "partner", "manager", "sales"]);

  // Validate input with zod
  const parsed = createInvoiceSchema.safeParse(await req.json());
  if (!parsed.success) {
    throw ApiError.validation("Invalid invoice data", parsed.error.issues);
  }

  const {
    partyId, invoiceDate, dueDate, supplyType, items, notes, terms,
    partyName: overridePartyName, partyGstin, partyStateCode, placeOfSupply,
  } = parsed.data;

  const party = partyId ? await db.party.findFirst({ where: { id: partyId, businessId: ctx.businessId } }) : null;
  if (partyId && !party) {
    throw ApiError.notFound("Party not found in this business");
  }

  const finalSupply = supplyType ?? deriveSupplyType(ctx.stateCode, party?.stateCode ?? partyStateCode ?? null);

  const computed = items.map((l) => computeLine(l as LineInput, finalSupply));
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const subtotal = r2(computed.reduce((s, l) => s + l.gross, 0));
  const discountTotal = r2(computed.reduce((s, l) => s + l.discountTotal, 0));
  const taxableValue = r2(computed.reduce((s, l) => s + l.taxable, 0));
  const cgstTotal = r2(computed.reduce((s, l) => s + l.cgst, 0));
  const sgstTotal = r2(computed.reduce((s, l) => s + l.sgst, 0));
  const igstTotal = r2(computed.reduce((s, l) => s + l.igst, 0));
  const rawGrand = r2(taxableValue + cgstTotal + sgstTotal + igstTotal);
  const grandTotal = Math.round(rawGrand);
  const roundOff = r2(grandTotal - rawGrand);

  // Get next invoice number (atomic)
  const biz = await db.business.findUnique({ where: { id: ctx.businessId } });
  if (!biz) throw ApiError.notFound("Business not found");

  const seq = biz.invoiceSeq;
  const number = `${biz.invoicePrefix}-${String(seq).padStart(4, "0")}`;

  const inv = await db.invoice.create({
    data: {
      businessId: ctx.businessId,
      number,
      seq,
      type: "tax_invoice",
      status: "unpaid",
      partyId: party?.id ?? null,
      partyName: party?.name ?? overridePartyName ?? "Walk-in Customer",
      partyGstin: party?.gstin ?? partyGstin ?? null,
      partyStateCode: party?.stateCode ?? partyStateCode ?? null,
      invoiceDate: new Date(invoiceDate),
      dueDate: dueDate ? new Date(dueDate) : new Date(new Date(invoiceDate).getTime() + 30 * 86400000),
      supplyType: finalSupply,
      subtotal,
      discountTotal,
      taxableValue,
      cgstTotal,
      sgstTotal,
      igstTotal,
      roundOff,
      grandTotal,
      paidAmount: 0,
      balance: grandTotal,
      placeOfSupply: placeOfSupply ?? party?.stateCode ?? null,
      notes,
      terms,
    },
  });

  await db.invoiceItem.createMany({
    data: computed.map((l) => ({
      invoiceId: inv.id,
      productId: l.productId ?? null,
      name: l.name,
      hsn: l.hsn ?? null,
      quantity: l.quantity,
      unit: l.unit ?? null,
      price: l.price,
      discountPct: l.discountPct ?? 0,
      discountAmt: l.discountAmt ?? 0,
      taxRate: l.taxRate,
      taxable: l.taxable,
      cgst: l.cgst,
      sgst: l.sgst,
      igst: l.igst,
      total: l.total,
    })),
  });

  // Decrement stock + record movement
  const warehouse = await db.warehouse.findFirst({ where: { businessId: ctx.businessId } });
  for (const l of computed) {
    if (!l.productId) continue;
    await db.product.update({
      where: { id: l.productId },
      data: { stock: { decrement: l.quantity } },
    });
    if (warehouse) {
      await db.stockMovement.create({
        data: {
          businessId: ctx.businessId,
          productId: l.productId,
          warehouseId: warehouse.id,
          type: "sale",
          direction: "out",
          quantity: l.quantity,
          refType: "invoice",
          refId: inv.id,
        },
      });
    }
  }

  await db.business.update({ where: { id: ctx.businessId }, data: { invoiceSeq: seq + 1 } });

  await db.notification.create({
    data: {
      businessId: ctx.businessId,
      title: "Invoice created",
      body: `${number} for ₹${grandTotal.toLocaleString("en-IN")} created.`,
      kind: "info",
      link: `invoice:${inv.id}`,
    },
  });

  await recordAudit({
    businessId: ctx.businessId,
    userId: ctx.userId,
    action: "create",
    entity: "invoice",
    entityId: inv.id,
    summary: `Created ${number} for ${party?.name ?? overridePartyName ?? "customer"} — ${grandTotal}`,
    metadata: { number, partyName: party?.name, grandTotal, itemCount: computed.length },
  });

  return apiSuccess({ id: inv.id, number: inv.number }, undefined, 201);
});
