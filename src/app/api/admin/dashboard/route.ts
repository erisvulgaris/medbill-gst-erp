import { NextRequest } from "next/server";
import { apiHandler, apiSuccess } from "@/lib/api-error";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const GET = apiHandler(async (req: NextRequest) => {
  await requireAdmin(req);

  const [businesses, users, subscriptions, plans] = await Promise.all([
    db.business.count({ where: { deletedAt: null } }),
    db.user.count({ where: { deletedAt: null, authProvider: { not: "super_admin" } } }),
    db.subscription.findMany({ include: { plan: true, business: { select: { name: true } } } }),
    db.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { priceYearly: "asc" } }),
  ]);

  // Revenue calculation
  const activeSubs = subscriptions.filter(s => s.status === "active");
  const totalRevenue = activeSubs.reduce((sum, s) => sum + s.amount, 0);
  const monthlyRevenue = Math.round(totalRevenue / 12);

  // Plan distribution
  const planDistribution = plans.map(plan => {
    const count = subscriptions.filter(s => s.planId === plan.id).length;
    return { plan: plan.displayName, price: plan.priceYearly, count, revenue: count * plan.priceYearly };
  });

  // Recent signups
  const recentBusinesses = await db.business.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, name: true, industry: true, createdAt: true, email: true, phone: true },
  });

  // Subscription status counts
  const statusCounts = {
    trial: subscriptions.filter(s => s.status === "trial").length,
    active: subscriptions.filter(s => s.status === "active").length,
    expired: subscriptions.filter(s => s.status === "expired").length,
    suspended: subscriptions.filter(s => s.status === "suspended").length,
  };

  return apiSuccess({
    metrics: {
      totalBusinesses: businesses,
      totalUsers: users,
      totalRevenue,
      monthlyRevenue,
      activeSubscriptions: statusCounts.active,
      trialSubscriptions: statusCounts.trial,
    },
    planDistribution,
    statusCounts,
    plans: plans.map(p => ({
      id: p.id, name: p.name, displayName: p.displayName,
      priceYearly: p.priceYearly, priceMonthly: p.priceMonthly,
      maxUsers: p.maxUsers, maxProducts: p.maxProducts, maxBranches: p.maxBranches,
    })),
    recentBusinesses,
  });
});
