import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActiveBusiness } from "@/lib/auth";

export async function GET() {
  const biz = await getActiveBusiness();
  if (!biz) return NextResponse.json({ business: null });
  const modules = (() => {
    try { return JSON.parse(biz.modules || "{}"); } catch { return {}; }
  })();
  return NextResponse.json({ business: { ...biz, modules } });
}

/** Update business profile / onboarding config. */
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const biz = await getActiveBusiness();
  if (!biz) return NextResponse.json({ error: "No business" }, { status: 404 });

  const allowed: Record<string, unknown> = {};
  const fields = [
    "name", "legalName", "gstin", "pan", "industry", "businessType",
    "email", "phone", "addressLine1", "addressLine2", "city", "state",
    "stateCode", "pincode", "logoUrl", "invoicePrefix", "quotationPrefix",
    "inventoryMode", "storeMode", "employeeCount",
  ];
  for (const f of fields) {
    if (body[f] !== undefined) allowed[f] = body[f];
  }
  if (body.modules) allowed.modules = JSON.stringify(body.modules);

  const updated = await db.business.update({
    where: { id: biz.id },
    data: allowed,
  });
  return NextResponse.json({ ok: true, business: { ...updated, modules: body.modules ?? JSON.parse(updated.modules || "{}") } });
}
