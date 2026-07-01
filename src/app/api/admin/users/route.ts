import { NextRequest } from "next/server";
import { apiHandler, apiSuccess } from "@/lib/api-error";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const GET = apiHandler(async (req: NextRequest) => {
  await requireAdmin(req);

  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";

  const where: Record<string, unknown> = { deletedAt: null, authProvider: { not: "super_admin" } };
  if (q) where.OR = [{ name: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } }];

  const users = await db.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, name: true, email: true, phone: true, authProvider: true, status: true, createdAt: true },
  });

  // Get business memberships for each user
  const userIds = users.map(u => u.id);
  const memberships = await db.businessMember.findMany({
    where: { userId: { in: userIds } },
    include: { business: { select: { id: true, name: true } } },
  });
  const memberMap = new Map<string, any[]>();
  for (const m of memberships) {
    if (!memberMap.has(m.userId)) memberMap.set(m.userId, []);
    memberMap.get(m.userId)!.push({ businessId: m.business.id, businessName: m.business.name, role: m.role });
  }

  return apiSuccess({
    items: users.map(u => ({
      ...u,
      businesses: memberMap.get(u.id) ?? [],
    })),
  });
});
