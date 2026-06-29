import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActiveBusiness } from "@/lib/auth";

export async function GET() {
  const biz = await getActiveBusiness();
  if (!biz) return NextResponse.json({ items: [] });
  const items = await db.notification.findMany({
    where: { businessId: biz.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return NextResponse.json({ items });
}

export async function PATCH(req: NextRequest) {
  const biz = await getActiveBusiness();
  if (!biz) return NextResponse.json({ error: "no business" }, { status: 404 });
  const body = await req.json();
  if (body.markAllRead) {
    await db.notification.updateMany({ where: { businessId: biz.id, read: false }, data: { read: true } });
    return NextResponse.json({ ok: true });
  }
  if (body.id) {
    await db.notification.update({ where: { id: body.id }, data: { read: !!body.read } });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: true });
}
