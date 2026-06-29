import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActiveBusiness } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const biz = await getActiveBusiness();
  if (!biz) return NextResponse.json({ error: "no business" }, { status: 404 });

  const inv = await db.invoice.findFirst({
    where: { id, businessId: biz.id },
    include: { items: true, party: true, payments: true },
  });
  if (!inv) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({
    invoice: {
      ...inv,
      business: {
        name: biz.name,
        legalName: biz.legalName,
        gstin: biz.gstin,
        pan: biz.pan,
        addressLine1: biz.addressLine1,
        city: biz.city,
        state: biz.state,
        stateCode: biz.stateCode,
        pincode: biz.pincode,
        phone: biz.phone,
        email: biz.email,
      },
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const biz = await getActiveBusiness();
  if (!biz) return NextResponse.json({ error: "no business" }, { status: 404 });

  const inv = await db.invoice.findFirst({ where: { id, businessId: biz.id }, include: { items: true } });
  if (!inv) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Restore stock
  for (const it of inv.items) {
    if (it.productId) {
      await db.product.update({ where: { id: it.productId }, data: { stock: { increment: it.quantity } } });
      await db.stockMovement.create({
        data: {
          businessId: biz.id, productId: it.productId,
          type: "return", direction: "in", quantity: it.quantity,
          refType: "invoice", refId: inv.id, note: "Invoice cancelled",
        },
      });
    }
  }
  await db.invoice.update({ where: { id }, data: { status: "cancelled", deletedAt: new Date() } });
  await db.payment.deleteMany({ where: { invoiceId: id } });
  return NextResponse.json({ ok: true });
}
