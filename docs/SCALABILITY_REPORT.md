# Scalability Report

> **Audit date:** 2026-06-30
> **Method:** Real seed simulation (1000 invoices) + extrapolation to 100k
> **Principle:** Measured at small scale, extrapolated with explicit assumptions

## Executive Summary

MedBill's SQLite + Prisma stack handles MSME scale with excellent performance. At 1000 invoices, all queries are sub-10ms. Extrapolated to 100,000 invoices, queries remain under 100ms — well within acceptable range.

| Scale | Write Rate | List Query | Aggregate | Count | DB Size |
|-------|-----------|------------|-----------|-------|---------|
| 1,018 invoices (measured) | 8,850/s | 5ms | 2ms | 1ms | 828 KB |
| 10,000 (extrapolated) | ~7,000/s | ~15ms | ~5ms | ~3ms | ~8 MB |
| 100,000 (extrapolated) | ~5,000/s | ~50ms | ~20ms | ~10ms | ~80 MB |
| 1,000,000 (extrapolated) | ~3,000/s | ~200ms | ~80ms | ~40ms | ~800 MB |

**Conclusion:** SQLite is viable up to ~500k invoices. Beyond that, migrate to PostgreSQL (ADR-003).

---

## 1. Simulation Setup

**Environment:**
- SQLite database: `db/custom.db`
- Prisma Client: 6.19.2
- Runtime: Bun 1.3.14 on Linux x64
- Demo data: 1 business, 7 parties, 15 products (pre-existing)

**Simulation script:** 1000 invoices created in batches of 100, each with:
- Random date within last 365 days
- Fixed amount: ₹1,180 (₹1,000 + 18% GST)
- Status: paid
- Linked to first party

---

## 2. Measured Results (1,018 Invoices)

### 2.1 Write Performance
```
1000 invoices in 113ms (8,850 inv/s)
```
**Method:** `db.invoice.createMany({ data: [...100 invoices] })` × 10 batches

**Analysis:**
- 8,850 inserts/second is excellent
- A business creating 100 invoices/day takes 100 days to reach 10k
- Bulk insert (`createMany`) is 10x faster than individual `create`

### 2.2 Read Performance
```
List query (100 rows): 5ms
Aggregate sum: 2ms
Count (1018 rows): 1ms
```

**Analysis:**
- All queries sub-10ms at 1000 rows
- Index on `[businessId, invoiceDate]` makes date-range queries fast
- `aggregate` and `count` use SQLite's native optimization

### 2.3 Storage
```
DB size: 828 KB (after 1000 invoices)
Growth: ~0.4 KB per invoice
```

**Extrapolation:**
- 10k invoices ≈ 4 MB
- 100k invoices ≈ 40 MB
- 1M invoices ≈ 400 MB
- SQLite practical limit: ~2GB (well beyond 1M invoices)

---

## 3. Extrapolation to Target Scale

### 3.1 100,000 Invoices

| Operation | Measured (1k) | Extrapolated (100k) | Method |
|-----------|--------------|---------------------|--------|
| Bulk insert (1000) | 113ms | ~200ms | Linear (slight degradation) |
| List query (take 100) | 5ms | ~50ms | Index scan, log scale |
| Aggregate sum | 2ms | ~20ms | Full table scan with index |
| Count | 1ms | ~10ms | SQLite optimized count |
| DB size | 828 KB | ~40 MB | Linear (0.4KB/inv) |

**Assumptions:**
- Index on `[businessId, invoiceDate]` remains effective
- No concurrent writes (single writer)
- SQLite WAL mode enabled (default in Prisma)

**Risk:** List queries returning >1000 rows without pagination will degrade. **Mitigation:** Cursor pagination (P1 in backlog).

### 3.2 50,000 Products

| Operation | Estimated | Notes |
|-----------|-----------|-------|
| List (take 100) | ~30ms | Indexed on `[businessId, name]` |
| Search by barcode | <5ms | Indexed on `[businessId, barcode]` |
| Search by name | ~20ms | `contains` filter (no full-text index) |
| Count | ~5ms | — |

**Risk:** `contains` search (LIKE %query%) does full table scan. At 50k products, this degrades to ~100ms. **Mitigation:** Add FTS5 virtual table for full-text search (Phase 5).

### 3.3 20,000 Customers

| Operation | Estimated | Notes |
|-----------|-----------|-------|
| List (take 100) | ~20ms | Indexed on `[businessId, type]` |
| Search by phone | <5ms | Indexed on `[businessId, phone]` |
| Outstanding calc | ~50ms | Joins invoices + payments |

**Risk:** Outstanding calculation joins invoices for each party. At 20k parties × 100k invoices, this could be slow. **Mitigation:** Cache outstanding in `Party.outstandingCached` field, update on payment (Phase 5).

### 3.4 Millions of Stock Movements

| Operation | Estimated (1M rows) | Notes |
|-----------|---------------------|-------|
| Insert | ~0.1ms each | Append-only, indexed |
| Query by product | ~10ms | Indexed on `[businessId, productId]` |
| Query by date range | ~50ms | Indexed on `[createdAt]` |
| Full ledger rebuild | ~500ms | Full table scan |

**Risk:** Stock movement table grows fastest (1 invoice = 1+ movements). At 1M movements, ledger rebuild is slow. **Mitigation:** Don't rebuild; derive current stock from `Product.stock` (already done).

### 3.5 Large Audit Logs

| Operation | Estimated (100k rows) | Notes |
|-----------|----------------------|-------|
| Insert | ~0.1ms | Append-only |
| List (take 100) | ~20ms | Indexed on `[businessId, createdAt]` |
| Filter by entity | ~30ms | Indexed on `[entity, entityId]` |

**No risk** — audit log is append-only, indexed, and never updated.

---

## 4. Bottleneck Analysis

### 4.1 Current Bottlenecks (at demo scale)
1. **Dashboard API** (166ms) — 4 parallel queries + 2 sparkline queries
   - **Fix:** Server-side caching, `select` fewer fields
2. **Products API** (116ms) — returns 4 collections in 1 response
   - **Fix:** Split into separate endpoints

### 4.2 Predicted Bottlenecks (at scale)
1. **No pagination** — `take: N` caps only, no cursor. At 100k rows, fetching all is impossible.
   - **Fix:** Cursor pagination (P1)
2. **`contains` search** — full table scan. At 50k products, ~100ms.
   - **Fix:** FTS5 full-text index (Phase 5)
3. **Outstanding calculation** — joins per party. At 20k parties × 100k invoices, slow.
   - **Fix:** Cache `outstandingCached` on Party (Phase 5)
4. **No read replicas** — single SQLite file. All reads + writes on one DB.
   - **Fix:** Migrate to PostgreSQL with read replicas (Phase 6, if needed)
5. **Float precision** — 78 Float columns. At scale, rounding errors compound.
   - **Fix:** Migrate to Decimal (P0)

### 4.3 SQLite Limitations (at extreme scale)
- **2GB practical limit** — ~5M invoices before needing archive
- **Single writer** — write lock serializes. At >100 concurrent writers, contention.
- **No replication** — single point of failure. Litestream (Phase 5) adds WAL streaming.
- **No row-level security** — multi-tenant isolation is app-enforced (acceptable)

---

## 5. Migration Triggers

Migrate from SQLite to PostgreSQL when:
| Trigger | Threshold | Current |
|---------|-----------|---------|
| DB size | >1GB | 828 KB ✅ |
| Concurrent users | >50 | 1 ✅ |
| Write contention | >100 writes/sec | ~0 ✅ |
| Need for replication | HA requirement | No ✅ |
| Multi-region | Global deployment | No ✅ |

**Conclusion:** SQLite is sufficient for the next 2-3 years of MSME-scale growth.

---

## 6. Load Testing Plan (Not Yet Run)

### 6.1 Simulated Scale
- 100,000 invoices
- 50,000 products
- 20,000 customers
- 5,000 suppliers
- 1,000 employees
- 10 warehouses
- Millions of stock movements
- Large audit logs
- Multiple financial years

### 6.2 Seed Generator (Planned)
```ts
// scripts/seed-scale.ts (not yet written)
async function seedScale() {
  await seedProducts(50000);
  await seedParties(25000); // 20k customers + 5k suppliers
  await seedInvoices(100000);
  await seedStockMovements(1000000);
  await seedAuditLogs(100000);
}
```

### 6.3 Benchmark Suite (Planned)
- API latency under load (concurrent requests)
- Query latency at 100k, 500k, 1M rows
- Memory usage during bulk operations
- DB file size growth

**Status:** ❌ Not implemented. Seed generator and benchmark scripts are Phase 5 work.

---

## 7. Honest Assessment

### What Was Measured
- ✅ 1000-invoice write rate (8,850/s)
- ✅ Query latency at 1018 rows (5ms list, 2ms aggregate, 1ms count)
- ✅ DB size growth (0.4KB/invoice)
- ✅ All API endpoints (14-166ms)

### What Was Extrapolated
- 🟡 100k invoice performance (extrapolated from 1k measurement)
- 🟡 50k product search (extrapolated, no FTS)
- 🟡 1M stock movements (extrapolated)

### What Was Not Measured
- ❌ Concurrent write contention (no load test)
- ❌ 100k+ row scale (seed generator not built)
- ❌ Memory usage under load
- ❌ Multi-year data (no FY boundary testing)

---

## 8. Recommendations

### P0 (Before Scale)
1. **Cursor pagination** on all list endpoints (prevents OOM at scale)
2. **Float → Decimal** migration (prevents precision drift at scale)
3. **Outstanding cache** on Party (prevents join explosion)

### P1 (At 10k+ Invoices)
4. **FTS5 full-text search** for products (prevents `contains` scan)
5. **Server-side caching** for dashboard KPIs
6. **Archive old data** (move >3-year-old invoices to archive table)

### P2 (At 100k+ Invoices)
7. **Litestream** for continuous backup
8. **Read replica** (if migrating to Postgres)
9. **Query analysis** with EXPLAIN QUERY PLAN

### P3 (At 1M+ Invoices)
10. **Migrate to PostgreSQL** (ADR-003 review trigger)
11. **Shard by business** (if multi-tenant SaaS)
12. **Data warehousing** for analytics

---

**This report is based on a 1000-invoice simulation with extrapolation. Large-scale seed generation (100k+) is planned but not yet executed.**
