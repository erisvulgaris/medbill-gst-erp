import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActiveBusiness } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

export async function GET() {
  const biz = await getActiveBusiness();
  if (!biz) return NextResponse.json({ items: [] });
  const items = await db.payment.findMany({
    where: { businessId: biz.id },
    orderBy: { date: "desc" },
    take: 100,
    include: { party: true, invoice: true },
  });
  return NextResponse.json({
    items: items.map((p) => ({
      id: p.id, type: p.type, mode: p.mode, amount: p.amount, date: p.date,
      reference: p.reference, note: p.note,
      partyName: p.party?.name ?? null, invoiceNumber: p.invoice?.number ?? null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const biz = await getActiveBusiness();
  if (!biz) return NextResponse.json({ error: "no business" }, { status: 404 });
  const body = await req.json();
  const payment = await db.payment.create({
    data: {
      businessId: biz.id,
      type: body.type || "receipt",
      mode: body.mode || "cash",
      amount: Number(body.amount) || 0,
      date: new Date(body.date),
      invoiceId: body.invoiceId || null,
      purchaseId: body.purchaseId || null,
      partyId: body.partyId || null,
      reference: body.reference || null,
      note: body.note || null,
    },
  });

  // Update invoice paid/balance if linked
  if (body.invoiceId) {
    const inv = await db.invoice.findUnique({ where: { id: body.invoiceId } });
    if (inv) {
      const newPaid = inv.paidAmount + payment.amount;
      const newBalance = Math.max(0, inv.grandTotal - newPaid);
      const status = newBalance === 0 ? "paid" : newBalance < inv.grandTotal ? "partial" : "unpaid";
      await db.invoice.update({ where: { id: inv.id }, data: { paidAmount: newPaid, balance: newBalance, status } });
    }
  }

  await recordAudit({
    businessId: biz.id,
    action: "payment",
    entity: "payment",
    entityId: payment.id,
    summary: `${body.type === "receipt" ? "Received" : "Paid"} ${payment.amount} via ${payment.mode}${body.invoiceId ? ` for invoice` : ""}`,
    metadata: { type: body.type, mode: body.mode, amount: payment.amount, invoiceId: body.invoiceId },
  });

  return NextResponse.json({ ok: true, payment });
}
