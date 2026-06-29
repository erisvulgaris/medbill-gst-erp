import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActiveBusiness } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const biz = await getActiveBusiness();
  if (!biz) return NextResponse.json({ error: "no business" }, { status: 404 });
  const url = new URL(req.url);
  const report = url.searchParams.get("report") || "sales_register";
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const now = new Date();
  const fromD = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
  const toD = to ? new Date(to) : now;

  if (report === "sales_register") {
    const invoices = await db.invoice.findMany({
      where: { businessId: biz.id, deletedAt: null, invoiceDate: { gte: fromD, lte: toD } },
      orderBy: { invoiceDate: "asc" },
      include: { items: true },
    });
    const total = invoices.reduce((s, i) => s + i.grandTotal, 0);
    const taxable = invoices.reduce((s, i) => s + i.taxableValue, 0);
    const cgst = invoices.reduce((s, i) => s + i.cgstTotal, 0);
    const sgst = invoices.reduce((s, i) => s + i.sgstTotal, 0);
    const igst = invoices.reduce((s, i) => s + i.igstTotal, 0);
    return NextResponse.json({
      title: "Sales Register",
      period: { from: fromD, to: toD },
      rows: invoices.map((i) => ({
        date: i.invoiceDate, number: i.number, partyName: i.partyName, partyGstin: i.partyGstin,
        supplyType: i.supplyType, taxable: i.taxableValue, cgst: i.cgstTotal, sgst: i.sgstTotal,
        igst: i.igstTotal, total: i.grandTotal, status: i.status,
      })),
      totals: { count: invoices.length, taxable, cgst, sgst, igst, total },
    });
  }

  if (report === "purchase_register") {
    const purchases = await db.purchase.findMany({
      where: { businessId: biz.id, deletedAt: null, invoiceDate: { gte: fromD, lte: toD } },
      orderBy: { invoiceDate: "asc" },
    });
    const total = purchases.reduce((s, p) => s + p.grandTotal, 0);
    const taxable = purchases.reduce((s, p) => s + p.taxableValue, 0);
    return NextResponse.json({
      title: "Purchase Register",
      period: { from: fromD, to: toD },
      rows: purchases.map((p) => ({
        date: p.invoiceDate, number: p.number, invoiceNumber: p.invoiceNumber, partyName: p.partyName,
        partyGstin: p.partyGstin, taxable: p.taxableValue, cgst: p.cgstTotal, sgst: p.sgstTotal,
        igst: p.igstTotal, total: p.grandTotal,
      })),
      totals: { count: purchases.length, taxable, total },
    });
  }

  if (report === "profit_loss") {
    const [invoices, purchases, expenses] = await Promise.all([
      db.invoice.findMany({ where: { businessId: biz.id, deletedAt: null, invoiceDate: { gte: fromD, lte: toD } }, select: { taxableValue: true, grandTotal: true, items: { select: { taxable: true, total: true } } } }),
      db.purchase.findMany({ where: { businessId: biz.id, deletedAt: null, invoiceDate: { gte: fromD, lte: toD } }, select: { taxableValue: true, grandTotal: true } }),
      db.expense.findMany({ where: { businessId: biz.id, date: { gte: fromD, lte: toD } }, select: { amount: true, category: true } }),
    ]);
    const revenue = invoices.reduce((s, i) => s + i.taxableValue, 0);
    const cogs = purchases.reduce((s, p) => s + p.taxableValue, 0);
    const expTotal = expenses.reduce((s, e) => s + e.amount, 0);
    const expByCat = expenses.reduce<Record<string, number>>((a, e) => { a[e.category] = (a[e.category] ?? 0) + e.amount; return a; }, {});
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - expTotal;
    return NextResponse.json({
      title: "Profit & Loss Statement",
      period: { from: fromD, to: toD },
      revenue, cogs, grossProfit,
      expenses: expByCat, expTotal, netProfit,
    });
  }

  if (report === "party_summary") {
    const parties = await db.party.findMany({ where: { businessId: biz.id, deletedAt: null }, orderBy: { name: "asc" } });
    const partyIds = parties.map((p) => p.id);
    const [sales, purchases, payments] = await Promise.all([
      db.invoice.findMany({ where: { businessId: biz.id, partyId: { in: partyIds }, invoiceDate: { gte: fromD, lte: toD } }, select: { partyId: true, grandTotal: true, balance: true } }),
      db.purchase.findMany({ where: { businessId: biz.id, partyId: { in: partyIds }, invoiceDate: { gte: fromD, lte: toD } }, select: { partyId: true, grandTotal: true } }),
      db.payment.findMany({ where: { businessId: biz.id, partyId: { in: partyIds }, date: { gte: fromD, lte: toD } }, select: { partyId: true, amount: true, type: true } }),
    ]);
    const rows = parties.map((p) => {
      const s = sales.filter((x) => x.partyId === p.id);
      const pu = purchases.filter((x) => x.partyId === p.id);
      const pay = payments.filter((x) => x.partyId === p.id);
      const salesTotal = s.reduce((a, x) => a + x.grandTotal, 0);
      const purchaseTotal = pu.reduce((a, x) => a + x.grandTotal, 0);
      const received = pay.filter((x) => x.type === "receipt").reduce((a, x) => a + x.amount, 0);
      const paid = pay.filter((x) => x.type === "payment").reduce((a, x) => a + x.amount, 0);
      const balance = s.reduce((a, x) => a + x.balance, 0);
      return {
        id: p.id, name: p.name, type: p.type, phone: p.phone, gstin: p.gstin,
        salesTotal, purchaseTotal, received, paid, balance, opening: p.openingBalance,
      };
    });
    return NextResponse.json({ title: "Party Report", period: { from: fromD, to: toD }, rows });
  }

  if (report === "inventory_valuation") {
    const products = await db.product.findMany({ where: { businessId: biz.id, deletedAt: null }, include: { unit: true } });
    const rows = products.map((p) => ({
      name: p.name, sku: p.sku, hsn: p.hsn, stock: p.stock, unit: p.unit?.symbol ?? null,
      purchasePrice: p.purchasePrice, salePrice: p.salePrice, mrp: p.mrp,
      costValue: p.stock * p.purchasePrice, saleValue: p.stock * p.salePrice,
      potentialProfit: p.stock * (p.salePrice - p.purchasePrice),
    }));
    const totalCost = rows.reduce((s, r) => s + r.costValue, 0);
    const totalSale = rows.reduce((s, r) => s + r.saleValue, 0);
    return NextResponse.json({ title: "Inventory Valuation", rows, totals: { totalCost, totalSale, potentialProfit: totalSale - totalCost } });
  }

  if (report === "day_book") {
    const [invoices, purchases, expenses, payments] = await Promise.all([
      db.invoice.findMany({ where: { businessId: biz.id, invoiceDate: { gte: fromD, lte: toD } }, select: { invoiceDate: true, number: true, partyName: true, grandTotal: true } }),
      db.purchase.findMany({ where: { businessId: biz.id, invoiceDate: { gte: fromD, lte: toD } }, select: { invoiceDate: true, number: true, partyName: true, grandTotal: true } }),
      db.expense.findMany({ where: { businessId: biz.id, date: { gte: fromD, lte: toD } }, select: { date: true, category: true, amount: true, note: true } }),
      db.payment.findMany({ where: { businessId: biz.id, date: { gte: fromD, lte: toD } }, select: { date: true, type: true, mode: true, amount: true, reference: true } }),
    ]);
    return NextResponse.json({
      title: "Day Book",
      period: { from: fromD, to: toD },
      sales: invoices, purchases, expenses, payments,
    });
  }

  return NextResponse.json({ error: "unknown report" }, { status: 400 });
}
