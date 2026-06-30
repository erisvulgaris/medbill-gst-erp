import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiHandler, apiSuccess, ApiError } from "@/lib/api-error";
import { getBusinessContext, requireRoleOrDemo } from "@/lib/business-context";
import { updateBusinessSchema } from "@/lib/schemas";

export const GET = apiHandler(async (req: NextRequest) => {
  const ctx = await getBusinessContext(req);
  const biz = await db.business.findUnique({ where: { id: ctx.businessId } });
  if (!biz) return apiSuccess({ business: null });
  const modules = (() => { try { return JSON.parse(biz.modules || "{}"); } catch { return {}; } })();
  return apiSuccess({ business: { ...biz, modules } });
});

export const PATCH = apiHandler(async (req: NextRequest) => {
  const ctx = await requireRoleOrDemo(req, ["owner", "partner"]);
  const parsed = updateBusinessSchema.safeParse(await req.json());
  if (!parsed.success) throw ApiError.validation("Invalid business data", parsed.error.issues);
  const body = parsed.data;

  const allowed: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (k === "modules") allowed.modules = JSON.stringify(v);
    else allowed[k] = v;
  }

  const updated = await db.business.update({ where: { id: ctx.businessId }, data: allowed });
  return apiSuccess({ business: { ...updated, modules: body.modules ?? JSON.parse(updated.modules || "{}") } });
});
