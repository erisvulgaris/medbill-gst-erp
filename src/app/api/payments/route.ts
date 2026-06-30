import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiHandler, apiSuccess, ApiError } from "@/lib/api-error";
import { getBusinessContext, requireRoleOrDemo } from "@/lib/business-context";
import { createPaymentSchema } from "@/lib/schemas";
import { recordAudit } from "@/lib/audit";

export const GET = apiHandler(async (req: NextRequest) => {
  const ctx = await getBusinessContext(req);
  const items = await db.payment.findMany({
    where: { businessId: ctx.businessId },
    orderBy: { date: "desc" },
    take: 100,
    include: { party: true, invoice: true },
  });
  return apiSuccess({
    items: items.map((p) => ({
      id: p.id, type: p.type, mode: p.mode, amount: p.amount, date: p.date,
      reference: p.reference, note: p.note,
      partyName: p.party?.name ?? null, invoiceNumber: p.invoice?.number ?? null,
    })),
  });
});

export const POST = apiHandler(async (req: NextRequest) => {
  const ctx = await requireRoleOrDemo(req, ["owner", "partner", "manager", "cashier", "sales"]);
  const parsed = createPaymentSchema.safeParse(await req.json());
  if (!parsed.success) throw ApiError.validation("Invalid payment data", parsed.error.issues);
  const body = parsed.data;

  const payment = await db.payment.create({
    data: {
      businessId: ctx.businessId,
      type: body.type, mode: body.mode, amount: body.amount,
      date: new Date(body.date), invoiceId: body.invoiceId || null,
      purchaseId: body.purchaseId || null, partyId: body.partyId || null,
      reference: body.reference || null, note: body.note || null,
    },
  });

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
    businessId: ctx.businessId, userId: ctx.userId, action: "payment", entity: "payment", entityId: payment.id,
    summary: `${body.type === "receipt" ? "Received" : "Paid"} ${payment.amount} via ${payment.mode}${body.invoiceId ? ` for invoice` : ""}`,
    metadata: { type: body.type, mode: body.mode, amount: payment.amount, invoiceId: body.invoiceId },
  });

  return apiSuccess({ payment }, undefined, 201);
});
