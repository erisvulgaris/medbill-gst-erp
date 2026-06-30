import { NextRequest } from "next/server";
import { apiHandler, apiSuccess } from "@/lib/api-error";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
export const GET = apiHandler(async (req: NextRequest) => {
  const ctx = await requireAuth(req);
  const memberships = await db.businessMember.findMany({ where: { userId: ctx.user.id, status: "active" }, include: { business: { select: { id: true, name: true, industry: true, gstin: true } } }, orderBy: { createdAt: "asc" } });
  return apiSuccess({ user: ctx.user, role: ctx.role, activeBusiness: ctx.business, businesses: memberships.map((m) => ({ id: m.business.id, name: m.business.name, industry: m.business.industry, gstin: m.business.gstin, role: m.role, isActive: m.businessId === ctx.business.id })) });
});
