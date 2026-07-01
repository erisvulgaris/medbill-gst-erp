import { NextRequest } from "next/server";
import { apiHandler, apiSuccess } from "@/lib/api-error";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const GET = apiHandler(async (req: NextRequest) => {
  await requireAdmin(req);

  const plans = await db.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { priceYearly: "asc" },
  });

  return apiSuccess({
    items: plans.map(p => ({
      id: p.id,
      name: p.name,
      displayName: p.displayName,
      priceYearly: p.priceYearly,
      priceMonthly: p.priceMonthly,
      maxUsers: p.maxUsers,
      maxProducts: p.maxProducts,
      maxBranches: p.maxBranches,
      maxInvoices: p.maxInvoices,
      features: JSON.parse(p.features),
    })),
  });
});
