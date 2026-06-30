import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiHandler, apiSuccess, ApiError } from "@/lib/api-error";
import { getBusinessContext, requireRoleOrDemo } from "@/lib/business-context";
import { createProductSchema, listQuerySchema } from "@/lib/schemas";
import { recordAudit } from "@/lib/audit";

/**
 * GET /api/products — list products with units, taxes, categories
 * Auth: any authenticated user (demo fallback in dev)
 */
export const GET = apiHandler(async (req: NextRequest) => {
  const ctx = await getBusinessContext(req);

  const url = new URL(req.url);
  const parsed = listQuerySchema.safeParse({
    q: url.searchParams.get("q") || undefined,
    limit: url.searchParams.get("limit") || undefined,
  });
  if (!parsed.success) {
    throw ApiError.validation("Invalid query parameters", parsed.error.issues);
  }
  const { q } = parsed.data;
  const onlyLow = url.searchParams.get("low") === "1";

  const where: Record<string, unknown> = { businessId: ctx.businessId, deletedAt: null };
  if (q) where.OR = [{ name: { contains: q } }, { barcode: { contains: q } }, { sku: { contains: q } }];

  // SQLite cannot compare two columns (stock <= minStock). Filter in JS.
  const [products, units, taxes, categories] = await Promise.all([
    db.product.findMany({ where, orderBy: { name: "asc" }, include: { category: true, unit: true, tax: true } }),
    db.unit.findMany({ where: { businessId: ctx.businessId } }),
    db.taxRate.findMany({ where: { businessId: ctx.businessId, isActive: true } }),
    db.category.findMany({ where: { businessId: ctx.businessId, deletedAt: null } }),
  ]);

  const filteredProducts = onlyLow ? products.filter((p) => p.stock <= p.minStock) : products;

  return apiSuccess({
    items: filteredProducts.map((p) => ({
      id: p.id, name: p.name, sku: p.sku, barcode: p.barcode, hsn: p.hsn,
      categoryId: p.categoryId, categoryName: p.category?.name ?? null,
      unitId: p.unitId, unitName: p.unit?.name ?? null, unitSymbol: p.unit?.symbol ?? null,
      taxId: p.taxId, taxRate: p.taxRate,
      purchasePrice: p.purchasePrice, salePrice: p.salePrice, mrp: p.mrp, wholesalePrice: p.wholesalePrice,
      minStock: p.minStock, reorderLevel: p.reorderLevel, stock: p.stock, openingStock: p.openingStock,
      batchTracked: p.batchTracked, expiryTracked: p.expiryTracked, serialTracked: p.serialTracked,
      isActive: p.isActive, image: p.image,
      isLow: p.stock <= p.minStock, isOut: p.stock <= 0, stockValue: p.stock * p.salePrice,
    })),
    units, taxes, categories,
  });
});

/**
 * POST /api/products — create a product
 * Auth: owner, partner, manager
 */
export const POST = apiHandler(async (req: NextRequest) => {
  const ctx = await requireRoleOrDemo(req, ["owner", "partner", "manager"]);

  const parsed = createProductSchema.safeParse(await req.json());
  if (!parsed.success) {
    throw ApiError.validation("Invalid product data", parsed.error.issues);
  }
  const body = parsed.data;

  const product = await db.product.create({
    data: {
      businessId: ctx.businessId,
      name: body.name,
      sku: body.sku || "SKU-" + Date.now().toString().slice(-6),
      barcode: body.barcode || null,
      hsn: body.hsn || null,
      categoryId: body.categoryId || null,
      unitId: body.unitId || null,
      taxId: body.taxId || null,
      taxRate: body.taxRate,
      purchasePrice: body.purchasePrice,
      salePrice: body.salePrice,
      mrp: body.mrp,
      wholesalePrice: body.wholesalePrice,
      minStock: body.minStock,
      reorderLevel: body.reorderLevel || body.minStock,
      openingStock: body.openingStock,
      stock: body.openingStock,
      batchTracked: body.batchTracked,
      expiryTracked: body.expiryTracked,
      serialTracked: body.serialTracked,
      description: body.description || null,
      isActive: body.isActive,
    },
  });

  if (product.openingStock > 0) {
    const warehouse = await db.warehouse.findFirst({ where: { businessId: ctx.businessId } });
    await db.stockMovement.create({
      data: {
        businessId: ctx.businessId, productId: product.id, warehouseId: warehouse?.id ?? null,
        type: "opening", direction: "in", quantity: product.openingStock, note: "Opening stock",
      },
    });
  }

  await recordAudit({
    businessId: ctx.businessId, userId: ctx.userId, action: "create", entity: "product", entityId: product.id,
    summary: `Created product ${product.name}`, metadata: { name: product.name, sku: product.sku },
  });

  return apiSuccess({ product }, undefined, 201);
});

/**
 * PATCH /api/products — update a product
 * Auth: owner, partner, manager, store_keeper
 */
export const PATCH = apiHandler(async (req: NextRequest) => {
  const ctx = await requireRoleOrDemo(req, ["owner", "partner", "manager", "store_keeper"]);

  const body = await req.json();
  const { id, ...rest } = body;
  if (!id) throw ApiError.badRequest("Product ID required");

  const numericFields = ["taxRate", "purchasePrice", "salePrice", "mrp", "wholesalePrice", "minStock", "reorderLevel", "openingStock", "stock"];
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rest)) {
    if (numericFields.includes(k)) data[k] = v === null || v === "" ? 0 : Number(v);
    else data[k] = v;
  }

  const product = await db.product.update({ where: { id }, data });

  await recordAudit({
    businessId: ctx.businessId, userId: ctx.userId, action: "update", entity: "product", entityId: id,
    summary: `Updated product ${product.name}`,
  });

  return apiSuccess({ product });
});

/**
 * DELETE /api/products?id= — soft delete a product
 * Auth: owner, partner
 */
export const DELETE = apiHandler(async (req: NextRequest) => {
  const ctx = await requireRoleOrDemo(req, ["owner", "partner"]);

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) throw ApiError.badRequest("Product ID required");

  await db.product.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });

  await recordAudit({
    businessId: ctx.businessId, userId: ctx.userId, action: "delete", entity: "product", entityId: id,
    summary: `Deleted product ${id}`,
  });

  return apiSuccess({ deleted: true });
});
