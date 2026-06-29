import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActiveBusiness } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const biz = await getActiveBusiness();
  if (!biz) return NextResponse.json({ items: [] });
  const url = new URL(req.url);
  const entity = url.searchParams.get("entity") || "";
  const action = url.searchParams.get("action") || "";
  const limit = Number(url.searchParams.get("limit") || 100);

  const where: Record<string, unknown> = { businessId: biz.id };
  if (entity) where.entity = entity;
  if (action) where.action = action;

  const items = await db.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { name: true } } },
  });

  return NextResponse.json({
    items: items.map((a) => ({
      id: a.id,
      action: a.action,
      entity: a.entity,
      entityId: a.entityId,
      summary: a.summary,
      metadata: a.metadata,
      ip: a.ip,
      createdAt: a.createdAt,
      userName: a.user?.name ?? "System",
    })),
  });
}
