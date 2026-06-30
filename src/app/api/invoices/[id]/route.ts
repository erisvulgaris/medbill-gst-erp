import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiHandler, apiSuccess, ApiError } from "@/lib/api-error";
import { getBusinessContext, requireRoleOrDemo } from "@/lib/business-context";
import { recordAudit } from "@/lib/audit";

export const GET = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await getBusinessContext(req);
  const { id } = await params;

  const inv = await db.invoice.findFirst({ where: { id, businessId: ctx.businessId }, include: { items: true, party: true, payments: true } });
  if (!inv) throw ApiError.notFound("Invoice not found");

  const biz = await db.business.findUnique({ where: { id: ctx.businessId } });

  return apiSuccess({
    invoice: {
      ...inv,
      business: {
        name: biz?.name, legalName: biz?.legalName, gstin: biz?.gstin, pan: biz?.pan,
        addressLine1: biz?.addressLine1, city: biz?.city, state: biz?.state,
        stateCode: biz?.stateCode, pincode: biz?.pincode, phone: biz?.phone, email: biz?.email,
      },
    },
  });
});

export const DELETE = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireRoleOrDemo(req, ["owner", "partner", "manager"]);
  const { id } = await params;

  const inv = await db.invoice.findFirst({ where: { id, businessId: ctx.businessId }, include: { items: true } });
  if (!inv) throw ApiError.notFound("Invoice not found");

  for (const it of inv.items) {
    if (it.productId) {
      await db.product.update({ where: { id: it.productId }, data: { stock: { increment: it.quantity } } });
      await db.stockMovement.create({
        data: {
          businessId: ctx.businessId, productId: it.productId,
          type: "return", direction: "in", quantity: it.quantity,
          refType: "invoice", refId: inv.id, note: "Invoice cancelled",
        },
      });
    }
  }
  await db.invoice.update({ where: { id }, data: { status: "cancelled", deletedAt: new Date() } });
  await db.payment.deleteMany({ where: { invoiceId: id } });

  await recordAudit({ businessId: ctx.businessId, userId: ctx.userId, action: "cancel", entity: "invoice", entityId: id, summary: `Cancelled invoice ${inv.number}` });

  return apiSuccess({ cancelled: true });
});
