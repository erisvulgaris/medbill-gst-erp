# MedBill — Performance Report

> **Audit date:** 2026-06-29
> **Methodology:** Static analysis + dev-server measurement + architecture review
> **Targets (from PRD):** 120 FPS scrolling, <100 ms interactions, <150 KB critical JS, zero unnecessary re-renders

## Executive Summary

MedBill's **client-side architecture is sound** (code-splitting, lazy views, GPU-accelerated animations), but several stated performance targets are **not yet met**:

| Target | Status | Evidence |
|--------|--------|----------|
| 120 FPS scrolling | ❌ Not met | No list virtualization; large lists will jank |
| <100 ms interactions | 🟡 Partial | View switches are instant; mutations block (no optimistic updates) |
| <150 KB critical JS | ❌ Unknown | No bundle analyzer; recharts alone is ~400 KB |
| Zero unnecessary re-renders | 🟡 Partial | 27 memo hooks; some gaps (topbar polling, dashboard charts) |
| Virtualized lists | ❌ Not done | `@tanstack/react-virtual` not installed |
| Optimistic updates | ❌ Not done | All mutations block UI |
| Server Components by default | ⚠️ Trade-off | Single-route SPA forces client-side (ADR-001) |
| Web Workers for heavy tasks | ❌ Not done | GST calc runs on main thread (acceptable — <1ms) |
| IndexedDB cache | ❌ Not done | |
| Background sync | ❌ Not done | |

---

## 1. Bundle Size

### 1.1 Current State — Unmeasured

No `@next/bundle-analyzer` configured. No `.next/analyze` output.

**Heavy dependencies (estimated unminified):**
| Package | Est. size | Used in |
|---------|-----------|---------|
| recharts | ~400 KB | dashboard, reports |
| framer-motion | ~100 KB | 20 components |
| @radix-ui/* (many) | ~150 KB total | all shadcn primitives |
| @tanstack/react-query | ~40 KB | data fetching |
| react + react-dom | ~140 KB | everywhere |
| lucide-react | tree-shaken | icons |
| cmdk | ~20 KB | command palette |
| zod | ~60 KB | **unused** — remove or use |

**Estimated first-load JS:** ~300-400 KB (dashboard route), ~200 KB (other routes).

### 1.2 Required
1. Install `@next/bundle-analyzer`
2. Add `"analyze": "ANALYZE=true next build"` script
3. Run baseline measurement
4. Set budget: <150 KB initial JS for dashboard route
5. Consider replacing recharts with lightweight SVG charts for dashboard sparklines

---

## 2. Core Web Vitals

### 2.1 Current State — Unmeasured

No Lighthouse CI, no `web-vitals` package, no RUM.

**Estimated (from architecture):**
| Metric | Estimate | Reasoning |
|--------|----------|-----------|
| LCP (Largest Contentful Paint) | ~1.5-2.5s | Single-route SPA loads `page.tsx` (client), then bootstraps business, then renders dashboard |
| FID/INP (Interaction to Next Paint) | ~50-100ms | View switches are instant (state change); mutations block |
| CLS (Cumulative Layout Shift) | ~0.05 | Skeletons prevent layout shift; `suppressHydrationWarning` on theme |
| TTFB | ~20ms | Local dev; production depends on host |

### 2.3 Required
1. Add `web-vitals` package + report to analytics
2. Run Lighthouse CI in GitHub Actions
3. Target: LCP <2.5s, INP <200ms, CLS <0.1

---

## 3. Render Performance

### 3.1 React Render Counts — Unmeasured

No React DevTools profiler data captured. **Architecture review:**

**Likely re-render sources:**
- `topbar.tsx`: `setInterval(loadNotifs, 60000)` → re-renders topbar every 60s (minor)
- `dashboard-view.tsx`: `useQuery` refetches every 60s (`refetchInterval: 60_000`) → full dashboard re-render
- `invoice-editor.tsx`: `computeDocument` runs on every keystroke → re-renders totals panel (acceptable, must be live)
- `pos-view.tsx`: cart `setCart` on every product tap → re-renders cart list (acceptable)

### 3.2 Memoization Gaps

27 `useMemo`/`useCallback` usages — good coverage but:
- `dashboard-view` `ChartTooltip` is defined inline → re-created every render
- `invoice-viewer` `CollectPaymentDialog` is defined inline → re-created
- Inline function props on shadcn components may cause re-renders

**Fix:** Move inline sub-components to module scope. Wrap expensive transforms in `useMemo`.

### 3.3 Virtualization — Critical Gap

**Inventory view** renders all products in a `<tbody>`. With 500+ products:
- Initial render: ~50ms per 100 rows → 250ms for 500
- Scroll: browser reflows entire table → jank

**Fix:**
```tsx
import { useVirtualizer } from "@tanstack/react-virtual";

const rowVirtualizer = useVirtualizer({
  count: products.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 56,
});
```

Apply to: inventory list, invoice list, party list, audit log.

---

## 4. Network Performance

### 4.1 API Call Audit

| View | API calls on mount | Refetch |
|------|-------------------|---------|
| Dashboard | 1 (`/api/dashboard`) → runs 14 queries | every 60s |
| Sales | 1 (`/api/invoices`) | on invalidate |
| Inventory | 1 (`/api/products` — returns products+units+taxes+categories) | on invalidate |
| Parties | 1 (`/api/parties`) | on invalidate |
| POS | 1 (`/api/products`) — no cap! | on type |
| Reports | 1 (`/api/reports`) | on filter change |
| GST | 1 (`/api/gst`) | on date change |
| Topbar | 1 (`/api/notifications`) every 60s | polling |

### 4.2 N+1 Queries

**Dashboard `/api/dashboard`** has an N+1 in the 14-day sparkline:
```ts
for (let i = 13; i >= 0; i--) {
  const dayInvoices = await db.invoice.findMany({ where: { ... } });
  const dayReceipts = await db.payment.findMany({ where: { ... } });
}
```
**14 iterations × 2 queries = 28 queries** for the sparkline alone.

**Fix:** Single `groupBy`:
```ts
const daily = await db.invoice.groupBy({
  by: ["invoiceDate"],
  where: { businessId, invoiceDate: { gte: last14days } },
  _sum: { grandTotal: true },
});
```

### 4.3 Over-fetching

**`GET /api/products`** returns `{ items, units, taxes, categories }` — 4 collections in one response. The POS view only needs `items`. This over-fetches on every POS mount.

**Fix:** Split into separate endpoints or accept the trade-off (one round-trip vs four).

### 4.4 No Pagination

See `API_AUDIT.md` §5. `GET /api/products` and `GET /api/parties` return all rows.

---

## 5. Animation Performance ✅

- All framer-motion animations use `transform` + `opacity` ✅
- `gpu` utility class (`translateZ(0)`, `will-change: transform`) applied ✅
- `layout` animations on sidebar active state (can be expensive but fine at 12 items)
- `prefers-reduced-motion` respected in `globals.css` ✅
- No layout thrashing (no `offsetWidth` reads in loops)

**Verdict:** Animation performance meets the 120fps target for current scale.

---

## 6. Memory

### 6.1 Current State
- No memory leaks detected in code review
- `setInterval` in `topbar.tsx` is properly cleaned up (`return () => clearInterval(t)`) ✅
- React Query caches are gc'd (`gcTime: 5 * 60_000`) ✅

### 6.2 Risk: Large Lists
Without virtualization, a 1000-row product list creates 1000 DOM nodes, each ~1KB → ~1MB DOM memory. At 5000 rows, this becomes a problem.

---

## 7. Optimization Priority

| Priority | Optimization | Expected Impact |
|----------|-------------|-----------------|
| P0 | Disable Prisma query logging in production | -20% API latency, less I/O |
| P0 | Fix dashboard N+1 sparkline (28 queries → 1) | -200ms dashboard load |
| P1 | Add `@tanstack/react-virtual` to inventory/invoice/party lists | 120fps scroll at 5000 rows |
| P1 | Add optimistic updates to POS checkout & invoice save | <100ms perceived interaction |
| P1 | Add `@next/bundle-analyzer` + set budget | measurable JS size |
| P2 | Replace recharts sparklines with custom SVG | -300 KB from dashboard chunk |
| P2 | Pause notification polling when tab hidden | -60 requests/hour background |
| P2 | Add cursor pagination to list endpoints | -90% payload on large lists |
| P3 | Move inline sub-components to module scope | fewer re-renders |
| P3 | Add `web-vitals` reporting | measurable CWV |

---

## 8. Performance Budget (Proposed)

| Metric | Budget | Current |
|--------|--------|---------|
| Initial JS (dashboard) | <200 KB | ~300-400 KB (est.) |
| Initial JS (other routes) | <150 KB | ~200 KB (est.) |
| LCP | <2.5s | ~2s (est.) |
| INP | <200ms | ~100ms (est.) |
| API response (p95) | <200ms | ~50ms (local) |
| Dashboard queries | <10 | 14+28=42 |

---

**This report feeds into `14_PERFORMANCE_GUIDE.md` and `19_BACKLOG.md`.**
