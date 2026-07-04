import { NextRequest } from "next/server";
import { apiHandler, apiSuccess } from "@/lib/api-error";
import { getBusinessContext } from "@/lib/business-context";
import { db } from "@/lib/db";

/**
 * GET /api/subscription — returns the current business's subscription + plan details.
 * Any authenticated user (or demo mode) can view their own subscription.
 */
export const GET = apiHandler(async (req: NextRequest) => {
  const ctx = await getBusinessContext(req);

  const sub = await db.subscription.findFirst({
    where: { businessId: ctx.businessId },
    include: { plan: true },
  });

  if (!sub) {
    return apiSuccess({
      subscription: null,
      plan: null,
      message: "No active subscription. Contact admin to activate.",
    });
  }

  // Calculate days remaining
  const now = new Date();
  const daysRemaining = Math.ceil((sub.endDate.getTime() - now.getTime()) / 86400000);
  const trialDaysRemaining = sub.trialEndsAt
    ? Math.ceil((sub.trialEndsAt.getTime() - now.getTime()) / 86400000)
    : null;

  return apiSuccess({
    subscription: {
      id: sub.id,
      status: sub.status,
      startDate: sub.startDate,
      endDate: sub.endDate,
      trialEndsAt: sub.trialEndsAt,
      amount: sub.amount,
      autoRenew: sub.autoRenew,
      daysRemaining,
      trialDaysRemaining,
    },
    plan: {
      id: sub.plan.id,
      name: sub.plan.name,
      displayName: sub.plan.displayName,
      priceYearly: sub.plan.priceYearly,
      priceMonthly: sub.plan.priceMonthly,
      maxUsers: sub.plan.maxUsers,
      maxProducts: sub.plan.maxProducts,
      maxBranches: sub.plan.maxBranches,
      maxInvoices: sub.plan.maxInvoices,
      features: JSON.parse(sub.plan.features),
    },
  });
});
