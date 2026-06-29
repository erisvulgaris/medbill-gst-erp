import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActiveBusiness } from "@/lib/auth";
import { stateCodeFromGstin } from "@/lib/gst";

export async function GET(req: NextRequest) {
  const biz = await getActiveBusiness();
  if (!biz) return NextResponse.json({ items: [] });
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "";
  const q = url.searchParams.get("q") || "";

  const where: Record<string, unknown> = { businessId: biz.id, deletedAt: null };
  if (type) where.type = type;
  if (q) where.OR = [{ name: { contains: q } }, { phone: { contains: q } }, { gstin: { contains: q } }];

  const parties = await db.party.findMany({
    where,
    orderBy: { name: "asc" },
  });

  // Compute live outstanding per party
  const partyIds = parties.map((p) => p.id);
  const invoices = await db.invoice.findMany({
    where: { businessId: biz.id, partyId: { in: partyIds }, status: { in: ["unpaid", "partial", "overdue"] } },
    select: { partyId: true, balance: true },
  });
  const outstandingMap = new Map<string, number>();
  for (const i of invoices) {
    outstandingMap.set(i.partyId!, (outstandingMap.get(i.partyId!) ?? 0) + i.balance);
  }

  return NextResponse.json({
    items: parties.map((p) => ({
      ...p,
      outstanding: (outstandingMap.get(p.id) ?? 0) + p.openingBalance,
    })),
  });
}

export async function POST(req: NextRequest) {
  const biz = await getActiveBusiness();
  if (!biz) return NextResponse.json({ error: "no business" }, { status: 404 });
  const body = await req.json();
  const stateCode = body.stateCode || stateCodeFromGstin(body.gstin) || null;

  const party = await db.party.create({
    data: {
      businessId: biz.id,
      type: body.type || "customer",
      name: body.name,
      companyName: body.companyName || body.name,
      gstin: body.gstin || null,
      pan: body.pan || null,
      phone: body.phone || null,
      email: body.email || null,
      whatsapp: body.whatsapp || body.phone || null,
      addressLine1: body.addressLine1 || null,
      addressLine2: body.addressLine2 || null,
      city: body.city || null,
      state: body.state || null,
      stateCode,
      pincode: body.pincode || null,
      openingBalance: Number(body.openingBalance) || 0,
      creditLimit: Number(body.creditLimit) || 0,
      creditDays: Number(body.creditDays) || 0,
      tags: body.tags || null,
    },
  });
  return NextResponse.json({ ok: true, party });
}

export async function PATCH(req: NextRequest) {
  const biz = await getActiveBusiness();
  if (!biz) return NextResponse.json({ error: "no business" }, { status: 404 });
  const body = await req.json();
  const { id, ...rest } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const stateCode = rest.stateCode || stateCodeFromGstin(rest.gstin) || null;
  const party = await db.party.update({
    where: { id },
    data: { ...rest, stateCode, openingBalance: rest.openingBalance !== undefined ? Number(rest.openingBalance) : undefined, creditLimit: rest.creditLimit !== undefined ? Number(rest.creditLimit) : undefined, creditDays: rest.creditDays !== undefined ? Number(rest.creditDays) : undefined },
  });
  return NextResponse.json({ ok: true, party });
}
