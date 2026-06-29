import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActiveBusiness } from "@/lib/auth";

export async function GET() {
  const biz = await getActiveBusiness();
  if (!biz) return NextResponse.json({ error: "no business" }, { status: 404 });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const last30 = new Date(now.getTime() - 30 * 86400000);
  const last7 = new Date(now.getTime() - 7 * 86400000);

  const [invoices, prevInvoices, purchases, expenses, products, parties, receipts, receipts7, notifications, recentInvoices, overdue] = await Promise.all([
    db.invoice.findMany({ where: { businessId: biz.id, invoiceDate: { gte: startOfMonth } }, select: { grandTotal: true, status: true, invoiceDate: true } }),
    db.invoice.findMany({ where: { businessId: biz.id, invoiceDate: { gte: startOfPrevMonth, lt: startOfMonth } }, select: { grandTotal: true } }),
    db.purchase.findMany({ where: { businessId: biz.id, invoiceDate: { gte: startOfMonth } }, select: { grandTotal: true } }),
    db.expense.findMany({ where: { businessId: biz.id, date: { gte: startOfMonth } }, select: { amount: true } }),
    db.product.findMany({ where: { businessId: biz.id, deletedAt: null }, select: { stock: true, minStock: true, name: true, salePrice: true, id: true } }),
    db.party.findMany({ where: { businessId: biz.id, deletedAt: null }, select: { type: true, id: true, name: true } }),
    db.payment.findMany({ where: { businessId: biz.id, type: "receipt", date: { gte: startOfMonth } }, select: { amount: true } }),
    db.payment.findMany({ where: { businessId: biz.id, type: "receipt", date: { gte: last7 } }, select: { amount: true, date: true } }),
    db.notification.findMany({ where: { businessId: biz.id }, orderBy: { createdAt: "desc" }, take: 8 }),
    db.invoice.findMany({ where: { businessId: biz.id }, orderBy: { invoiceDate: "desc" }, take: 6, include: { party: true } }),
    db.invoice.findMany({ where: { businessId: biz.id, status: { in: ["unpaid", "partial"] }, dueDate: { lt: now } }, select: { balance: true } }),
  ]);

  const monthSales = invoices.reduce((s, i) => s + i.grandTotal, 0);
  const prevMonthSales = prevInvoices.reduce((s, i) => s + i.grandTotal, 0);
  const salesGrowth = prevMonthSales === 0 ? 100 : ((monthSales - prevMonthSales) / prevMonthSales) * 100;

  const monthPurchases = purchases.reduce((s, p) => s + p.grandTotal, 0);
  const monthExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const monthReceipts = receipts.reduce((s, r) => s + r.amount, 0);
  const receipts7Total = receipts7.reduce((s, r) => s + r.amount, 0);

  const outstanding = invoices.reduce((s, i) => s + (i.status === "unpaid" || i.status === "partial" ? 0 : 0), 0);
  // outstanding from all unpaid invoices
  const allUnpaid = await db.invoice.findMany({ where: { businessId: biz.id, status: { in: ["unpaid", "partial", "overdue"] } }, select: { balance: true } });
  const totalOutstanding = allUnpaid.reduce((s, i) => s + i.balance, 0);
  const totalOverdue = overdue.reduce((s, i) => s + i.balance, 0);

  const customerCount = parties.filter((p) => p.type === "customer" || p.type === "both").length;
  const supplierCount = parties.filter((p) => p.type === "supplier" || p.type === "both").length;

  const lowStockProducts = products.filter((p) => p.stock <= p.minStock);
  const outOfStock = products.filter((p) => p.stock <= 0);
  const inventoryValue = products.reduce((s, p) => s + p.stock * p.salePrice, 0);

  // last 14 days sales sparkline — single aggregation query (not N+1)
  // See: PERFORMANCE_REPORT.md §4.2, ADR-008
  const sparkStart = new Date(now.getTime() - 13 * 86400000);
  const sparkStartDay = new Date(sparkStart.getFullYear(), sparkStart.getMonth(), sparkStart.getDate());

  const [salesByDay, receiptsByDay] = await Promise.all([
    db.invoice.findMany({
      where: { businessId: biz.id, invoiceDate: { gte: sparkStartDay } },
      select: { invoiceDate: true, grandTotal: true },
    }),
    db.payment.findMany({
      where: { businessId: biz.id, type: "receipt", date: { gte: sparkStartDay } },
      select: { date: true, amount: true },
    }),
  ]);

  // Bucket into 14 day buckets in JS (O(n) instead of 28 queries)
  const salesMap = new Map<string, number>();
  const receiptsMap = new Map<string, number>();
  for (const inv of salesByDay) {
    const key = new Date(inv.invoiceDate.getFullYear(), inv.invoiceDate.getMonth(), inv.invoiceDate.getDate()).toISOString().slice(0, 10);
    salesMap.set(key, (salesMap.get(key) ?? 0) + inv.grandTotal);
  }
  for (const pmt of receiptsByDay) {
    const key = new Date(pmt.date.getFullYear(), pmt.date.getMonth(), pmt.date.getDate()).toISOString().slice(0, 10);
    receiptsMap.set(key, (receiptsMap.get(key) ?? 0) + pmt.amount);
  }

  const days: { date: string; sales: number; receipts: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const day = new Date(now.getTime() - i * 86400000);
    const dayKey = new Date(day.getFullYear(), day.getMonth(), day.getDate()).toISOString().slice(0, 10);
    days.push({
      date: dayKey,
      sales: salesMap.get(dayKey) ?? 0,
      receipts: receiptsMap.get(dayKey) ?? 0,
    });
  }

  // top products by sales value (last 30 days)
  const topItems = await db.invoiceItem.findMany({
    where: { invoice: { businessId: biz.id, invoiceDate: { gte: last30 } } },
    select: { name: true, quantity: true, total: true },
  });
  const productAgg = new Map<string, { qty: number; revenue: number }>();
  for (const it of topItems) {
    const cur = productAgg.get(it.name) ?? { qty: 0, revenue: 0 };
    cur.qty += it.quantity;
    cur.revenue += it.total;
    productAgg.set(it.name, cur);
  }
  const topProducts = [...productAgg.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // sales by GST rate (last 30 days)
  const gstAgg = new Map<number, { taxable: number; tax: number }>();
  for (const it of topItems) {
    const cur = gstAgg.get(it.taxRate) ?? { taxable: 0, tax: 0 };
    cur.taxable += it.taxable;
    cur.tax += it.cgst + it.sgst + it.igst;
    gstAgg.set(it.taxRate, cur);
  }
  const gstBreakdown = [...gstAgg.entries()]
    .map(([rate, v]) => ({ rate, ...v }))
    .sort((a, b) => a.rate - b.rate);

  return NextResponse.json({
    kpis: {
      monthSales,
      salesGrowth,
      monthPurchases,
      monthExpenses,
      monthReceipts,
      receipts7: receipts7Total,
      totalOutstanding,
      totalOverdue,
      customerCount,
      supplierCount,
      productCount: products.length,
      lowStockCount: lowStockProducts.length,
      outOfStockCount: outOfStock.length,
      inventoryValue,
      grossProfit: monthSales - monthPurchases - monthExpenses,
    },
    sparkline: days,
    topProducts,
    gstBreakdown,
    recentInvoices: recentInvoices.map((i) => ({
      id: i.id,
      number: i.number,
      partyName: i.partyName,
      date: i.invoiceDate,
      amount: i.grandTotal,
      status: i.status,
    })),
    lowStock: lowStockProducts.slice(0, 5).map((p) => ({
      id: p.id, name: p.name, stock: p.stock, minStock: p.minStock, salePrice: p.salePrice,
    })),
    notifications,
    unreadNotifications: notifications.filter((n) => !n.read).length,
  });
}
