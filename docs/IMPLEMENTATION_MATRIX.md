# Implementation Matrix

> **Audit date:** 2026-06-29
> **Method:** Automated grep + file existence checks + test runs
> **Principle:** Accuracy over completion. Items marked ❌ are explicitly incomplete.

## Summary

| Category | Specified | Implemented | Partial | Missing |
|----------|-----------|-------------|---------|---------|
| Architecture | 21 docs | 21 docs | — | — |
| Database | 22 models | 22 models | — | Migrations, backup, integrity |
| API | 18 routes | 18 routes | 0 | Auth, validation, envelope, pagination, request IDs |
| Auth | Full RBAC | 0 routes | 0 | All (NextAuth, JWT, OTP, roles) |
| Validation | Zod on all | 0 routes | 0 | All schemas |
| Offline | Full PWA | 0 | 0 | Service worker, IndexedDB, sync |
| Performance | 120fps, <150KB | Partial | Code-split, error boundary | Virtualization, optimistic, bundle budget |
| Testing | 95% coverage | 138 unit tests | gst 100% | E2e, a11y, Lighthouse, CI |
| CI/CD | 10 jobs | 0 | — | GitHub Actions |
| Security | Full hardening | 0 | — | Auth, rate limit, CSP, CSRF |

**Honest assessment:** The application is a **functional demo with documentation**. It is **NOT production-ready**. Core production requirements (authentication, validation, error handling, migrations, offline, CI) are unimplemented.

---

## Implementation Matrix

| # | Specification | Implemented | Missing | Notes |
|---|---------------|-------------|---------|-------|
| **00** | **Project Overview** | | | |
| 00.1 | Tech stack: Next.js 16 + Prisma + SQLite + shadcn/ui | ✅ | — | Verified: package.json, schema.prisma |
| 00.2 | Single-route SPA at `/` | ✅ | — | `src/app/page.tsx` is client component |
| 00.3 | 12 views, 18 API routes, 22 models | ✅ | — | Verified by file count |
| 00.4 | Premium emerald design system | ✅ | — | `globals.css`, no indigo/blue |
| **01** | **PRD** | | | |
| 01.1 | Onboarding (4 steps, 12 industries) | ✅ | — | `onboarding.tsx` |
| 01.2 | Dashboard (KPIs, charts, hero) | ✅ | — | `dashboard-view.tsx` |
| 01.3 | Sales & Invoices (create, list, view, print) | ✅ | — | `sales-view.tsx`, `invoice-editor.tsx`, `invoice-viewer.tsx` |
| 01.4 | POS Billing | ✅ | — | `pos-view.tsx` |
| 01.5 | Inventory (CRUD, stock adjust) | ✅ | — | `inventory-view.tsx` |
| 01.6 | Parties (CRUD, statement) | ✅ | — | `parties-view.tsx`, `party-statement.tsx` |
| 01.7 | Purchases | ✅ | — | `purchases-view.tsx` |
| 01.8 | Quotations (create, convert) | ✅ | — | `quotations-view.tsx`, `quotation-editor.tsx`, `quotation-viewer.tsx` |
| 01.9 | Expenses | ✅ | — | `expenses-view.tsx` |
| 01.10 | Reports (6 types, CSV export) | ✅ | — | `reports-view.tsx` |
| 01.11 | GST Returns (GSTR-1, HSN) | ✅ | — | `gst-view.tsx` |
| 01.12 | Audit Log | ✅ | — | `audit-view.tsx` |
| 01.13 | Settings | ✅ | — | `settings-view.tsx` |
| 01.14 | Authentication (OTP, Google, email) | ❌ | All | `getActiveBusiness()` returns first business — no JWT, no session |
| 01.15 | RBAC (13 roles) | ❌ | All | `BusinessMember.role` exists but never checked |
| 01.16 | Offline mode (IndexedDB, sync) | ❌ | All | No service worker, no IndexedDB |
| 01.17 | Performance: 120fps, <100ms | 🟡 Partial | Virtualization, optimistic | Code-split ✅, no virtualization, no optimistic updates |
| 01.18 | Test coverage 95% | 🟡 Partial | E2e, a11y, Lighthouse | 138 unit tests, gst 100%, no e2e |
| **02** | **System Architecture** | | | |
| 02.1 | Single-route SPA with Zustand view switching | ✅ | — | `store.ts`, `page.tsx` |
| 02.2 | Code splitting via `next/dynamic` | ✅ | — | 12 lazy views |
| 02.3 | TanStack Query for server state | ✅ | — | 25 `useQuery` usages |
| 02.4 | Zustand for UI state (persisted) | ✅ | — | `store.ts` with `persist` |
| 02.5 | Error boundaries | ✅ | — | `error.tsx` + `error-boundary.tsx` (Phase 2 added) |
| 02.6 | Prisma query logging dev-only | ✅ | — | `db.ts` fixed in Phase 2 |
| 02.7 | Structured logger | ❌ | — | No pino/winston |
| 02.8 | Request IDs | ❌ | — | No `x-request-id` middleware |
| **03** | **Database Specification** | | | |
| 03.1 | 22 Prisma models | ✅ | — | Verified: `grep -c '^model' schema.prisma` = 22 |
| 03.2 | 38 indexes + unique constraints | ✅ | — | Verified |
| 03.3 | Cascade delete from Business | ✅ | — | All `businessId` FKs cascade |
| 03.4 | Audit fields (createdAt, updatedAt, deletedAt) | ✅ | — | On entity models |
| 03.5 | Prisma migrations | ❌ | All | `prisma/migrations/` does not exist; `db:push` only |
| 03.6 | Float → Decimal for money | ❌ | All | 78 Float columns still store money |
| 03.7 | `createdBy`/`updatedBy` FKs | ❌ | All | Only `createdBy String?` (name, not FK) on 5 models |
| 03.8 | Backup utility | ❌ | — | No backup script |
| 03.9 | Restore utility | ❌ | — | No restore script |
| 03.10 | Integrity checker | ❌ | — | No integrity check |
| 03.11 | Database version table | ❌ | — | No version tracking |
| **04** | **API Specification** | | | |
| 04.1 | 18 REST endpoints | ✅ | — | Verified by file count |
| 04.2 | Standardized envelope `{ data, error, meta }` | ❌ | All | Inconsistent: `{ items }`, `{ business }`, `{ ok, invoice }` |
| 04.3 | Authentication on all routes | ❌ | All | 0/18 routes authenticated |
| 04.4 | Zod validation on all routes | ❌ | All | 0 zod schemas |
| 04.5 | try/catch error handling | ❌ | All | 1 try block across 18 routes (in seed) |
| 04.6 | Standardized error codes | ❌ | All | Raw 500s on Prisma errors |
| 04.7 | Cursor pagination | ❌ | All | `take: N` caps only, 0 `skip`, 0 `cursor` |
| 04.8 | Sorting (`sortBy`, `sortOrder`) | ❌ | All | Hardcoded per route |
| 04.9 | Rate limiting | ❌ | All | No `@upstash/ratelimit` |
| 04.10 | Request IDs | ❌ | All | No middleware |
| 04.11 | API versioning (`/api/v1/`) | ❌ | — | `/api/` only |
| 04.12 | OpenAPI spec | ❌ | — | No `OPENAPI.json` |
| 04.13 | Swagger UI | ❌ | — | Not configured |
| **05** | **Design System** | | | |
| 05.1 | Emerald color system (OKLCH) | ✅ | — | `globals.css` |
| 05.2 | No indigo/blue | ✅ | — | Verified |
| 05.3 | Typography scale (Geist Sans/Mono) | ✅ | — | `layout.tsx` |
| 05.4 | Tabular numerals (`tnum`) | ✅ | — | Used on finance figures |
| 05.5 | Shadow system (soft/card/float/glow) | ✅ | — | `globals.css` |
| 05.6 | Glass effects | ✅ | — | `glass`, `glass-sidebar` |
| 05.7 | Animation (transform+opacity, reduced-motion) | ✅ | — | `globals.css`, framer-motion |
| 05.8 | Dark mode | ✅ | — | next-themes |
| 05.9 | Print styles | ✅ | — | `@media print` in globals.css |
| 05.10 | Responsive (mobile-first) | ✅ | — | Bottom nav, responsive grids |
| **06** | **Component Library** | | | |
| 06.1 | 48 shadcn/ui primitives | ✅ | — | `src/components/ui/` |
| 06.2 | 13 app components | ✅ | — | `src/components/app/` |
| 06.3 | 12 view components | ✅ | — | `src/components/views/` |
| 06.4 | Shared `StatusBadge` extracted | ❌ | — | Duplicated in 4 views |
| 06.5 | Shared `StatCard` extracted | ❌ | — | Duplicated in 7 views |
| 06.6 | Shared `Field` extracted | ❌ | — | Duplicated in 5 files |
| 06.7 | Shared `DocumentEditor` | ❌ | — | Invoice/Quotation editors 70% duplicate |
| **07** | **UI Screen Specification** | | | |
| 07.1 | 18 screens documented | ✅ | — | All match implementation |
| 07.2 | Loading skeletons | ✅ | — | 32 Skeleton usages |
| 07.3 | Empty states | ✅ | — | Every list has one |
| 07.4 | Error states (ErrorBoundary) | ✅ | — | Phase 2 added |
| **08** | **User Flows** | | | |
| 08.1 | Onboarding flow | ✅ | — | Verified |
| 08.2 | Create invoice flow | ✅ | — | Verified via agent-browser |
| 08.3 | Collect payment flow | ✅ | — | Verified |
| 08.4 | POS checkout flow | ✅ | — | Verified |
| 08.5 | Quotation→invoice flow | ✅ | — | Verified |
| 08.6 | Party statement flow | ✅ | — | Verified |
| **09** | **Permission Matrix** | | | |
| 09.1 | 13 roles defined | ✅ | — | `BusinessMember.role` |
| 09.2 | Permission matrix documented | ✅ | — | `09_PERMISSION_MATRIX.md` |
| 09.3 | `requireRole` middleware | ❌ | — | Not implemented |
| 09.4 | RBAC enforced on routes | ❌ | All | 0/18 routes check role |
| 09.5 | Permission tests | ❌ | — | None |
| **10** | **Business Rules** | | | |
| 10.1 | Invoice numbering (auto-seq) | ✅ | — | `invoiceSeq` increment |
| 10.2 | GST calculation (CGST/SGST/IGST) | ✅ | — | `gst.ts`, 100% test coverage |
| 10.3 | Stock movements (immutable ledger) | ✅ | — | `StockMovement` model |
| 10.4 | Payment linkage | ✅ | — | Updates invoice balance/status |
| 10.5 | Quotation convert to invoice | ✅ | — | `/api/quotations/[id]` PATCH |
| 10.6 | Audit logging | 🟡 Partial | 15 routes | Only 3 routes call `recordAudit` |
| 10.7 | GSTIN validation | ✅ | — | `isValidGstin()` (client-side only; server missing) |
| **11** | **GST Engine** | | | |
| 11.1 | CGST/SGST (intra) + IGST (inter) | ✅ | — | 100% test coverage |
| 11.2 | 7 GST rates | ✅ | — | `GST_RATES` constant |
| 11.3 | Per-line discounts | ✅ | — | `computeLine` |
| 11.4 | Document rounding | ✅ | — | `computeDocument` |
| 11.5 | GSTIN format validation | ✅ | — | `isValidGstin` |
| 11.6 | 38 state codes | ✅ | — | `INDIAN_STATES` |
| 11.7 | Amount in words (Indian) | ✅ | — | `amountInWords` |
| 11.8 | Cess support | ❌ | — | `cessTotal` always 0 |
| 11.9 | Reverse charge | ❌ | — | Not implemented |
| 11.10 | E-invoicing (IRN/QR) | ❌ | — | Phase 6 |
| **12** | **Inventory Engine** | | | |
| 12.1 | Product CRUD | ✅ | — | `/api/products` |
| 12.2 | Stock adjustment | ✅ | — | Dialog in inventory-view |
| 12.3 | StockMovement ledger | ✅ | — | 6 movement types |
| 12.4 | Low/out stock alerts | ✅ | — | Dashboard + inventory |
| 12.5 | Batch tracking UI | ❌ | — | Schema only |
| 12.6 | Expiry tracking UI | ❌ | — | Schema only |
| 12.7 | Serial tracking UI | ❌ | — | Schema only |
| 12.8 | Multi-warehouse | ❌ | — | Single warehouse |
| 12.9 | Reorder suggestions | ❌ | — | Not implemented |
| **13** | **Accounting Engine** | | | |
| 13.1 | Party ledger (Dr/Cr) | ✅ | — | `party-statement.tsx` |
| 13.2 | P&L statement | ✅ | — | `/api/reports?report=profit_loss` |
| 13.3 | Day book | ✅ | — | `/api/reports?report=day_book` |
| 13.4 | Sales/Purchase register | ✅ | — | Report types |
| 13.5 | Outstanding calculation | ✅ | — | Party + business level |
| 13.6 | Double-entry accounting | ❌ | — | Single-entry only |
| 13.7 | Balance sheet | ❌ | — | Phase 5 |
| 13.8 | Trial balance | ❌ | — | Phase 5 |
| 13.9 | Cash flow statement | ❌ | — | Phase 5 |
| **14** | **Performance Guide** | | | |
| 14.1 | Code splitting (lazy views) | ✅ | — | `next/dynamic` |
| 14.2 | GPU-accelerated animation | ✅ | — | transform+opacity, `gpu` class |
| 14.3 | TanStack Query caching | ✅ | — | staleTime 30s |
| 14.4 | List virtualization | ❌ | All | `@tanstack/react-virtual` not installed |
| 14.5 | Optimistic updates | ❌ | All | No `useMutation` |
| 14.6 | Bundle analyzer | ❌ | — | Not configured |
| 14.7 | Performance budget enforcement | ❌ | — | No CI gate |
| 14.8 | Lighthouse CI | ❌ | — | Not configured |
| 14.9 | Web vitals reporting | ❌ | — | Not implemented |
| **15** | **Security Guide** | | | |
| 15.1 | NextAuth authentication | ❌ | All | Not implemented |
| 15.2 | JWT sessions | ❌ | All | Not implemented |
| 15.3 | RBAC enforcement | ❌ | All | Not implemented |
| 15.4 | Zod input validation | ❌ | All | 0 schemas |
| 15.5 | CSRF protection | ❌ | — | No Origin check |
| 15.6 | Rate limiting | ❌ | — | No ratelimit |
| 15.7 | CSP header | ❌ | — | Not in next.config |
| 15.8 | HSTS header | ❌ | — | Not configured |
| 15.9 | Audit log on all mutations | ❌ | 15 routes | Only 3 routes log |
| 15.10 | IP capture in audit | ❌ | — | Not passed to recordAudit |
| 15.11 | Secret management | ❌ | — | No `.env.example` |
| 15.12 | Encryption at rest | ❌ | — | SQLite unencrypted |
| **16** | **Testing Guide** | | | |
| 16.1 | Vitest installed | ✅ | — | v4.1.9 |
| 16.2 | Unit tests (138) | ✅ | — | gst 64, format 55, utils 6, nav 13 |
| 16.3 | gst.ts 100% coverage | ✅ | — | Verified |
| 16.4 | format.ts 100% coverage | 🟡 99% | 1 branch | Private helper |
| 16.5 | Playwright e2e | ❌ | All | Not installed |
| 16.6 | axe-core a11y tests | ❌ | All | Not installed |
| 16.7 | Lighthouse CI | ❌ | All | Not configured |
| 16.8 | Visual regression | ❌ | All | Not configured |
| 16.9 | GitHub Actions CI | ❌ | All | No `.github/workflows/` |
| 16.10 | Coverage gate in CI | ❌ | — | No CI |
| **17** | **Coding Standards** | | | |
| 17.1 | TypeScript strict | 🟡 Partial | `ignoreBuildErrors: true` | Set in next.config.ts |
| 17.2 | No `any` types | ❌ | 76 usages | Target <20 |
| 17.3 | ESLint passes | ✅ | — | 0 errors |
| 17.4 | `data-testid` on interactive elements | ✅ | — | 66 usages |
| **18** | **Release Process** | | | |
| 18.1 | 12-step workflow documented | ✅ | — | `18_RELEASE_PROCESS.md` |
| 18.2 | Definition of Done checklist | ✅ | — | Documented |
| 18.3 | CI enforcement | ❌ | — | No CI |
| **19** | **Backlog** | | | |
| 19.1 | P0 items tracked | ✅ | — | 6 items |
| 19.2 | P1 items tracked | ✅ | — | 9 items |
| **20** | **Changelog** | | | |
| 20.1 | Keep a Changelog format | ✅ | — | `20_CHANGELOG.md` |
| 20.2 | Phase 2 entries | ✅ | — | Documented |

---

## Audit Reports (7) — All Complete ✅
- AUDIT_REPORT.md, DATABASE_AUDIT.md, API_AUDIT.md, FRONTEND_AUDIT.md, SECURITY_AUDIT.md, PERFORMANCE_REPORT.md, TESTING_REPORT.md

## ADRs (10) — All Complete ✅
- ADR-001 through ADR-010 in `/docs/architecture_decisions/`

---

## Critical Gaps (P0 — Block Production)

1. **No authentication** (0/18 routes) — `getActiveBusiness()` returns first business
2. **No input validation** (0 zod schemas) — `req.json()` as `any`
3. **No error handling** (1 try/catch in 18 routes) — raw 500s
4. **No migrations** — `db:push` only, no rollback
5. **Float money storage** — 78 Float columns, precision risk
6. **No CI/CD** — no GitHub Actions
7. **No rate limiting** — brute-force vulnerable
8. **No offline** — no service worker, no IndexedDB

## Verified Strengths

1. ✅ **GST engine** — 100% test coverage, correct CGST/SGST/IGST
2. ✅ **Design system** — premium emerald, consistent, dark mode
3. ✅ **Documentation** — 38 markdown files, comprehensive
4. ✅ **Error boundaries** — added in Phase 2
5. ✅ **Code splitting** — 12 lazy views
6. ✅ **Lint clean** — 0 ESLint errors

---

**This matrix is the baseline for Phase 3 production hardening. Every ❌ is a tracked work item.**
