import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActiveBusiness } from "@/lib/auth";
import { computeLine, deriveSupplyType, type LineInput } from "@/lib/gst";
import { recordAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const biz = await getActiveBusiness();
  if (!biz) return NextResponse.json({ items: [] });
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";
  const where: Record<string, unknown> = { businessId: biz.id, deletedAt: null };
  if (q) where.OR = [{ number: { contains: q } }, { partyName: { contains: q } }, { subject: { contains: q } }];

  const items = await db.quotation.findMany({
    where,
    orderBy: { quotationDate: "desc" },
    take: 100,
    include: { party: true },
  });

  return NextResponse.json({
    items: items.map((qt) => ({
      id: qt.id, number: qt.number, type: qt.type, status: qt.status,
      partyId: qt.partyId, partyName: qt.partyName, partyPhone: qt.party?.phone ?? null,
      subject: qt.subject, quotationDate: qt.quotationDate, validUntil: qt.validUntil,
      grandTotal: qt.grandTotal, taxableValue: qt.taxableValue, createdAt: qt.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const biz = await getActiveBusiness();
  if (!biz) return NextResponse.json({ error: "no business" }, { status: 404 });
  const body = await req.json();
  const { partyId, quotationDate, validUntil, items, notes, terms, subject, partyName: overridePartyName, partyGstin, partyStateCode } = body as {
    partyId?: string; quotationDate: string; validUntil?: string; items: LineInput[];
    notes?: string; terms?: string; subject?: string;
    partyName?: string; partyGstin?: string; partyStateCode?: string;
  };

  if (!items?.length) return NextResponse.json({ error: "items required" }, { status: 400 });

  const party = partyId ? await db.party.findUnique({ where: { id: partyId } }) : null;
  const supplyType = deriveSupplyType(biz.stateCode, party?.stateCode ?? partyStateCode);
  const computed = items.map((l) => computeLine(l, supplyType));
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const subtotal = r2(computed.reduce((s, l) => s + l.gross, 0));
  const taxableValue = r2(computed.reduce((s, l) => s + l.taxable, 0));
  const cgstTotal = r2(computed.reduce((s, l) => s + l.cgst, 0));
  const sgstTotal = r2(computed.reduce((s, l) => s + l.sgst, 0));
  const igstTotal = r2(computed.reduce((s, l) => s + l.igst, 0));
  const rawGrand = r2(taxableValue + cgstTotal + sgstTotal + igstTotal);
  const grandTotal = Math.round(rawGrand);
  const roundOff = r2(grandTotal - rawGrand);

  const seq = biz.quotationSeq;
  const number = `${biz.quotationPrefix}-${String(seq).padStart(4, "0")}`;

  const qt = await db.quotation.create({
    data: {
      businessId: biz.id,
      number,
      seq,
      type: "quotation",
      status: "draft",
      partyId: party?.id ?? null,
      partyName: party?.name ?? overridePartyName ?? "Walk-in Customer",
      partyGstin: party?.gstin ?? partyGstin ?? null,
      partyStateCode: party?.stateCode ?? partyStateCode ?? null,
      subject: subject || null,
      quotationDate: new Date(quotationDate),
      validUntil: validUntil ? new Date(validUntil) : new Date(new Date(quotationDate).getTime() + 15 * 86400000),
      subtotal,
      taxableValue,
      cgstTotal,
      sgstTotal,
      igstTotal,
      roundOff,
      grandTotal,
      notes,
      terms,
    },
  });

  await db.quotationItem.createMany({
    data: computed.map((l) => ({
      quotationId: qt.id,
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

  await db.business.update({ where: { id: biz.id }, data: { quotationSeq: seq + 1 } });

  await recordAudit({
    businessId: biz.id,
    action: "create",
    entity: "quotation",
    entityId: qt.id,
    summary: `Created ${number} for ${party?.name ?? "customer"} — ${grandTotal}`,
    metadata: { number, grandTotal, itemCount: computed.length },
  });

  return NextResponse.json({ ok: true, quotation: { id: qt.id, number: qt.number } });
}
