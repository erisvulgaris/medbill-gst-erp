# ADR-003: SQLite Database

> **Status:** Accepted
> **Date:** 2026-06-29

## Context

MedBill targets Indian MSMEs — retail shops, wholesalers, small manufacturers. The typical business has 1-10 users, 1k-50k products, 1k-10k invoices/year. The deployment is a single-instance Next.js app.

## Problem

Choose a database engine.

## Alternatives

1. **PostgreSQL** — Industrial-grade, but requires a separate server, ops overhead, and connection pooling.
2. **MySQL** — Similar to Postgres in ops overhead.
3. **SQLite** — Single-file, zero-config, embedded, 0 ops.
4. **MongoDB** — Document store; poor fit for relational billing data.

## Decision

**SQLite**, because:
- **MSME scale fits SQLite.** SQLite handles 100k+ rows per table with ease. MedBill's largest table (StockMovement) will reach ~100k rows after 5 years — well within SQLite's comfort zone.
- **Zero ops.** No DB server to run, monitor, back up separately. The DB is one file (`db/custom.db`). Backup = copy the file.
- **Single-instance deployment.** The sandbox runs one Next.js process. SQLite's write lock is acceptable when there's one writer.
- **Prisma supports it fully.** The scaffold pre-configured SQLite.
- **Solo-founder maintainability.** No DBA needed.

## Consequences

### Positive
- ✅ Zero configuration — `DATABASE_URL=file:./db/custom.db`
- ✅ Backup is `cp db/custom.db backups/{date}.db`
- ✅ Fast for read-heavy workloads (MedBill is ~90% reads)
- ✅ ACID-compliant
- ✅ No network latency (in-process)

### Negative
- ❌ **Single writer.** Only one write at a time. Mitigated by short transactions. At >100 concurrent writers, migrate to Postgres.
- ❌ **No built-in replication.** For HA, use Litestream (WAL streaming to S3).
- ❌ **No native Decimal type.** Stored as REAL (float). See `DATABASE_AUDIT.md` §2.1 — must migrate to integer paise or Decimal.
- ❌ **No native enums.** Encoded as String with app-layer validation.
- ❌ **2GB practical DB size limit** for the WAL mode. At ~5M invoices, would need to archive.
- ❌ **No row-level security.** Multi-tenant isolation must be app-enforced (`businessId` on every query).

## Future Review Criteria

Migrate to PostgreSQL if:
1. Concurrent users exceed 50 (write contention)
2. Multi-region deployment is needed
3. DB size exceeds 1GB (archive + migrate)
4. Need for row-level security / materialized views / full-text search
5. Customer requests Postgres for compliance

**Migration path:** Prisma supports both SQLite and Postgres. Change `datasource.db.provider` from `sqlite` to `postgresql`, update connection string, run `prisma migrate`. Schema is compatible (modulo Decimal/enum differences).

## References
- `DATABASE_AUDIT.md`
- `03_DATABASE_SPECIFICATION.md`
- Litestream for HA: https://litestream.io/
