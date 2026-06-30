import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiHandler, apiSuccess } from "@/lib/api-error";
import { getBusinessContext } from "@/lib/business-context";

export const GET = apiHandler(async (req: NextRequest) => {
  const ctx = await getBusinessContext(req);
  const items = await db.notification.findMany({ where: { businessId: ctx.businessId }, orderBy: { createdAt: "desc" }, take: 30 });
  return apiSuccess({ items });
});

export const PATCH = apiHandler(async (req: NextRequest) => {
  const ctx = await getBusinessContext(req);
  const body = await req.json();
  if (body.markAllRead) {
    await db.notification.updateMany({ where: { businessId: ctx.businessId, read: false }, data: { read: true } });
    return apiSuccess({ updated: true });
  }
  if (body.id) {
    await db.notification.update({ where: { id: body.id }, data: { read: !!body.read } });
    return apiSuccess({ updated: true });
  }
  return apiSuccess({ updated: false });
});
