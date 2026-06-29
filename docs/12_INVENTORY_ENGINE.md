# 12 — Inventory Engine Specification

> **Status:** Source of truth for inventory logic
> **Implementation:** `src/app/api/products/route.ts`, `src/app/api/purchases/route.ts`, `src/app/api/invoices/route.ts`, `StockMovement` model
> **Related:** `03_DATABASE_SPECIFICATION.md`, `10_BUSINESS_RULES.md`

## 1. Overview

The Inventory Engine manages product stock levels, movements, and alerts. It is built on an **immutable ledger pattern** — every stock change is recorded as a `StockMovement` row, and `Product.stock` is the derived current balance.

## 2. Data Model

### 2.1 Product
```prisma
model Product {
  stock         Float    @default(0)   // Current available quantity
  openingStock  Float    @default(0)   // Initial stock at creation
  minStock      Float    @default(0)   // Low-stock threshold
  reorderLevel  Float    @default(0)   // Suggested reorder point
  batchTracked  Boolean  @default(false)
  expiryTracked Boolean  @default(false)
  serialTracked Boolean  @default(false)
}
```

### 2.2 StockMovement (Immutable Ledger)
```prisma
model StockMovement {
  type        String   // purchase | sale | transfer | adjustment | opening | return
  direction   String   // in | out
  quantity    Float
  productId   String
  warehouseId String?
  refType     String?  // invoice | purchase | manual
  refId       String?
  note        String?
  createdAt   DateTime @default(now())
}
```

**Rules:**
- **Append-only** — never updated or deleted
- One row per stock change
- `direction` determines sign: `in` = +, `out` = -
- `Product.stock` = `sum(movements where direction=in) - sum(movements where direction=out)`

## 3. Movement Types

| Type | Direction | Trigger | Stock Impact |
|------|-----------|---------|--------------|
| `opening` | in | Product created with opening stock | +openingStock |
| `purchase` | in | Purchase created/received | +quantity |
| `sale` | out | Tax invoice created | -quantity |
| `return` | in | Invoice cancelled / sales return | +quantity |
| `transfer` | in/out | Stock transfer between warehouses | ±quantity |
| `adjustment` | in/out | Manual stock adjustment | ±quantity |

## 4. Stock Update Flows

### 4.1 Product Creation
```ts
// 1. Create product with openingStock
const product = await db.product.create({ data: { ..., stock: openingStock, openingStock } });

// 2. Record opening movement
if (openingStock > 0) {
  await db.stockMovement.create({
    data: { businessId, productId, warehouseId, type: "opening", direction: "in", quantity: openingStock, note: "Opening stock" }
  });
}
```

### 4.2 Invoice Creation (Sale)
```ts
// For each line item with a productId:
await db.product.update({ where: { id }, data: { stock: { decrement: quantity } } });
await db.stockMovement.create({ data: { ..., type: "sale", direction: "out", quantity, refType: "invoice", refId: inv.id } });
```

### 4.3 Invoice Cancellation (Return)
```ts
// For each line item:
await db.product.update({ where: { id }, data: { stock: { increment: quantity } } });
await db.stockMovement.create({ data: { ..., type: "return", direction: "in", quantity, refType: "invoice", refId: inv.id, note: "Invoice cancelled" } });
```

### 4.4 Purchase Creation (Goods In)
```ts
await db.product.update({ where: { id }, data: { stock: { increment: quantity } } });
await db.stockMovement.create({ data: { ..., type: "purchase", direction: "in", quantity, refType: "purchase", refId: pur.id } });
```

### 4.5 Stock Adjustment (Manual)
```ts
const newStock = mode === "in" ? currentStock + qty : Math.max(0, currentStock - qty);
await db.product.update({ where: { id }, data: { stock: newStock } });
await db.stockMovement.create({ data: { ..., type: "adjustment", direction: mode, quantity: qty, note } });
```

## 5. Low Stock & Out of Stock

### 5.1 Definitions
- `isLow` = `stock <= minStock` (and `stock > 0`)
- `isOut` = `stock <= 0`

### 5.2 Alerts
- Dashboard shows low-stock products (top 5)
- Notification created when stock crosses threshold (planned)
- Inventory view shows low/out badges

### 5.3 SQLite Limitation
SQLite cannot compare two columns in WHERE (`stock <= minStock`). The `?low=1` filter is applied in JS:
```ts
const filteredProducts = onlyLow
  ? products.filter((p) => p.stock <= p.minStock)
  : products;
```

## 6. Inventory Valuation

### 6.1 Cost Value
```
costValue = stock × purchasePrice
```

### 6.2 Sale Value
```
saleValue = stock × salePrice
```

### 6.3 Potential Profit
```
potentialProfit = saleValue - costValue
```

### 6.4 Report
`GET /api/reports?report=inventory_valuation` returns per-product and totals.

## 7. Batch / Expiry / Serial Tracking

### 7.1 Schema Support
The `Product` model has boolean flags:
- `batchTracked` — track by batch number
- `expiryTracked` — track expiry dates (FIFO)
- `serialTracked` — track individual serial numbers

### 7.2 Current Status
- **Schema:** ✅ Fields exist
- **UI:** Toggle in product form ✅
- **Logic:** ❌ Not implemented (Phase 5)

### 7.3 Phase 5 Plan
Add `Batch` and `Serial` models:
```prisma
model Batch {
  id          String   @id @default(cuid())
  productId   String
  batchNumber String
  quantity    Float
  expiryDate  DateTime?
  createdAt   DateTime @default(now())
}

model Serial {
  id          String   @id @default(cuid())
  productId   String
  serialNumber String   @unique
  status      String   @default("in_stock") // in_stock | sold | returned
}
```

## 8. Warehouses

### 8.1 Current
- One warehouse per business (created in seed)
- `StockMovement.warehouseId` records where stock moved
- No multi-warehouse UI yet

### 8.2 Phase 5: Multi-Warehouse
- Stock transfer between warehouses
- Per-warehouse stock levels
- Transfer orders

## 9. Reorder Management (Phase 5)

### 9.1 Reorder Level
`Product.reorderLevel` — when stock falls below this, suggest a reorder.

### 9.2 Reorder Suggestion
```
suggestedQty = reorderLevel × 2 - currentStock
// (order enough to reach 2× reorder level)
```

### 9.3 Purchase Order
Planned: generate a draft purchase order from reorder suggestions.

## 10. Stock Movement History (Phase 5)

A product detail view showing the full movement history:
```
Date       | Type      | Direction | Qty  | Ref      | Balance
-----------|-----------|-----------|------|----------|--------
01 Jun     | Opening   | In        | 100  | —        | 100
05 Jun     | Purchase  | In        | 50   | PUR-0001 | 150
10 Jun     | Sale      | Out       | 20   | INV-0003 | 130
15 Jun     | Adjustment| Out       | 5    | Manual   | 125
```

## 11. Testing Requirements

### 11.1 Unit Tests (planned)
- Stock calculation: opening + purchases - sales = current
- Low-stock detection
- Inventory valuation

### 11.2 Integration Tests (planned)
- Create product → verify opening movement
- Create invoice → verify stock decremented + movement recorded
- Cancel invoice → verify stock restored + return movement
- Create purchase → verify stock incremented + movement recorded

## 12. Known Limitations

1. **No multi-warehouse** — single warehouse per business (Phase 5)
2. **No batch/expiry/serial UI** — schema only (Phase 5)
3. **No stock transfer** — planned (Phase 5)
4. **No reorder automation** — planned (Phase 5)
5. **Float precision** — stock stored as Float (P0: migrate to Decimal, see `DATABASE_AUDIT.md`)
6. **No stock movement history UI** — planned (Phase 5)
