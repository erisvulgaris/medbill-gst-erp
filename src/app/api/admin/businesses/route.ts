import { NextRequest } from "next/server";
import { apiHandler, apiSuccess, ApiError } from "@/lib/api-error";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const GET = apiHandler(async (req: NextRequest) => {
  await requireAdmin(req);

  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";

  const where: Record<string, unknown> = { deletedAt: null };
  if (q) where.OR = [{ name: { contains: q } }, { email: { contains: q } }, { gstin: { contains: q } }];

  const businesses = await db.business.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true, name: true, industry: true, gstin: true, email: true, phone: true,
      city: true, state: true, createdAt: true,
    },
  });

  // Get subscription info for each business
  const businessIds = businesses.map(b => b.id);
  const subscriptions = await db.subscription.findMany({
    where: { businessId: { in: businessIds } },
    include: { plan: true },
  });
  const subMap = new Map(subscriptions.map(s => [s.businessId, s]));

  // Get counts for each business
  const [invoiceCounts, productCounts, userCounts] = await Promise.all([
    db.invoice.groupBy({ by: ["businessId"], where: { businessId: { in: businessIds } }, _count: true }),
    db.product.groupBy({ by: ["businessId"], where: { businessId: { in: businessIds }, deletedAt: null }, _count: true }),
    db.businessMember.groupBy({ by: ["businessId"], where: { businessId: { in: businessIds } }, _count: true }),
  ]);
  const invMap = new Map(invoiceCounts.map(i => [i.businessId, i._count]));
  const prodMap = new Map(productCounts.map(p => [p.businessId, p._count]));
  const userMap = new Map(userCounts.map(u => [u.businessId, u._count]));

  return apiSuccess({
    items: businesses.map(b => {
      const sub = subMap.get(b.id);
      return {
        ...b,
        subscription: sub ? {
          status: sub.status,
          plan: sub.plan.displayName,
          planName: sub.plan.name,
          priceYearly: sub.plan.priceYearly,
          endDate: sub.endDate,
        } : null,
        invoiceCount: invMap.get(b.id) ?? 0,
        productCount: prodMap.get(b.id) ?? 0,
        userCount: userMap.get(b.id) ?? 0,
      };
    }),
  });
});
