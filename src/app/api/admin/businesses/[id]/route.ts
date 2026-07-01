import { NextRequest } from "next/server";
import { apiHandler, apiSuccess, ApiError } from "@/lib/api-error";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { z } from "zod";

export const GET = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdmin(req);
  const { id } = await params;

  const business = await db.business.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true, phone: true } },
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      subscription: { include: { plan: true } },
    },
  });
  if (!business) throw ApiError.notFound("Business not found");

  const [invoiceCount, productCount, partyCount, paymentCount] = await Promise.all([
    db.invoice.count({ where: { businessId: id } }),
    db.product.count({ where: { businessId: id, deletedAt: null } }),
    db.party.count({ where: { businessId: id, deletedAt: null } }),
    db.payment.count({ where: { businessId: id } }),
  ]);

  return apiSuccess({
    business: {
      id: business.id, name: business.name, legalName: business.legalName,
      gstin: business.gstin, pan: business.pan, industry: business.industry,
      email: business.email, phone: business.phone, city: business.city, state: business.state,
      createdAt: business.createdAt,
      owner: business.owner,
      members: business.members.map(m => ({ id: m.id, role: m.role, user: m.user })),
      subscription: business.subscription ? {
        id: business.subscription.id,
        status: business.subscription.status,
        plan: business.subscription.plan,
        startDate: business.subscription.startDate,
        endDate: business.subscription.endDate,
        trialEndsAt: business.subscription.trialEndsAt,
        amount: business.subscription.amount,
      } : null,
      usage: { invoiceCount, productCount, partyCount, paymentCount },
    },
  });
});

const updateSchema = z.object({
  action: z.enum(["suspend", "activate", "change_plan"]),
  planId: z.string().optional(),
});

export const PATCH = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdmin(req);
  const { id } = await params;
  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) throw ApiError.validation("Invalid request", parsed.error.issues);

  const { action, planId } = parsed.data;

  if (action === "suspend") {
    await db.business.update({ where: { id }, data: { deletedAt: new Date() } });
    const sub = await db.subscription.findFirst({ where: { businessId: id } });
    if (sub) await db.subscription.update({ where: { id: sub.id }, data: { status: "suspended" } });
    return apiSuccess({ suspended: true });
  }

  if (action === "activate") {
    await db.business.update({ where: { id }, data: { deletedAt: null } });
    const sub = await db.subscription.findFirst({ where: { businessId: id } });
    if (sub) await db.subscription.update({ where: { id: sub.id }, data: { status: "active" } });
    return apiSuccess({ activated: true });
  }

  if (action === "change_plan" && planId) {
    const plan = await db.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) throw ApiError.notFound("Plan not found");

    const sub = await db.subscription.findFirst({ where: { businessId: id } });
    if (sub) {
      await db.subscription.update({
        where: { id: sub.id },
        data: { planId, amount: plan.priceYearly, status: "active", endDate: new Date(Date.now() + 365 * 86400000) },
      });
    } else {
      await db.subscription.create({
        data: {
          businessId: id, planId, status: "active",
          startDate: new Date(), endDate: new Date(Date.now() + 365 * 86400000),
          amount: plan.priceYearly,
        },
      });
    }
    return apiSuccess({ planChanged: true, plan: plan.displayName, amount: plan.priceYearly });
  }

  throw ApiError.badRequest("Invalid action");
});
