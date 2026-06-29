import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActiveBusiness } from "@/lib/auth";
import { computeLine, deriveSupplyType, type LineInput } from "@/lib/gst";
import { recordAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const biz = await getActiveBusiness();
  if (!biz) return NextResponse.json({ items: [] });

  const url = new URL(req.url);
  const search = url.searchParams.get("q") || "";
  const status = url.searchParams.get("status") || "";
  const limit = Number(url.searchParams.get("limit") || 100);

  const where: Record<string, unknown> = { businessId: biz.id, deletedAt: null };
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { number: { contains: search } },
      { partyName: { contains: search } },
    ];
  }

  const items = await db.invoice.findMany({
    where,
    orderBy: { invoiceDate: "desc" },
    take: limit,
    include: { party: true },
  });

  return NextResponse.json({
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
  });
}

export async function POST(req: NextRequest) {
  const biz = await getActiveBusiness();
  if (!biz) return NextResponse.json({ error: "no business" }, { status: 404 });

  const body = await req.json();
  const {
    partyId, invoiceDate, dueDate, supplyType, items, notes, terms,
    partyName: overridePartyName, partyGstin, partyStateCode, placeOfSupply,
  } = body as {
    partyId?: string;
    invoiceDate: string;
    dueDate?: string;
    supplyType?: "intra" | "inter";
    items: LineInput[];
    notes?: string;
    terms?: string;
    partyName?: string;
    partyGstin?: string;
    partyStateCode?: string;
    placeOfSupply?: string;
  };

  if (!items || items.length === 0) {
    return NextResponse.json({ error: "At least one item required" }, { status: 400 });
  }

  const party = partyId ? await db.party.findUnique({ where: { id: partyId } }) : null;
  const finalSupply = supplyType ?? deriveSupplyType(biz.stateCode, party?.stateCode ?? partyStateCode);

  const computed = items.map((l) => computeLine(l, finalSupply));
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

  const seq = biz.invoiceSeq;
  const number = `${biz.invoicePrefix}-${String(seq).padStart(4, "0")}`;

  const inv = await db.invoice.create({
    data: {
      businessId: biz.id,
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
  const warehouse = await db.warehouse.findFirst({ where: { businessId: biz.id } });
  for (const l of computed) {
    if (!l.productId) continue;
    await db.product.update({
      where: { id: l.productId },
      data: { stock: { decrement: l.quantity } },
    });
    if (warehouse) {
      await db.stockMovement.create({
        data: {
          businessId: biz.id,
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

  await db.business.update({ where: { id: biz.id }, data: { invoiceSeq: seq + 1 } });

  await db.notification.create({
    data: {
      businessId: biz.id,
      title: "Invoice created",
      body: `${number} for ₹${grandTotal.toLocaleString("en-IN")} created.`,
      kind: "info",
      link: `invoice:${inv.id}`,
    },
  });

  await recordAudit({
    businessId: biz.id,
    action: "create",
    entity: "invoice",
    entityId: inv.id,
    summary: `Created ${number} for ${party?.name ?? "customer"} — ${grandTotal}`,
    metadata: { number, partyName: party?.name, grandTotal, itemCount: computed.length },
  });

  return NextResponse.json({ ok: true, invoice: { id: inv.id, number: inv.number } });
}
