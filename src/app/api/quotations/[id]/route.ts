import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiHandler, apiSuccess, ApiError } from "@/lib/api-error";
import { getBusinessContext, requireRoleOrDemo } from "@/lib/business-context";
import { recordAudit } from "@/lib/audit";

export const GET = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const ctx = await getBusinessContext(req);
  
  const qt = await db.quotation.findFirst({
    where: { id, businessId: ctx.businessId },
    include: { items: true, party: true },
  });
  if (!qt) return NextResponse.json({ error: "not found" }, { status: 404 });
  return apiSuccess({
    quotation: {
      ...qt,
      business: {
        name: biz.name, legalName: biz.legalName, gstin: biz.gstin, pan: biz.pan,
        addressLine1: biz.addressLine1, city: biz.city, state: biz.state,
        stateCode: ctx.stateCode, pincode: biz.pincode, phone: biz.phone, email: biz.email,
      },
    },
  });
});

/** Update status (sent/accepted/rejected/expired) or convert to invoice. */
export const PATCH = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const ctx = await getBusinessContext(req);
  
  const body = await req.json();

  // Convert to invoice
  if (body.convertToInvoice) {
    const qt = await db.quotation.findFirst({ where: { id, businessId: ctx.businessId }, include: { items: true } });
    if (!qt) return NextResponse.json({ error: "not found" }, { status: 404 });

    const seq = biz.invoiceSeq;
    const number = `${biz.invoicePrefix}-${String(seq).padStart(4, "0")}`;

    const inv = await db.invoice.create({
      data: {
        businessId: ctx.businessId,
        number,
        seq,
        type: "tax_invoice",
        status: "unpaid",
        partyId: qt.partyId,
        partyName: qt.partyName,
        partyGstin: qt.partyGstin,
        partyStateCode: qt.partyStateCode,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 86400000),
        supplyType: "intra",
        subtotal: qt.subtotal,
        taxableValue: qt.taxableValue,
        cgstTotal: qt.cgstTotal,
        sgstTotal: qt.sgstTotal,
        igstTotal: qt.igstTotal,
        roundOff: qt.roundOff,
        grandTotal: qt.grandTotal,
        paidAmount: 0,
        balance: qt.grandTotal,
        notes: qt.notes,
        terms: qt.terms,
      },
    });

    await db.invoiceItem.createMany({
      data: qt.items.map((it) => ({
        invoiceId: inv.id,
        productId: it.productId ?? null,
        name: it.name,
        hsn: it.hsn,
        quantity: it.quantity,
        unit: it.unit,
        price: it.price,
        discountPct: it.discountPct,
        discountAmt: it.discountAmt,
        taxRate: it.taxRate,
        taxable: it.taxable,
        cgst: it.cgst,
        sgst: it.sgst,
        igst: it.igst,
        total: it.total,
      })),
    });

    // Decrement stock for converted items
    const warehouse = await db.warehouse.findFirst({ where: { businessId: ctx.businessId } });
    for (const it of qt.items) {
      if (it.productId) {
        await db.product.update({ where: { id: it.productId }, data: { stock: { decrement: it.quantity } } });
        if (warehouse) {
          await db.stockMovement.create({
            data: {
              businessId: ctx.businessId, productId: it.productId, warehouseId: warehouse.id,
              type: "sale", direction: "out", quantity: it.quantity,
              refType: "invoice", refId: inv.id,
            },
          });
        }
      }
    }

    await db.business.update({ where: { id: ctx.businessId }, data: { invoiceSeq: seq + 1 } });
    await db.quotation.update({ where: { id }, data: { status: "converted" } });

    await recordAudit({
      businessId: ctx.businessId,
      action: "create",
      entity: "invoice",
      entityId: inv.id,
      summary: `Converted quotation ${qt.number} to invoice ${number}`,
      metadata: { quotationId: qt.id, invoiceId: inv.id, number, grandTotal: qt.grandTotal },
    });

    return apiSuccess({ invoice: { id: inv.id, number: inv.number } });
  }

  // Status update
  if (body.status) {
    await db.quotation.update({ where: { id }, data: { status: body.status } });
    await recordAudit({
      businessId: ctx.businessId,
      action: "update",
      entity: "quotation",
      entityId: id,
      summary: `Quotation status changed to ${body.status}`,
    });
    return apiSuccess({ ok: true });
  }

  return apiSuccess({ ok: true });
});

