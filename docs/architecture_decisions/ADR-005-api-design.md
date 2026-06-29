# ADR-005: REST API Design

> **Status:** Accepted
> **Date:** 2026-06-29

## Context
MedBill needs an API layer between the Next.js client and Prisma/SQLite. The client is a single-route SPA that fetches data via `fetch()`.

## Problem
Choose an API style: REST, tRPC, or GraphQL.

## Alternatives
1. **tRPC** — Type-safe end-to-end, no schema duplication. But tightly couples client/server (same codebase required) and doesn't work well with external consumers.
2. **GraphQL** — Flexible queries, single endpoint. Overkill for this scale; adds complexity (resolvers, schema, N+1 risk).
3. **REST** — Universal, simple, cacheable, works with any client.

## Decision
**REST via Next.js Route Handlers.** 18 endpoints under `/api/`.

Conventions:
- `GET /api/{resource}` — list (with `?q=`, `?status=`, `?limit=`, `?cursor=`)
- `GET /api/{resource}/{id}` — single
- `POST /api/{resource}` — create (returns 201)
- `PATCH /api/{resource}/{id}` — partial update
- `DELETE /api/{resource}/{id}` — soft delete (returns 204)
- Envelope: `{ items, meta }` for lists, `{ data }` for single (Phase 3 standardization)

## Consequences
### Positive
- ✅ Universal — any client (curl, mobile, future apps) can consume
- ✅ Next.js Route Handlers are native (no extra server)
- ✅ Cacheable via HTTP headers
- ✅ Simple to learn and debug

### Negative
- ❌ Type duplication (zod schema + TS type + Prisma type). Mitigation: `z.infer<typeof schema>` + Prisma's generated types.
- ❌ No automatic type safety end-to-end (tRPC would give this). Mitigation: zod + shared types in `src/lib/schemas/`.
- ❌ Over/under-fetching possible. Mitigation: tailored endpoints (e.g., `/api/dashboard` aggregates).

## Future Review
Revisit if:
1. A mobile app is built (REST works fine; tRPC-Go exists but adds complexity)
2. API consumers request GraphQL (unlikely for MSME ERP)
3. Type drift becomes painful (consider tRPC for internal routes)

## References
- `04_API_SPECIFICATION.md`
- `API_AUDIT.md`
