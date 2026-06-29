import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActiveBusiness } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const biz = await getActiveBusiness();
  if (!biz) return NextResponse.json({ items: [] });
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const cat = url.searchParams.get("category");

  const where: Record<string, unknown> = { businessId: biz.id, deletedAt: null };
  if (from || to) {
    where.date = {};
    if (from) (where.date as Record<string, unknown>).gte = new Date(from);
    if (to) (where.date as Record<string, unknown>).lte = new Date(to);
  }
  if (cat) where.category = cat;

  const items = await db.expense.findMany({ where, orderBy: { date: "desc" }, take: 200 });
  const total = items.reduce((s, e) => s + e.amount, 0);
  const byCategory = items.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});
  return NextResponse.json({ items, total, byCategory });
}

export async function POST(req: NextRequest) {
  const biz = await getActiveBusiness();
  if (!biz) return NextResponse.json({ error: "no business" }, { status: 404 });
  const body = await req.json();
  const expense = await db.expense.create({
    data: {
      businessId: biz.id,
      category: body.category || "misc",
      amount: Number(body.amount) || 0,
      date: new Date(body.date),
      mode: body.mode || "cash",
      vendor: body.vendor || null,
      reference: body.reference || null,
      note: body.note || null,
    },
  });
  return NextResponse.json({ ok: true, expense });
}
