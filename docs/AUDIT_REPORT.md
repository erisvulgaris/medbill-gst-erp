# MedBill — Codebase Audit Report

> **Audit date:** 2026-06-29
> **Auditor:** Architecture team (Phase 2 — Stabilization)
> **Scope:** Entire `src/`, `prisma/`, and root configuration
> **Status:** Frozen feature baseline for Phase 2 audit

## Executive Summary

MedBill Phase 1 delivered a feature-complete GST billing ERP (12 views, 18 API routes, 22 Prisma models, ~14k LOC) with a premium emerald UI and verified end-to-end billing flows. However, the codebase carries **significant production-readiness debt** that must be addressed before any commercial deployment:

| Severity | Count | Examples |
|----------|-------|----------|
| 🔴 Critical | 4 | No authentication, no input validation, no test runner, Prisma query logging enabled in all envs |
| 🟠 High | 6 | 76 `any` types, no RBAC enforcement, hardcoded user identity, no try/catch in routes, no real pagination, 62 client components |
| 🟡 Medium | 8 | Duplicated editor logic, oversized components, no error boundaries, no rate limiting, secrets via plaintext env |
| 🟢 Low | 5 | Inconsistent loading states, minor spacing variance, missing ARIA on some controls |

**Recommendation:** Do not deploy to production until all 🔴 Critical and 🟠 High items are resolved. Phase 2 must prioritize authentication, validation, and testing infrastructure.

---

## 1. Architecture

### 1.1 Duplicated Components & Logic

**InvoiceEditor ↔ QuotationEditor** — `src/components/app/invoice-editor.tsx` (440 LOC) and `src/components/app/quotation-editor.tsx` (281 LOC) share ~70% identical structure:
- Party combobox picker
- Product combobox picker
- Line-item table with qty/rate/discount/GST inputs
- Totals panel with subtotal/taxable/CGST/SGST/IGST/roundoff/grand-total
- Notes/terms textareas

**Recommendation:** Extract a shared `<DocumentEditor mode="invoice"|"quotation"|"proforma">` component. Estimated reduction: ~300 LOC.

**StatusBadge pattern** — Duplicated in `dashboard-view.tsx`, `sales-view.tsx`, `quotations-view.tsx`, `reports-view.tsx`. Each defines its own `StatusBadge`/`StatusPill` function with the same status→color mapping.

**Recommendation:** Extract to `src/components/app/status-badge.tsx` with a single shared map.

**StatCard pattern** — Duplicated in `inventory-view`, `parties-view`, `purchases-view`, `expenses-view`, `reports-view`, `audit-view`, `quotations-view`. Each defines a local `StatCard` function.

**Recommendation:** Extract to `src/components/app/stat-card.tsx`.

**KPI/Metric layout** — Same card-with-icon+label+value pattern repeated 7+ times.

### 1.2 Circular Dependencies

None detected. `src/lib/*` has clean layering:
- `gst.ts`, `format.ts` → pure, no imports
- `store.ts` → imports nothing internal
- `auth.ts` → imports `db.ts`
- `api.ts` → imports `store.ts` dynamically
- `audit.ts` → imports `db.ts`
- `nav.ts` → imports `store.ts` types only

### 1.3 Poor Abstractions

**`api()` fetch helper** (`src/lib/api.ts`) — A single generic wrapper with no:
- Request timeout
- Retry/backoff
- Auth header injection
- Response type safety (returns `Promise<T>` cast at call site)
- Error normalization (throws raw `Error` with server text)

**`useInvoice` / inline fetch** — `invoice-viewer.tsx` and `quotation-viewer.tsx` use a hand-rolled `useInvoice`/`useState`+`useEffect` pattern instead of React Query, inconsistent with the rest of the app which uses `useQuery`. This means no cache, no refetch-on-focus, no deduplication for these views.

**`viewParams` typing** — `Record<string, unknown>` in the store; every consumer casts `viewParams.action as string` and `viewParams.id as string`. Should be a discriminated union.

### 1.4 Oversized Files

| File | LOC | Concern |
|------|-----|---------|
| `src/components/ui/sidebar.tsx` | 726 | shadcn primitive — acceptable, vendored |
| `src/app/api/seed/route.ts` | 456 | Single 400-line POST handler — should be split into seed functions |
| `src/components/app/invoice-viewer.tsx` | 521 | Viewer + collect-payment dialog + hooks in one file |
| `src/components/views/dashboard-view.tsx` | 443 | 6 sub-components + data shape + chart config inline |
| `src/components/app/invoice-editor.tsx` | 440 | Editor + line table + totals + party picker inline |
| `src/components/app/onboarding.tsx` | 403 | 4 steps + form state + module config inline |
| `src/components/views/inventory-view.tsx` | 401 | List + add/edit dialog + stock adjust dialog inline |

**Recommendation:** Split `invoice-viewer.tsx` into `invoice-viewer.tsx` + `collect-payment-dialog.tsx`. Split `inventory-view.tsx` into list + `product-form-dialog.tsx` + `stock-adjust-dialog.tsx`. Split `seed/route.ts` into `seed/business.ts`, `seed/products.ts`, `seed/invoices.ts`, `seed/purchases.ts`, `seed/expenses.ts`.

### 1.5 Improper State Management

**Zustand store holds derived business state** — `business` object stored in both server (DB) and client (localStorage via persist). On settings save, the client copy can drift from server. No reconciliation on focus.

**No optimistic updates** — All mutations wait for server response. POS checkout blocks the UI. Invoice save blocks. This violates the stated "sub-100ms interactions" goal.

**Topbar notification polling** — `setInterval(loadNotifs, 60000)` runs unconditionally even when the notifications sheet is closed and the tab is hidden. Should pause on `document.hidden`.

### 1.6 API Inconsistencies

- **`GET /api/products`** returns `{ items, units, taxes, categories }` (4 keys) — unusual; most other list endpoints return `{ items }`.
- **`GET /api/dashboard`** returns a flat object with `kpis`, `sparkline`, `topProducts`, etc. — fine, but no envelope.
- **`GET /api/invoices`** returns `{ items }`, **`GET /api/business`** returns `{ business }`, **`GET /api/notifications`** returns `{ items }` — envelope is inconsistent (`business` singular vs `items` plural).
- **Error shape** — `NextResponse.json({ error: "msg" }, { status: 4xx })` in some routes, raw `throw new Error()` in `api.ts` client. No standard error code/type field.
- **`PATCH /api/products`** uses `db.product.fields.minStock` in a `where` clause (`src/app/api/products/route.ts:GET` line 17) — this is a Prisma field reference used as a value, which is **invalid Prisma syntax** and would throw at runtime if the `low=1` query param is ever used.

---

## 2. Cross-Cutting Concerns

### 2.1 Authentication & Authorization
- **No authentication.** `getActiveBusiness()` returns `db.business.findFirst()` — the first business in the DB. Any caller can access any business's data.
- **No RBAC.** The `BusinessMember.role` field exists but is never checked in any API route.
- See `SECURITY_AUDIT.md` for full details.

### 2.2 Input Validation
- **Zero server-side validation** despite `zod` being installed. All `req.json()` bodies are consumed as untyped `any` and passed directly to Prisma.
- GSTIN format, phone format, email format, numeric ranges — none validated on the server.
- The client-side `isValidGstin()` check in `gst.ts` is bypassable.

### 2.3 Error Handling
- **1 `try/catch`** across all 18 API routes (in `seed/route.ts` is none — actually zero). Unhandled Prisma errors return a generic 500 with no body.
- No global `error.tsx` boundary in the app router.
- No `not-found.tsx`.
- Client `api()` helper throws `Error(text)` — callers use `catch (e: any) { toast.error(e?.message) }` with `any`.

### 2.4 Logging & Observability
- **Prisma `log: ['query']`** in `src/lib/db.ts` logs every SQL query to stdout in **all environments** — including production. This is a performance and information-leak risk.
- No structured logger (no `pino`, no `winston`).
- No request IDs, no correlation IDs.
- `console.log` count: 0 in source (good) but the Prisma logger floods `dev.log`.

### 2.5 Environment & Secrets
- `.env` contains only `DATABASE_URL` (a file path, not a secret).
- No `NEXTAUTH_SECRET`, no `JWT_SECRET`, no API keys — because no auth exists yet.
- `.env` is **not in `.gitignore` verification** — need to confirm.

---

## 3. Dependency Health

| Package | Version | Status | Notes |
|---------|---------|--------|-------|
| next | 16.1.1 | ⚠️ Behind | 16.1.3 available (dev log shows 16.1.3 runtime) |
| react | 19.0.0 | ✅ Current | |
| prisma | 6.11.1 | ✅ Current | 6.19.2 generated client |
| zod | 4.0.2 | 🔴 Unused | Installed but 0 usages |
| next-auth | 4.24.11 | 🔴 Unused | Installed but no config |
| @tanstack/react-table | 8.21.3 | 🟡 Underused | Installed but TanStack Table APIs not used (manual `<table>`) |
| @tanstack/react-virtual | — | 🔴 Missing | Required for stated 120fps virtualization goal |
| framer-motion | 12.23.2 | ✅ Used | |
| recharts | 2.15.4 | ✅ Used | |
| z-ai-web-dev-sdk | 0.0.18 | ✅ For AI skills | Backend only |

**Action items:** Either integrate zod+next-auth or remove them. Add `@tanstack/react-virtual`. Pin exact versions.

---

## 4. Build & Tooling

- **Lint:** `eslint .` passes clean (0 errors). ✅
- **TypeScript:** `next.config.ts` has `typescript.ignoreBuildErrors: true` — **this silently hides type errors**. Should be `false` once `any` usage is reduced.
- **No `tsc --noEmit`** in CI — type errors only surface at runtime.
- **No test runner** — `bun run test` does not exist.
- **No CI/CD** — no `.github/workflows/`.
- **`.gitignore`** exists but not audited for `dev.log`, `.next/`, `db/*.db`.

---

## 5. Prioritized Remediation Plan

### P0 — Block production (must fix before any deploy)
1. Implement authentication (NextAuth + JWT sessions) — see `SECURITY_AUDIT.md`
2. Add zod validation to every API route — see `API_AUDIT.md`
3. Remove `typescript.ignoreBuildErrors: true`
4. Disable Prisma query logging in production (`log: process.env.NODE_ENV === 'development' ? ['query'] : []`)
5. Add `error.tsx` global boundary
6. Add `try/catch` + normalized error responses to all 18 routes

### P1 — High priority (this phase)
7. Extract shared `DocumentEditor`, `StatusBadge`, `StatCard` components
8. Fix invalid Prisma `db.product.fields.minStock` usage
9. Replace inline `useInvoice`/`useEffect` with React Query
10. Reduce `any` usage by 50% (76 → <40) with proper types
11. Split oversized files (invoice-viewer, inventory-view, seed)
12. Add `@tanstack/react-virtual` to large lists

### P2 — Medium priority (next phase)
13. Add request timeout + retry to `api()` helper
14. Standardize API envelope (`{ data, error, meta }`)
15. Implement real pagination (cursor-based)
16. Add structured logger
17. Add RBAC middleware
18. Set up Vitest + Playwright + coverage

### P3 — Polish
19. Pause notification polling when tab hidden
20. Add optimistic updates to invoice/expense mutations
21. Add ARIA attributes to custom controls
22. Unify loading skeletons

---

## 6. Metrics Summary

| Metric | Value | Target |
|--------|-------|--------|
| Lines of code (src) | 14,071 | — |
| API routes | 18 | — |
| Prisma models | 22 | — |
| Client components | 62 | <40 (move logic to server/hooks) |
| `any` usages | 76 | <20 |
| zod schemas | 0 | 18+ (one per route) |
| try/catch in API | 1 | 18 (one per route) |
| Test files | 0 | 30+ |
| Test coverage | 0% | 95% business logic |
| Auth-protected routes | 0/18 | 18/18 |
| ESLint errors | 0 | 0 ✅ |
| TypeScript errors (hidden) | unknown | 0 (after removing ignore flag) |

---

**This audit is the baseline for all Phase 2 work. Every finding here has a corresponding action in the remediation plan and is tracked in `/docs/19_BACKLOG.md`.**
