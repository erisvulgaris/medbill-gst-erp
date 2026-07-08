import { NextRequest } from "next/server";
import { apiHandler, apiSuccess } from "@/lib/api-error";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const GET = apiHandler(async (req: NextRequest) => {
  await requireAdmin(req);
  const items = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { name: true } } },
  });
  return apiSuccess({
    items: items.map(a => ({
      id: a.id, action: a.action, entity: a.entity, entityId: a.entityId,
      summary: a.summary, metadata: a.metadata, ip: a.ip, createdAt: a.createdAt,
      userName: a.user?.name ?? "System",
    })),
  });
});
