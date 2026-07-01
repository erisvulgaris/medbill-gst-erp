import { NextRequest } from "next/server";
import { apiHandler, apiSuccess } from "@/lib/api-error";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const GET = apiHandler(async (req: NextRequest) => {
  await requireAdmin(req);

  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "";

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const subscriptions = await db.subscription.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      business: { select: { id: true, name: true, industry: true, email: true } },
      plan: true,
    },
  });

  return apiSuccess({
    items: subscriptions.map(s => ({
      id: s.id,
      businessId: s.businessId,
      businessName: s.business.name,
      industry: s.business.industry,
      plan: s.plan.displayName,
      planName: s.plan.name,
      priceYearly: s.plan.priceYearly,
      status: s.status,
      startDate: s.startDate,
      endDate: s.endDate,
      trialEndsAt: s.trialEndsAt,
      amount: s.amount,
      autoRenew: s.autoRenew,
    })),
  });
});
