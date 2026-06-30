import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiHandler, apiSuccess, ApiError } from "@/lib/api-error";
import { getBusinessContext, requireRoleOrDemo } from "@/lib/business-context";
import { createExpenseSchema } from "@/lib/schemas";
import { recordAudit } from "@/lib/audit";

export const GET = apiHandler(async (req: NextRequest) => {
  const ctx = await getBusinessContext(req);
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const cat = url.searchParams.get("category");

  const where: Record<string, unknown> = { businessId: ctx.businessId, deletedAt: null };
  if (from || to) {
    where.date = {};
    if (from) (where.date as Record<string, unknown>).gte = new Date(from);
    if (to) (where.date as Record<string, unknown>).lte = new Date(to);
  }
  if (cat) where.category = cat;

  const items = await db.expense.findMany({ where, orderBy: { date: "desc" }, take: 200 });
  const total = items.reduce((s, e) => s + e.amount, 0);
  const byCategory = items.reduce<Record<string, number>>((acc, e) => { acc[e.category] = (acc[e.category] ?? 0) + e.amount; return acc; }, {});
  return apiSuccess({ items, total, byCategory });
});

export const POST = apiHandler(async (req: NextRequest) => {
  const ctx = await requireRoleOrDemo(req, ["owner", "partner", "manager"]);
  const parsed = createExpenseSchema.safeParse(await req.json());
  if (!parsed.success) throw ApiError.validation("Invalid expense data", parsed.error.issues);
  const body = parsed.data;

  const expense = await db.expense.create({
    data: {
      businessId: ctx.businessId,
      category: body.category, amount: body.amount, date: new Date(body.date),
      mode: body.mode, vendor: body.vendor || null, reference: body.reference || null, note: body.note || null,
    },
  });

  await recordAudit({ businessId: ctx.businessId, userId: ctx.userId, action: "create", entity: "expense", entityId: expense.id, summary: `Expense ${expense.category}: ${expense.amount}` });
  return apiSuccess({ expense }, undefined, 201);
});
