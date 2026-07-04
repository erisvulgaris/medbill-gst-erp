# Dependency Graph

> **Audit date:** 2026-06-30
> **Method:** Static import analysis via grep
> **Scope:** `src/` only (excludes `node_modules`, `.next`)

## 1. Module Layering

MedBill's dependency graph follows strict layering. Lower layers never import from higher layers.

```
Layer 4: App Router (src/app/)
  ├── page.tsx, layout.tsx, error.tsx
  └── api/**/route.ts
        │
        ▼
Layer 3: App Components (src/components/app/)
  ├── sidebar, topbar, views, editors
  └── error-boundary, theme-provider, query-provider
        │
        ▼
Layer 2: Shared Libs (src/lib/)
  ├── store.ts (client)     ← imports nav.ts
  ├── api.ts (client)       ← imports store.ts (dynamic)
  ├── api-error.ts (server) ← standalone
  ├── auth.ts (server)      ← imports db.ts
  ├── audit.ts (server)     ← imports db.ts
  ├── db.ts (server)        ← imports @prisma/client
  └── schemas/ (shared)     ← imports zod
        │
        ▼
Layer 1: Pure Libs (src/lib/)
  ├── gst.ts      ← no internal imports
  ├── format.ts   ← no internal imports
  ├── nav.ts      ← imports store.ts (types only)
  └── utils.ts    ← no internal imports
```

## 2. Import Statistics

| Layer | Imports | Files | Avg imports/file |
|-------|---------|-------|-----------------|
| App Router (API) | ~45 | 18 | 2.5 |
| App Router (pages) | 8 | 4 | 2 |
| App Components | ~90 | 10 | 9 |
| Views | ~120 | 12 | 10 |
| UI Primitives | ~50 | 48 | 1 |
| Shared Libs | ~15 | 9 | 1.7 |
| Pure Libs | 0 | 4 | 0 |

## 3. Circular Dependencies

**None detected.** Verified via import analysis:
- `gst.ts`, `format.ts`, `utils.ts` — zero internal imports ✅
- `nav.ts` — imports only `store.ts` types (no runtime import) ✅
- `store.ts` — imports nothing internal (only `zustand`) ✅
- `api.ts` — dynamically imports `store.ts` (no cycle) ✅
- `auth.ts` → `db.ts` → `@prisma/client` (no cycle) ✅
- `audit.ts` → `db.ts` (no cycle) ✅

## 4. Key Dependency Chains

### 4.1 Invoice Creation Flow
```
page.tsx
  → views/sales-view.tsx
    → app/invoice-editor.tsx
      → lib/api.ts (POST /api/invoices)
      → lib/gst.ts (computeDocument)
      → lib/format.ts (formatINR)
      → lib/store.ts (openView)
      → components/ui/* (Dialog, Input, Button)
```

### 4.2 API Request Flow
```
app/api/invoices/route.ts
  → lib/auth.ts (getActiveBusiness)
    → lib/db.ts (Prisma)
  → lib/gst.ts (computeLine, computeDocument)
  → lib/audit.ts (recordAudit)
    → lib/db.ts
  → lib/api-error.ts (TODO: apiHandler)
```

### 4.3 State Management Flow
```
components/app/sidebar.tsx
  → lib/store.ts (useAppStore)
  → lib/nav.ts (visibleNavItems)
    → lib/store.ts (types only)
```

## 5. External Dependencies (Top 15)

| Package | Import Count | Used For |
|---------|-------------|----------|
| `react` | ~60 | Components, hooks |
| `lucide-react` | ~45 | Icons |
| `@/lib/utils` (cn) | ~40 | Class merging |
| `framer-motion` | ~20 | Animations |
| `@/components/ui/*` | ~80 | shadcn primitives |
| `@tanstack/react-query` | ~25 | Data fetching |
| `next/dynamic` | 12 | Code splitting |
| `sonner` | ~15 | Toasts |
| `recharts` | ~10 | Charts |
| `zod` | 1 | Schemas (lib/schemas/) |
| `@prisma/client` | 18 | Database (API routes) |
| `next-themes` | 2 | Dark mode |
| `cmdk` | 1 | Command palette |
| `react-hook-form` | 0 | NOT USED (installed but unused) |
| `next-auth` | 0 | NOT USED (installed but unused) |

## 6. Dead External Dependencies

| Package | Status | Recommendation |
|---------|--------|---------------|
| `react-hook-form` | Installed, 0 usages | Remove or use in forms |
| `next-auth` | Installed, 0 usages | Keep for Phase 4 auth |
| `@dnd-kit/*` (3 packages) | Installed, 0 usages | Remove (no drag-drop) |
| `@mdxeditor/editor` | Installed, 0 usages | Remove |
| `embla-carousel-react` | Installed, 0 usages | Remove |
| `react-syntax-highlighter` | Installed, 0 usages | Remove |
| `react-resizable-panels` | Installed, 0 usages | Remove |
| `react-markdown` | Installed, 0 usages | Remove |
| `input-otp` | Installed, 0 usages | Keep (may use for OTP) |
| `@reactuses/core` | Installed, 0 usages | Remove |

**Potential bundle savings:** ~200-300 KB by removing unused dependencies.

## 7. Internal Module Coupling

### 7.1 Most-Imported Internal Modules
| Module | Imported by | Count |
|--------|-------------|-------|
| `@/lib/utils` (cn) | All components | ~40 |
| `@/lib/format` | Views, app components | ~15 |
| `@/lib/store` | App shell, views | ~12 |
| `@/lib/api` | Views, app components | ~10 |
| `@/lib/gst` | Invoice/quotation editors, API | ~6 |
| `@/components/ui/*` | All components | ~80 |

### 7.2 Tightly Coupled Components
- `invoice-editor.tsx` ↔ `invoice-viewer.tsx` — share line item types but not code (duplication)
- `quotation-editor.tsx` ↔ `invoice-editor.tsx` — 70% similar structure (extract `DocumentEditor`)

## 8. Recommended Refactoring

### 8.1 Extract Shared Components
- `StatusBadge` (used in 3 files) → `src/components/app/status-badge.tsx`
- `StatCard` (used in 7 files) → `src/components/app/stat-card.tsx`
- `Field` (used in 4 files) → `src/components/app/field.tsx`
- `DocumentEditor` (shared by invoice/quotation editors)

### 8.2 Split Oversized Files
| File | LOC | Split into |
|------|-----|-----------|
| `invoice-viewer.tsx` | 521 | `invoice-viewer.tsx` + `collect-payment-dialog.tsx` |
| `dashboard-view.tsx` | 443 | `dashboard-view.tsx` + `dashboard-charts.tsx` + `dashboard-kpi.tsx` |
| `invoice-editor.tsx` | 440 | `invoice-editor.tsx` + `invoice-line-table.tsx` |
| `onboarding.tsx` | 403 | `onboarding.tsx` + `onboarding-steps/` |
| `inventory-view.tsx` | 401 | `inventory-view.tsx` + `product-form-dialog.tsx` + `stock-adjust-dialog.tsx` |
| `seed/route.ts` | 456 | `seed/business.ts` + `seed/products.ts` + `seed/invoices.ts` |

### 8.3 Remove Dead Dependencies
- `bun remove @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
- `bun remove @mdxeditor/editor embla-carousel-react react-syntax-highlighter`
- `bun remove react-resizable-panels react-markdown @reactuses/core`

---

**This graph is generated from actual import statements. No circular dependencies exist. 10 unused external dependencies identified for removal.**
