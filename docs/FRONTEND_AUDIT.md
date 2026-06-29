# MedBill — Frontend Audit Report

> **Audit date:** 2026-06-29
> **Stack:** Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui (New York), framer-motion, recharts, TanStack Query
> **Components:** 62 client components, 12 views, 10 app-shell components

## Executive Summary

The frontend is **visually polished and functionally complete** for Phase 1, with a premium emerald design system, responsive layouts, and good testability hooks (`data-testid` on 66 elements). However, it suffers from **over-clientification** (62 `'use client'` files where Server Components could serve), **no error boundaries**, **duplicated patterns**, and **inconsistent data-fetching** (React Query vs hand-rolled `useEffect`).

| Severity | Finding |
|----------|---------|
| 🔴 Critical | **No error boundaries** — a single render error whitescreens the app |
| 🟠 High | **62 client components** — most could be server components or have client logic extracted to hooks |
| 🟠 High | **Inconsistent data fetching** — `invoice-viewer` & `quotation-viewer` use `useEffect`, rest use React Query |
| 🟠 High | **3 hardcoded identity references** — "Rahul", "owner@balajitraders.in" in components |
| 🟡 Medium | **Duplicated `StatusBadge`, `StatCard`, `Field` components** across 6+ views |
| 🟡 Medium | **No virtualization** on lists (stated 120fps goal unmet) |
| 🟡 Medium | **27 memoization hooks** but applied inconsistently — some expensive renders un-memoized |
| 🟢 Low | **Minor spacing/typography variance** between views |

---

## 1. Component Architecture

### 1.1 Client vs Server Components

**62 files** have `'use client'`. Only 1 server component exists (`src/app/api/route.ts` health check). The root `page.tsx` is `'use client'` — which forces the entire view tree to be client-side.

**Impact:**
- No SSR benefits for initial paint
- No streaming/RSC payload optimization
- All view JS ships to client (mitigated by `next/dynamic` code-splitting ✅)

**Root cause:** The single-route SPA constraint (only `/` is user-visible) requires client-side view switching via Zustand, so `page.tsx` must be a client component. This is an architectural trade-off documented in ADR-001.

**Within that constraint, improvements:**
- View components could be server components that fetch initial data, passing to client islands for interactivity
- But the Zustand `view` switching model precludes this
- **Accepted** — document in ADR-004

### 1.2 Duplicated Components

| Pattern | Duplicated in | Count |
|---------|---------------|-------|
| `StatusBadge` / `StatusPill` | dashboard, sales, quotations, reports | 4 |
| `StatCard` (icon+label+value) | inventory, parties, purchases, expenses, reports, audit, quotations | 7 |
| `Field` (label+children wrapper) | inventory, parties, settings, invoice-editor, quotation-editor | 5 |
| `Row` (label+value) | invoice-viewer, reports, quotation-viewer | 3 |
| `Legend` | dashboard | 1 (ok) |

**Fix:** Extract to `src/components/app/`:
- `status-badge.tsx` — shared status→color map
- `stat-card.tsx` — `<StatCard icon={X} label="..." value="..." accent="emerald" />`
- `field.tsx` — `<Field label="..." required hint="...">{children}</Field>`

Estimated LOC reduction: ~400.

### 1.3 Oversized Components

| File | LOC | Issue |
|------|-----|-------|
| `invoice-viewer.tsx` | 521 | Viewer + `CollectPaymentDialog` + `useInvoice` hook inline |
| `dashboard-view.tsx` | 443 | 6 sub-components + chart configs inline |
| `invoice-editor.tsx` | 440 | Editor + line table + totals + pickers inline |
| `onboarding.tsx` | 403 | 4 steps + form state + module config inline |
| `inventory-view.tsx` | 401 | List + `ProductFormDialog` + `StockAdjustDialog` inline |
| `reports-view.tsx` | 329 | 5 report renderers inline |

**Fix:** Split each into a directory:
```
inventory-view/
  index.tsx (list)
  product-form-dialog.tsx
  stock-adjust-dialog.tsx
```

---

## 2. Data Fetching Inconsistency

### 2.1 React Query (good) — 25 usages
Used in: `dashboard-view`, `sales-view`, `inventory-view`, `parties-view`, `purchases-view`, `expenses-view`, `quotations-view`, `reports-view` (manual), `audit-view`, `topbar` (notifications).

### 2.2 Hand-rolled `useEffect` (bad) — 2 usages
- `invoice-viewer.tsx` — `useInvoice` hook with `useState` + `useEffect`
- `quotation-viewer.tsx` — same pattern

**Why this is bad:**
- No cache (navigating away and back refetches)
- No deduplication
- No refetch-on-window-focus
- No stale-while-revalidate
- Inconsistent with the rest of the app

**Fix:** Convert both to `useQuery`:
```ts
const { data, isLoading, refetch } = useQuery({
  queryKey: ["invoice", invoiceId],
  queryFn: () => api(`/api/invoices/${invoiceId}`),
});
```

### 2.3 Inline `api()` calls in event handlers (acceptable)
Dialog forms (expense, purchase, invoice create) call `api()` directly in `onSubmit` handlers, then `queryClient.invalidateQueries()`. This is the correct pattern for mutations until a `useMutation` is added.

---

## 3. State Management

### 3.1 Zustand Store (`src/lib/store.ts`)
- Single store for: `business`, `view`, `viewParams`, `sidebarCollapsed`, `commandOpen`, `onboarded`
- Persisted to `localStorage` via `persist` middleware
- **Issue:** `business` is cached in localStorage but also fetched from server on boot. If the server business is updated (e.g., via Settings on another device), the localStorage copy is stale until `setBusiness` is called.
- **Issue:** `viewParams` is `Record<string, unknown>` — every consumer casts. Should be a discriminated union.

**Fix:**
```ts
type ViewParams =
  | { view: "dashboard" | "pos" | "purchases" | "inventory" | "expenses" | "reports" | "gst" | "audit" | "settings"; params: {} }
  | { view: "sales"; params: { action?: "new" | "view"; id?: string } }
  | { view: "parties"; params: { action?: "new" | "view"; id?: string } }
  | { view: "quotations"; params: { action?: "new" | "view"; id?: string } };
```

### 3.2 No Optimistic Updates
All mutations block the UI:
- POS checkout: spinner + disabled button for ~500ms
- Invoice save: spinner + disabled button
- Expense add: spinner + disabled button

**Fix:** Use `useMutation` with `onMutate` optimistic update + `onError` rollback.

### 3.3 Notification Polling
`topbar.tsx` polls `/api/notifications` every 60s unconditionally:
```ts
React.useEffect(() => {
  loadNotifs();
  const t = setInterval(loadNotifs, 60000);
  return () => clearInterval(t);
}, [loadNotifs]);
```
**Issue:** Runs when tab is hidden. **Fix:** Use `document.visibilityState` or `react-query`'s `refetchIntervalInBackground: false`.

---

## 4. Performance

### 4.1 Code Splitting ✅
All 12 views lazy-loaded via `next/dynamic` in `page.tsx`:
```ts
const DashboardView = dynamic(() => import("@/components/views/dashboard-view").then(m => m.DashboardView), { ssr: false, loading: () => <ViewSkeleton /> });
```
Good. Each view is a separate chunk.

### 4.2 Virtualization ❌
**No `@tanstack/react-virtual` usage.** All lists render every row:
- Invoice list: up to 100 rows
- Product list: up to 1000+ rows (no cap on `GET /api/products`)
- Party list: all parties

**Impact:** At 500+ products, the inventory table will jank on scroll.

**Fix:** Install `@tanstack/react-virtual` and wrap large `<tbody>`/card lists. See ADR-008.

### 4.3 Re-renders
- 27 `useMemo`/`useCallback` usages — good but inconsistent
- `dashboard-view` recomputes `gstBreakdown` map on every render (no `useMemo`) — actually it's in the API response, so OK
- `invoice-editor` `computeDocument` runs on every keystroke — **acceptable** (must be live) but could debounce
- Topbar re-renders every 60s on notification poll — fine

### 4.4 Animation Performance ✅
- All animations use `transform` + `opacity` (via framer-motion) ✅
- `gpu` utility class applied to animated elements ✅
- `motion` `layout` animations on sidebar active state — can be expensive with many siblings, but fine at 12 nav items

### 4.5 Bundle Size
- No bundle analyzer configured
- recharts is heavy (~400KB unminified) — only used in dashboard & reports
- framer-motion ~100KB
- shadcn primitives tree-shake well

**Fix:** Add `@next/bundle-analyzer` and a `analyze` script. Consider replacing recharts with a lighter chart lib (e.g., `tremor` or custom SVG) if bundle is a concern.

---

## 5. Loading & Error States

### 5.1 Loading States ✅ (mostly)
- 32 `Skeleton` usages across views
- `ViewSkeleton` fallback for lazy-loaded views
- Topbar notifications sheet shows skeletons

**Inconsistency:** `invoice-viewer` and `quotation-viewer` show a single `Skeleton` block instead of structured skeletons matching the layout.

### 5.2 Error States ❌
- **0 error boundaries** in the entire app
- No `error.tsx` at the app or route level
- A single thrown error in any view whitescreens the page
- API errors are caught locally (`toast.error`) but render errors are not

**Fix (critical):**
1. Add `src/app/error.tsx` (global app boundary)
2. Add `src/app/global-error.tsx` (root boundary)
3. Wrap each lazy view in a client `ErrorBoundary` component
4. Show a "Something went wrong. Reload." UI with error details in dev

### 5.3 Empty States ✅
Every list view has a designed empty state with icon + message + CTA. Good.

---

## 6. Accessibility

### 6.1 Current State
- 23 `aria-label` / `role=` attributes (mostly on icon buttons)
- 66 `data-testid` attributes (good for testing)
- shadcn/ui primitives are accessible by default (Radix-based)
- `data-testid` on key interactive elements ✅

### 6.2 Gaps
- Custom buttons in dashboard KPI cards lack `role="button"` (they're `<button>` so OK)
- Color-only status indicators (paid=green, unpaid=amber) — colorblind users can't distinguish. **Fix:** Add icons (already done in `StatusBadge` ✅) or text labels
- No skip-to-content link
- No focus-visible ring on custom-styled selects in `invoice-editor` (the `<select>` element)
- Modal dialogs: Radix handles focus trap ✅
- Keyboard navigation: sidebar nav is keyboard-accessible ✅

### 6.3 Required
- Add `@axe-core/playwright` to CI
- Run Lighthouse a11y audit (target 95+)
- Add `aria-live` to toast region
- Add `lang="en"` (already in `<html>`)
- Add `sr-only` labels to icon-only buttons (some have `aria-label` ✅)

---

## 7. Design System Consistency

### 7.1 Color ✅
- Emerald primary, no indigo/blue (per constraint) ✅
- Consistent accent palette: emerald (success), amber (warning), red (destructive), purple (info)
- Dark mode fully supported ✅
- CSS variables defined in `globals.css`

### 7.2 Typography ✅
- Geist Sans + Geist Mono
- Consistent size scale: `text-[10.5px]`, `[11.5px]`, `[12.5px]`, `[13px]`, `[14px]`, `[15px]`, `[18px]`, `[22px]`
- `tnum` class for tabular numerals on finance figures ✅

**Minor inconsistency:** Some views use `text-sm` (14px) while others use `text-[13px]`. Standardize on the bracket notation for non-standard sizes.

### 7.3 Spacing ✅
- Consistent `p-4`/`p-5`/`p-6` on cards
- `gap-3`/`gap-4` on grids
- `space-y-5` on page containers

### 7.4 Shadows ✅
- `shadow-soft`, `shadow-card`, `shadow-float`, `shadow-glow-emerald` — well-defined
- Applied consistently

### 7.5 Animation ✅
- framer-motion `motion.div` with `initial`/`animate`/`exit`
- Layout animations on active nav (`layoutId`)
- Stagger on lists (`delay: i * 0.02`)
- `prefers-reduced-motion` respected in `globals.css` ✅

---

## 8. Hardcoded Values

**3 occurrences** of hardcoded user/business identity in components:
- `dashboard-view.tsx`: `Welcome back, Rahul 👋` and `greeting, Rahul`
- `topbar.tsx`: none found in audit (uses `business.name`)
- `invoice-viewer.tsx`: none

**Fix:** `dashboard-view` should use `business?.ownerName` or a user context. The "Rahul" name is the seeded owner — should come from auth.

---

## 9. Hydration Safety

- `useAppStore` uses `persist` with `createJSONStorage(() => localStorage)` — **hydration-safe** because the store reads localStorage only on client
- `ThemeProvider` (next-themes) uses `suppressHydrationWarning` on `<html>` ✅
- `Topbar` theme toggle uses `mounted` guard ✅
- No `Date.now()` or `Math.random()` in render (would cause hydration mismatch)

**No hydration issues detected.** ✅

---

## 10. Remediation Checklist

| Priority | Item | Effort |
|----------|------|--------|
| P0 | Add `error.tsx` + `global-error.tsx` boundaries | S |
| P0 | Wrap each lazy view in client `ErrorBoundary` | S |
| P1 | Extract `StatusBadge`, `StatCard`, `Field` shared components | M |
| P1 | Convert `useInvoice`/`useQuotation` to React Query | S |
| P1 | Replace hardcoded "Rahul" with auth user context | S |
| P1 | Add `@tanstack/react-virtual` to inventory & invoice lists | M |
| P2 | Type `viewParams` as discriminated union | S |
| P2 | Add `useMutation` + optimistic updates for POS/invoice | M |
| P2 | Pause notification polling when tab hidden | XS |
| P2 | Add `@next/bundle-analyzer` + audit bundle | S |
| P3 | Standardize `text-sm` vs `text-[13px]` | XS |
| P3 | Add skip-to-content link + `aria-live` toasts | XS |

---

**This audit feeds into `05_DESIGN_SYSTEM.md`, `06_COMPONENT_LIBRARY.md`, and `14_PERFORMANCE_GUIDE.md`.**
