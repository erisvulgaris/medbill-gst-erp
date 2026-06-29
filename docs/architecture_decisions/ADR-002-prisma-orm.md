# ADR-002: Prisma ORM

> **Status:** Accepted
> **Date:** 2026-06-29

## Context

MedBill needs a database access layer for SQLite. The schema is normalized (22 models) with relations, indexes, and cascade rules. The team values type safety and developer experience.

## Problem

Choose a database ORM/query builder for Next.js + SQLite.

## Alternatives

1. **Raw SQL via `better-sqlite3`** — Fast, no abstraction, but loses type safety and requires hand-writing migrations.
2. **Drizzle ORM** — Lightweight, SQL-like, type-safe. Good option. The PRD mentioned Drizzle.
3. **Prisma** — Declarative schema, type-safe client, migrations, studio GUI. Heavier than Drizzle.
4. **Kysely** — Type-safe SQL builder, no schema definition language.

## Decision

**Prisma 6**, because:
- The scaffold pre-installed and configured Prisma (`prisma/schema.prisma`, `src/lib/db.ts`)
- Declarative schema is self-documenting (good for a solo-founder project)
- Type-safe client (`@prisma/client`) eliminates runtime query errors
- `prisma db push` for dev, `prisma migrate` for prod
- Excellent Next.js integration
- 22-model schema is well within Prisma's comfort zone

## Consequences

### Positive
- ✅ Type-safe queries — no runtime SQL errors
- ✅ Declarative schema is the source of truth (`03_DATABASE_SPECIFICATION.md`)
- ✅ Auto-generated client — no manual typing
- ✅ Relations, cascades, indexes all declarative
- ✅ Prisma Studio for quick data inspection

### Negative
- ❌ Prisma client is ~3MB in `node_modules` (acceptable)
- ❌ Query logging floods stdout if enabled (disabled in prod — see `db.ts` fix)
- ❌ Prisma's Float type doesn't guarantee decimal precision (see `DATABASE_AUDIT.md` §2.1 — migrate to Decimal)
- ❌ SQLite Prisma limitations: no native enums, no array columns, no JSON type (stored as String)
- ❌ `db:push` doesn't generate migrations (must switch to `migrate` for prod)

## Future Review Criteria

Revisit if:
1. Scale exceeds 100k invoices/month (consider Postgres + Prisma)
2. Decimal precision bugs surface (migrate Float→Decimal or integer paise)
3. Need for raw SQL or complex joins becomes frequent (consider Drizzle for those queries)
4. Multi-tenant sharding is needed (Prisma supports it but requires care)

## References
- `prisma/schema.prisma`
- `src/lib/db.ts`
- `03_DATABASE_SPECIFICATION.md`
- `DATABASE_AUDIT.md`
