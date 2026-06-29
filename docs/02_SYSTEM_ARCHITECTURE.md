# 02 — System Architecture

> **Status:** Source of truth
> **Related:** ADR-001 (Next.js), ADR-004 (State), ADR-007 (Folder Structure), ADR-008 (Performance)

## 1. High-Level Architecture

MedBill is a **single-page application** rendered by Next.js 16. The user-visible surface is one route (`/`); all "pages" are client-side view switches managed by a Zustand store. The backend is a set of Next.js Route Handlers (REST-ish) that read/write SQLite via Prisma.

```
┌──────────────────────────────────────────────────────────────┐
│ Browser                                                      │
│                                                              │
│  ┌─ App Shell (always mounted) ──────────────────────────┐  │
│  │  Sidebar  │  Topbar  │  MobileBottomNav  │  CmdPalette │  │
│  └───────────────────────────────────────────────────────┘  │
│                          │                                   │
│  ┌─ View Layer (lazy-loaded, one at a time) ─────────────┐  │
│  │  Dashboard │ Sales │ POS │ Inventory │ Parties │ ...   │  │
│  └───────────────────────────────────────────────────────┘  │
│                          │                                   │
│  ┌─ Shared Libs ─────────┴───────────────────────────────┐  │
│  │  store.ts (Zustand)  │  api.ts (fetch)  │  gst.ts     │  │
│  │  format.ts           │  auth.ts         │  audit.ts   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────┬────────────────────────────────┘
                              │  HTTP (relative URLs)
                              ▼
┌──────────────────────────────────────────────────────────────┐
│ Next.js Server (Node runtime)                                │
│  ┌─ API Routes (18) ─────────────────────────────────────┐  │
│  │  /api/business    /api/dashboard   /api/invoices      │  │
│  │  /api/parties     /api/products    /api/purchases     │  │
│  │  /api/quotations  /api/expenses    /api/payments      │  │
│  │  /api/reports     /api/gst         /api/audit         │  │
│  │  /api/notifications  /api/seed                        │  │
│  └────────────────────────┬───────────────────────────────┘  │
└───────────────────────────┼──────────────────────────────────┘
                            │  Prisma Client
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ SQLite (db/custom.db) — 22 models, 38 indexes               │
└──────────────────────────────────────────────────────────────┘
```

## 2. The Single-Route Constraint

The deployment environment exposes only `/` to end users. This forces a **client-side view-switching architecture**:

- `src/app/page.tsx` is a `'use client'` component
- It reads `view` and `viewParams` from the Zustand store
- It lazy-loads the corresponding view component via `next/dynamic`
- View switches are instant (no network round-trip)

**Trade-off:** We lose SSR/SSG benefits for view content, but gain sub-100ms navigation. This is documented in **ADR-001**.

**Code-splitting:** Each view is a separate JS chunk. The initial payload is the app shell + dashboard chunk; other views load on demand.

## 3. Layer Responsibilities

### 3.1 App Shell (`src/components/app/`)
- **Sidebar** — desktop navigation, collapsible, glass effect
- **Topbar** — search trigger, notifications, theme toggle, mobile menu
- **MobileBottomNav** — 5 thumb-friendly tabs, safe-area aware
- **CommandPalette** — ⌘K global search + quick actions
- **Onboarding** — 4-step wizard (business → industry → modules → review)

These are always mounted (except onboarding, which replaces the shell until complete).

### 3.2 View Layer (`src/components/views/`)
12 view components, one per major feature:
- `dashboard-view` — KPIs, charts, recent activity
- `sales-view` — invoice list + editor + viewer (delegates to `app/invoice-editor`, `app/invoice-viewer`)
- `pos-view` — counter billing
- `purchases-view` — supplier bills
- `inventory-view` — products, stock adjustment
- `parties-view` — customers/suppliers + statement (delegates to `app/party-statement`)
- `quotations-view` — quotes list + editor + viewer
- `expenses-view` — expense tracking
- `reports-view` — P&L, registers, day book
- `gst-view` — GSTR-1, HSN summary
- `audit-view` — activity log
- `settings-view` — business profile, modules, roles

Each view is lazy-loaded. Each fetches its own data via TanStack Query.

### 3.3 Shared Libraries (`src/lib/`)

| File | Responsibility | Purity |
|------|---------------|--------|
| `gst.ts` | GST calculation (CGST/SGST/IGST), GSTIN validation, state codes | Pure ✅ |
| `format.ts` | INR formatting, dates, amount-in-words (Indian numbering) | Pure ✅ |
| `store.ts` | Zustand app store (business context, navigation, onboarding) | Client-only |
| `nav.ts` | Navigation config (adaptive by industry/modules) | Pure ✅ |
| `api.ts` | `fetch` wrapper + `useBootstrapBusiness` hook | Client-only |
| `auth.ts` | `getActiveBusiness` (placeholder for real auth) | Server-only |
| `audit.ts` | `recordAudit` helper | Server-only |
| `db.ts` | Prisma client singleton | Server-only |
| `utils.ts` | `cn` class merge utility | Pure ✅ |

**Rule:** Pure libs (`gst`, `format`, `nav`, `utils`) must never import client-only or server-only code. This keeps them testable in isolation.

### 3.4 API Layer (`src/app/api/`)
18 REST endpoints. Each is a Next.js Route Handler. See `04_API_SPECIFICATION.md` for the full contract.

**Current gaps (from API_AUDIT):**
- No auth, no validation, no error handling, no pagination
- Phase 3 will add these

### 3.5 Database (`prisma/schema.prisma`)
22 Prisma models, 38 indexes, all entities have audit fields. See `03_DATABASE_SPECIFICATION.md`.

## 4. Data Flow

### 4.1 Read Flow (e.g., Dashboard)

```
User opens dashboard
  → Zustand store has view="dashboard"
  → page.tsx renders <DashboardView/>
  → DashboardView calls useQuery({ queryKey: ["dashboard"], queryFn: () => api("/api/dashboard") })
  → api() does fetch("/api/dashboard")
  → Next.js Route Handler runs
  → getActiveBusiness() → db.business.findFirst()
  → 14 Prisma queries via Promise.all
  → Returns { kpis, sparkline, topProducts, gstBreakdown, ... }
  → TanStack Query caches (staleTime: 30s, gcTime: 5min)
  → DashboardView renders KPI cards + recharts
```

### 4.2 Write Flow (e.g., Create Invoice)

```
User fills InvoiceEditor → clicks "Save Invoice"
  → InvoiceEditor calls api("/api/invoices", { method: "POST", body: JSON.stringify({...}) })
  → Route Handler validates (TODO: zod)
  → Computes GST via computeDocument()
  → db.invoice.create() + db.invoiceItem.createMany()
  → Decrement stock + record stock movements
  → recordAudit()
  → Returns { ok: true, invoice: { id, number } }
  → onSaved callback → queryClient.invalidateQueries(["invoices"])
  → Sales list refetches → new invoice appears
```

**Note:** No optimistic update currently. The UI blocks during the request. Phase 4 will add `useMutation` + optimistic updates.

### 4.3 Navigation Flow

```
User clicks "Sales" in sidebar
  → openView("sales") called
  → Zustand store updates: view="sales", viewParams={}
  → page.tsx re-renders
  → AnimatePresence exits old view, enters new view
  → SalesView (lazy) chunk loads (first time only)
  → SalesView mounts, useQuery fetches invoices
```

Navigation is **synchronous** (state change) — no network round-trip. The only async part is the first load of a view's JS chunk.

## 5. State Management Strategy

Three distinct state domains:

### 5.1 Server State — TanStack Query
- All API data (invoices, products, parties, etc.)
- Cache-first with stale-while-revalidate
- `staleTime: 30s`, `gcTime: 5min`, `refetchOnWindowFocus: false`
- Mutations invalidate specific query keys

### 5.2 Client UI State — Zustand (persisted)
- `business` — active business context (cached in localStorage)
- `view` + `viewParams` — current view + params
- `sidebarCollapsed`
- `commandOpen`
- `onboarded`

Persisted to `localStorage` via `persist` middleware.

### 5.3 Local Component State — useState
- Form inputs (invoice editor, dialogs)
- UI toggles (filter tabs, dropdowns)
- Not persisted

See **ADR-004** for the full state strategy.

## 6. Rendering Strategy

| Component type | Rendering | Why |
|---------------|-----------|-----|
| `src/app/page.tsx` | Client | Needs Zustand store for view switching |
| View components | Client (lazy) | Interactive, need hooks |
| App shell | Client | Interactive (sidebar, command palette) |
| `src/app/api/*` | Server (Node) | Database access |
| `src/app/layout.tsx` | Server | Fonts, metadata |
| shadcn/ui primitives | Client | Radix-based, interactive |

**Phase 4 goal:** Move more logic to Server Components where the single-route constraint allows. Likely candidates: invoice viewer print template, report renderers.

## 7. Caching Strategy

| Layer | Cache | Invalidation |
|-------|-------|--------------|
| TanStack Query | 30s stale, 5min gc | `invalidateQueries` on mutation |
| Next.js (TODO) | No `revalidate` tags currently | Phase 3 |
| HTTP (TODO) | No `Cache-Control` headers | Phase 3 |
| IndexedDB (TODO) | Not implemented | Phase 4 (offline) |
| localStorage | Zustand persisted store | Manual `setBusiness` |

## 8. Error Handling (Current — Phase 2 baseline)

| Layer | Behavior |
|-------|----------|
| API route | Prisma errors → unstructured 500 (no try/catch) |
| `api.ts` client | Throws `Error(text)` |
| View | `catch (e: any) { toast.error(e?.message) }` |
| Render | **No error boundary** — whitescreen on render error |

**Phase 3 fix:** Global `error.tsx` + per-view `ErrorBoundary` + `withErrorHandler` API wrapper.

## 9. Authentication (Current — None)

`getActiveBusiness()` returns the first business in the DB. No session, no JWT, no RBAC. See `SECURITY_AUDIT.md` and ADR-006.

**Phase 3:** NextAuth v4 with JWT strategy, Credentials + Google + Phone OTP providers.

## 10. Observability

| Aspect | Current | Target |
|--------|---------|--------|
| Logging | Prisma query log floods stdout | Structured logger (pino), query log dev-only |
| Error tracking | None | Sentry |
| Analytics | None | PostHog (product) + Vercel Analytics |
| Request IDs | None | `x-request-id` middleware |
| Uptime | None | UptimeRobot |

## 11. Deployment

- **Dev:** `bun run dev` (Turbopack, port 3000)
- **Build:** `bun run build` → standalone output
- **Start:** `bun run start` → serves standalone build
- **DB:** SQLite file at `db/custom.db` (single volume mount in prod)
- **Reverse proxy:** Caddy (provided by environment)

**Production checklist (Phase 3+):**
- [ ] HTTPS via Caddy
- [ ] `NEXTAUTH_SECRET` set
- [ ] Prisma query log disabled
- [ ] `typescript.ignoreBuildErrors: false`
- [ ] Rate limiting enabled
- [ ] Backup cron for SQLite file

## 12. Cross-Cutting Concerns

| Concern | Owner | Doc |
|---------|-------|-----|
| GST correctness | `src/lib/gst.ts` | `11_GST_ENGINE.md` |
| Inventory correctness | `src/app/api/products` + `StockMovement` | `12_INVENTORY_ENGINE.md` |
| Accounting correctness | `src/app/api/reports` + `api/payments` | `13_ACCOUNTING_ENGINE.md` |
| Design system | `src/app/globals.css` + shadcn/ui | `05_DESIGN_SYSTEM.md` |
| Component library | `src/components/ui/` + `src/components/app/` | `06_COMPONENT_LIBRARY.md` |
| Security | `src/lib/auth.ts` (TODO) | `15_SECURITY_GUIDE.md` |
| Performance | All layers | `14_PERFORMANCE_GUIDE.md` |

## 13. Architectural Decisions

All significant decisions are recorded as ADRs in `/docs/architecture_decisions/`. Key decisions:

- **ADR-001:** Next.js 16 with single-route SPA (constraint-driven)
- **ADR-002:** Prisma ORM for type-safe DB access
- **ADR-003:** SQLite for MSME-scale simplicity
- **ADR-004:** Zustand + TanStack Query state split
- **ADR-005:** REST-ish API (not tRPC/GraphQL)
- **ADR-006:** NextAuth JWT (planned)
- **ADR-007:** Feature-first folder structure
- **ADR-008:** Performance budget + virtualization strategy
- **ADR-009:** Offline-first via IndexedDB (planned)
- **ADR-010:** Vitest + Playwright testing strategy

See each ADR for context, alternatives, and consequences.
