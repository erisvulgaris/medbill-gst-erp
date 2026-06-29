import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActiveBusiness } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const biz = await getActiveBusiness();
  if (!biz) return NextResponse.json({ items: [], units: [], taxes: [], categories: [] });
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";
  const onlyLow = url.searchParams.get("low") === "1";

  const where: Record<string, unknown> = { businessId: biz.id, deletedAt: null };
  if (q) where.OR = [{ name: { contains: q } }, { barcode: { contains: q } }, { sku: { contains: q } }];
  if (onlyLow) where.stock = { lte: db.product.fields.minStock };

  const [products, units, taxes, categories] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { name: "asc" },
      include: { category: true, unit: true, tax: true },
    }),
    db.unit.findMany({ where: { businessId: biz.id } }),
    db.taxRate.findMany({ where: { businessId: biz.id, isActive: true } }),
    db.category.findMany({ where: { businessId: biz.id, deletedAt: null } }),
  ]);

  return NextResponse.json({
    items: products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      hsn: p.hsn,
      categoryId: p.categoryId,
      categoryName: p.category?.name ?? null,
      unitId: p.unitId,
      unitName: p.unit?.name ?? null,
      unitSymbol: p.unit?.symbol ?? null,
      taxId: p.taxId,
      taxRate: p.taxRate,
      purchasePrice: p.purchasePrice,
      salePrice: p.salePrice,
      mrp: p.mrp,
      wholesalePrice: p.wholesalePrice,
      minStock: p.minStock,
      reorderLevel: p.reorderLevel,
      stock: p.stock,
      openingStock: p.openingStock,
      batchTracked: p.batchTracked,
      expiryTracked: p.expiryTracked,
      serialTracked: p.serialTracked,
      isActive: p.isActive,
      image: p.image,
      isLow: p.stock <= p.minStock,
      isOut: p.stock <= 0,
      stockValue: p.stock * p.salePrice,
    })),
    units, taxes, categories,
  });
}

export async function POST(req: NextRequest) {
  const biz = await getActiveBusiness();
  if (!biz) return NextResponse.json({ error: "no business" }, { status: 404 });
  const body = await req.json();

  const product = await db.product.create({
    data: {
      businessId: biz.id,
      name: body.name,
      sku: body.sku || "SKU-" + Date.now().toString().slice(-6),
      barcode: body.barcode || null,
      hsn: body.hsn || null,
      categoryId: body.categoryId || null,
      unitId: body.unitId || null,
      taxId: body.taxId || null,
      taxRate: Number(body.taxRate) || 0,
      purchasePrice: Number(body.purchasePrice) || 0,
      salePrice: Number(body.salePrice) || 0,
      mrp: Number(body.mrp) || 0,
      wholesalePrice: Number(body.wholesalePrice) || 0,
      minStock: Number(body.minStock) || 0,
      reorderLevel: Number(body.reorderLevel) || Number(body.minStock) || 0,
      openingStock: Number(body.openingStock) || 0,
      stock: Number(body.openingStock) || 0,
      batchTracked: !!body.batchTracked,
      expiryTracked: !!body.expiryTracked,
      serialTracked: !!body.serialTracked,
      description: body.description || null,
      isActive: body.isActive !== false,
    },
  });

  // Record opening stock movement
  if (product.openingStock > 0) {
    const warehouse = await db.warehouse.findFirst({ where: { businessId: biz.id } });
    await db.stockMovement.create({
      data: {
        businessId: biz.id,
        productId: product.id,
        warehouseId: warehouse?.id ?? null,
        type: "opening",
        direction: "in",
        quantity: product.openingStock,
        note: "Opening stock",
      },
    });
  }

  return NextResponse.json({ ok: true, product });
}

export async function PATCH(req: NextRequest) {
  const biz = await getActiveBusiness();
  if (!biz) return NextResponse.json({ error: "no business" }, { status: 404 });
  const body = await req.json();
  const { id, ...rest } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const numericFields = ["taxRate", "purchasePrice", "salePrice", "mrp", "wholesalePrice", "minStock", "reorderLevel", "openingStock", "stock"];
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rest)) {
    if (numericFields.includes(k)) data[k] = v === null || v === "" ? 0 : Number(v);
    else data[k] = v;
  }

  const product = await db.product.update({ where: { id }, data });
  return NextResponse.json({ ok: true, product });
}

export async function DELETE(req: NextRequest) {
  const biz = await getActiveBusiness();
  if (!biz) return NextResponse.json({ error: "no business" }, { status: 404 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await db.product.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  return NextResponse.json({ ok: true });
}
