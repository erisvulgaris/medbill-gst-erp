import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiHandler, apiSuccess, ApiError } from "@/lib/api-error";
import { getBusinessContext, requireRoleOrDemo } from "@/lib/business-context";
import { createPartySchema, listQuerySchema } from "@/lib/schemas";
import { recordAudit } from "@/lib/audit";
import { stateCodeFromGstin } from "@/lib/gst";

export const GET = apiHandler(async (req: NextRequest) => {
  const ctx = await getBusinessContext(req);
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "";
  const q = url.searchParams.get("q") || "";

  const where: Record<string, unknown> = { businessId: ctx.businessId, deletedAt: null };
  if (type) where.type = type;
  if (q) where.OR = [{ name: { contains: q } }, { phone: { contains: q } }, { gstin: { contains: q } }];

  const parties = await db.party.findMany({ where, orderBy: { name: "asc" } });

  const partyIds = parties.map((p) => p.id);
  const invoices = await db.invoice.findMany({
    where: { businessId: ctx.businessId, partyId: { in: partyIds }, status: { in: ["unpaid", "partial", "overdue"] } },
    select: { partyId: true, balance: true },
  });
  const outstandingMap = new Map<string, number>();
  for (const i of invoices) outstandingMap.set(i.partyId!, (outstandingMap.get(i.partyId!) ?? 0) + i.balance);

  return apiSuccess({
    items: parties.map((p) => ({ ...p, outstanding: (outstandingMap.get(p.id) ?? 0) + p.openingBalance })),
  });
});

export const POST = apiHandler(async (req: NextRequest) => {
  const ctx = await requireRoleOrDemo(req, ["owner", "partner", "manager", "sales", "purchase"]);
  const parsed = createPartySchema.safeParse(await req.json());
  if (!parsed.success) throw ApiError.validation("Invalid party data", parsed.error.issues);
  const body = parsed.data;
  const stateCode = body.stateCode || stateCodeFromGstin(body.gstin) || null;

  const party = await db.party.create({
    data: {
      businessId: ctx.businessId,
      type: body.type, name: body.name, companyName: body.companyName || body.name,
      gstin: body.gstin || null, pan: body.pan || null, phone: body.phone || null, email: body.email || null,
      whatsapp: body.whatsapp || body.phone || null, addressLine1: body.addressLine1 || null,
      addressLine2: body.addressLine2 || null, city: body.city || null, state: body.state || null,
      stateCode, pincode: body.pincode || null, openingBalance: body.openingBalance,
      creditLimit: body.creditLimit, creditDays: body.creditDays, tags: body.tags || null,
    },
  });

  await recordAudit({ businessId: ctx.businessId, userId: ctx.userId, action: "create", entity: "party", entityId: party.id, summary: `Created party ${party.name}` });
  return apiSuccess({ party }, undefined, 201);
});

export const PATCH = apiHandler(async (req: NextRequest) => {
  const ctx = await requireRoleOrDemo(req, ["owner", "partner", "manager", "sales", "purchase"]);
  const body = await req.json();
  const { id, ...rest } = body;
  if (!id) throw ApiError.badRequest("Party ID required");
  const stateCode = rest.stateCode || stateCodeFromGstin(rest.gstin) || null;
  const party = await db.party.update({
    where: { id },
    data: { ...rest, stateCode, openingBalance: rest.openingBalance !== undefined ? Number(rest.openingBalance) : undefined, creditLimit: rest.creditLimit !== undefined ? Number(rest.creditLimit) : undefined, creditDays: rest.creditDays !== undefined ? Number(rest.creditDays) : undefined },
  });
  await recordAudit({ businessId: ctx.businessId, userId: ctx.userId, action: "update", entity: "party", entityId: id, summary: `Updated party ${party.name}` });
  return apiSuccess({ party });
});
