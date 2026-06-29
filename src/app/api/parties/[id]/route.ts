import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActiveBusiness } from "@/lib/auth";

/** Returns a party ledger: opening balance + all invoices, purchases, payments. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const biz = await getActiveBusiness();
  if (!biz) return NextResponse.json({ error: "no business" }, { status: 404 });

  const party = await db.party.findFirst({ where: { id, businessId: biz.id } });
  if (!party) return NextResponse.json({ error: "not found" }, { status: 404 });

  const [invoices, purchases, payments] = await Promise.all([
    db.invoice.findMany({
      where: { businessId: biz.id, partyId: id, deletedAt: null },
      orderBy: { invoiceDate: "asc" },
      select: { id: true, number: true, invoiceDate: true, grandTotal: true, paidAmount: true, balance: true, status: true, type: true },
    }),
    db.purchase.findMany({
      where: { businessId: biz.id, partyId: id, deletedAt: null },
      orderBy: { invoiceDate: "asc" },
      select: { id: true, number: true, invoiceDate: true, grandTotal: true, balance: true, status: true },
    }),
    db.payment.findMany({
      where: { businessId: biz.id, partyId: id },
      orderBy: { date: "asc" },
      select: { id: true, type: true, mode: true, amount: true, date: true, reference: true, note: true, invoiceId: true },
    }),
  ]);

  // Build chronological ledger
  type Entry = { date: Date; type: string; ref: string; refType: string; refId: string | null; debit: number; credit: number; balance: number; note?: string | null };
  const entries: Entry[] = [];

  // Opening balance
  entries.push({
    date: party.createdAt,
    type: "opening",
    ref: "Opening Balance",
    refType: "opening",
    refId: null,
    debit: party.openingBalance > 0 ? party.openingBalance : 0,
    credit: party.openingBalance < 0 ? -party.openingBalance : 0,
    balance: party.openingBalance,
    note: "Opening balance",
  });

  // Sales invoices (debit — they owe us)
  for (const inv of invoices) {
    entries.push({
      date: inv.invoiceDate,
      type: "invoice",
      ref: inv.number,
      refType: "invoice",
      refId: inv.id,
      debit: inv.grandTotal,
      credit: 0,
      balance: 0,
      note: inv.type === "tax_invoice" ? "Sales invoice" : inv.type,
    });
  }
  // Purchases (credit — we owe them)
  for (const pur of purchases) {
    entries.push({
      date: pur.invoiceDate,
      type: "purchase",
      ref: pur.number,
      refType: "purchase",
      refId: pur.id,
      debit: 0,
      credit: pur.grandTotal,
      balance: 0,
      note: "Purchase bill",
    });
  }
  // Payments
  for (const p of payments) {
    entries.push({
      date: p.date,
      type: "payment",
      ref: p.reference || p.note || "Payment",
      refType: "payment",
      refId: p.id,
      // receipt (they paid us) → credit reduces their debit; payment (we paid them) → debit
      debit: p.type === "payment" ? p.amount : 0,
      credit: p.type === "receipt" ? p.amount : 0,
      balance: 0,
      note: `${p.type} via ${p.mode}`,
    });
  }

  // Sort by date and compute running balance (positive = they owe us)
  entries.sort((a, b) => a.date.getTime() - b.date.getTime());
  let running = party.openingBalance;
  for (const e of entries) {
    running += e.debit - e.credit;
    e.balance = running;
  }

  const totals = {
    totalSales: invoices.reduce((s, i) => s + i.grandTotal, 0),
    totalPurchases: purchases.reduce((s, p) => s + p.grandTotal, 0),
    totalReceived: payments.filter((p) => p.type === "receipt").reduce((s, p) => s + p.amount, 0),
    totalPaid: payments.filter((p) => p.type === "payment").reduce((s, p) => s + p.amount, 0),
    closingBalance: running,
    outstandingInvoices: invoices.filter((i) => i.balance > 0).reduce((s, i) => s + i.balance, 0),
  };

  return NextResponse.json({
    party: {
      id: party.id, name: party.name, type: party.type, phone: party.phone,
      email: party.email, gstin: party.gstin, city: party.city, state: party.state,
      stateCode: party.stateCode, openingBalance: party.openingBalance,
      creditLimit: party.creditLimit, creditDays: party.creditDays,
    },
    entries: entries.map((e) => ({ ...e, date: e.date.toISOString() })),
    totals,
    invoiceCount: invoices.length,
    purchaseCount: purchases.length,
    paymentCount: payments.length,
  });
}
