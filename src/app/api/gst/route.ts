import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiHandler, apiSuccess, ApiError } from "@/lib/api-error";
import { getBusinessContext, requireRoleOrDemo } from "@/lib/business-context";

/** GSTR-1 style outward supplies breakdown by HSN + GST rate. */
export const GET = apiHandler(async (req: NextRequest) => {
  const ctx = await getBusinessContext(req);
  
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const now = new Date();
  const fromD = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
  const toD = to ? new Date(to) : now;

  const items = await db.invoiceItem.findMany({
    where: { invoice: { businessId: ctx.businessId, deletedAt: null, invoiceDate: { gte: fromD, lte: toD } } },
    select: { hsn: true, name: true, quantity: true, taxRate: true, taxable: true, cgst: true, sgst: true, igst: true, total: true, invoice: { select: { number: true, partyName: true, partyGstin: true, invoiceDate: true, supplyType: true } } },
  });

  // HSN-wise summary
  const hsnMap = new Map<string, { qty: number; taxable: number; cgst: number; sgst: number; igst: number; total: number; count: number }>();
  for (const it of items) {
    const key = it.hsn || "—";
    const cur = hsnMap.get(key) ?? { qty: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0, count: 0 };
    cur.qty += it.quantity;
    cur.taxable += it.taxable;
    cur.cgst += it.cgst;
    cur.sgst += it.sgst;
    cur.igst += it.igst;
    cur.total += it.total;
    cur.count += 1;
    hsnMap.set(key, cur);
  }
  const hsnSummary = [...hsnMap.entries()].map(([hsn, v]) => ({ hsn, ...v })).sort((a, b) => a.hsn.localeCompare(b.hsn));

  // Rate-wise summary (B2B + B2C combined)
  const rateMap = new Map<number, { taxable: number; cgst: number; sgst: number; igst: number; total: number; count: number }>();
  for (const it of items) {
    const key = it.taxRate;
    const cur = rateMap.get(key) ?? { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0, count: 0 };
    cur.taxable += it.taxable;
    cur.cgst += it.cgst;
    cur.sgst += it.sgst;
    cur.igst += it.igst;
    cur.total += it.total;
    cur.count += 1;
    rateMap.set(key, cur);
  }
  const rateSummary = [...rateMap.entries()].map(([rate, v]) => ({ rate, ...v })).sort((a, b) => a.rate - b.rate);

  const totals = {
    taxable: items.reduce((s, i) => s + i.taxable, 0),
    cgst: items.reduce((s, i) => s + i.cgst, 0),
    sgst: items.reduce((s, i) => s + i.sgst, 0),
    igst: items.reduce((s, i) => s + i.igst, 0),
    total: items.reduce((s, i) => s + i.total, 0),
    invoiceCount: new Set(items.map((i) => i.invoice.number)).size,
  };

  // Invoices list for GSTR-1
  const invoices = await db.invoice.findMany({
    where: { businessId: ctx.businessId, deletedAt: null, invoiceDate: { gte: fromD, lte: toD } },
    orderBy: { invoiceDate: "asc" },
    select: { number: true, partyName: true, partyGstin: true, invoiceDate: true, supplyType: true, taxableValue: true, cgstTotal: true, sgstTotal: true, igstTotal: true, grandTotal: true, status: true },
  });

  return apiSuccess({
    title: "GSTR-1 — Outward Supplies",
    period: { from: fromD, to: toD },
    hsnSummary, rateSummary, totals, invoices,
  });
});
