import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiHandler, apiSuccess } from "@/lib/api-error";
import { getBusinessContext } from "@/lib/business-context";

export const GET = apiHandler(async (req: NextRequest) => {
  const ctx = await getBusinessContext(req);
  const url = new URL(req.url);
  const entity = url.searchParams.get("entity") || "";
  const action = url.searchParams.get("action") || "";
  const limit = Number(url.searchParams.get("limit") || 100);

  const where: Record<string, unknown> = { businessId: ctx.businessId };
  if (entity) where.entity = entity;
  if (action) where.action = action;

  const items = await db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: limit, include: { user: { select: { name: true } } } });

  return apiSuccess({
    items: items.map((a) => ({
      id: a.id, action: a.action, entity: a.entity, entityId: a.entityId,
      summary: a.summary, metadata: a.metadata, ip: a.ip, createdAt: a.createdAt,
      userName: a.user?.name ?? "System",
    })),
  });
});
