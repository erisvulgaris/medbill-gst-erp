# 14 — Performance Guide

> **Status:** Source of truth for performance practices
> **Related:** `PERFORMANCE_REPORT.md`, ADR-008, `05_DESIGN_SYSTEM.md`

## 1. Performance Budgets

| Metric | Budget | Current | Status |
|--------|--------|---------|--------|
| Initial JS (dashboard) | <200 KB | ~300-400 KB (est.) | ❌ Over |
| Initial JS (other routes) | <150 KB | ~200 KB (est.) | ❌ Over |
| LCP (Largest Contentful Paint) | <2.5s | ~2s (est.) | ✅ Met |
| INP (Interaction to Next Paint) | <200ms | ~100ms (est.) | ✅ Met |
| CLS (Cumulative Layout Shift) | <0.1 | ~0.05 | ✅ Met |
| API p95 latency | <200ms | ~50ms (local) | ✅ Met |
| Dashboard queries | <10 | 4 (after N+1 fix) | ✅ Met |
| View switch latency | <16ms (1 frame) | <5ms | ✅ Met |

## 2. Measurement

### 2.1 Lighthouse CI (planned)
```bash
bun run lhci
```
Config: `lighthouserc.json`
- Performance >90
- Accessibility >95
- Best Practices >90
- SEO >90

### 2.2 Bundle Analyzer (planned)
```bash
ANALYZE=true bun run build
```
Opens `@next/bundle-analyzer` visualization.

### 2.3 Web Vitals (planned)
```ts
import { useReportWebVitals } from "next/web-vitals";
useReportWebVitals((metric) => {
  // Send to analytics
});
```

## 3. Code Splitting ✅

All 12 views are lazy-loaded via `next/dynamic`:
```ts
const DashboardView = dynamic(
  () => import("@/components/views/dashboard-view").then(m => m.DashboardView),
  { ssr: false, loading: () => <ViewSkeleton /> }
);
```

- Each view is a separate JS chunk
- Initial payload: app shell + dashboard chunk
- Other views load on demand
- `ssr: false` because views are client components (ADR-001)

## 4. List Virtualization (Phase 4)

### 4.1 When to Virtualize
Any list with >50 rows must use `@tanstack/react-virtual`:
- Inventory product list
- Invoice list
- Party list
- Audit log

### 4.2 Pattern
```tsx
import { useVirtualizer } from "@tanstack/react-virtual";

function VirtualizedInvoiceList({ invoices }) {
  const parentRef = useRef(null);
  const virtualizer = useVirtualizer({
    count: invoices.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56, // row height
    overscan: 5,
  });

  return (
    <div ref={parentRef} style={{ height: "100%", overflow: "auto" }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((vi) => (
          <div key={vi.key} style={{ position: "absolute", top: vi.start, height: vi.size }}>
            <InvoiceRow invoice={invoices[vi.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 4.3 Benefit
- 5000 rows → only ~20 DOM nodes rendered
- 120fps scroll maintained
- Memory: ~1MB vs ~50MB

## 5. Optimistic Updates (Phase 4)

### 5.1 Pattern
```ts
const mutation = useMutation({
  mutationFn: (newInvoice) => api("/api/invoices", { method: "POST", body: JSON.stringify(newInvoice) }),
  onMutate: async (newInvoice) => {
    await queryClient.cancelQueries({ queryKey: ["invoices"] });
    const previous = queryClient.getQueryData(["invoices"]);
    queryClient.setQueryData(["invoices"], (old) => ({ ...old, items: [newInvoice, ...old.items] }));
    return { previous };
  },
  onError: (err, newInvoice, context) => {
    queryClient.setQueryData(["invoices"], context.previous); // rollback
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
  },
});
```

### 5.2 Where to Apply
- POS checkout (perceived instant)
- Invoice save
- Expense add
- Stock adjustment

## 6. Query Optimization

### 6.1 N+1 Prevention
**Never** loop with `await` inside:
```ts
// ❌ N+1 — 28 queries
for (let i = 0; i < 14; i++) {
  const dayInvoices = await db.invoice.findMany({ where: { ... } });
}

// ✅ Single query + JS bucketing
const allInvoices = await db.invoice.findMany({ where: { date: { gte: start } } });
const byDay = new Map();
for (const inv of allInvoices) { /* bucket */ }
```

### 6.2 Promise.all for Independent Queries
```ts
const [invoices, parties, products] = await Promise.all([
  db.invoice.findMany(...),
  db.party.findMany(...),
  db.product.findMany(...),
]);
```

### 6.3 Select Only Needed Fields
```ts
// ✅ Fast — only fetches what's needed
db.invoice.findMany({ select: { id: true, number: true, grandTotal: true } });

// ❌ Slow — fetches all columns
db.invoice.findMany();
```

### 6.4 Use groupBy for Aggregations
```ts
const daily = await db.invoice.groupBy({
  by: ["invoiceDate"],
  where: { businessId, invoiceDate: { gte: start } },
  _sum: { grandTotal: true },
});
```

## 7. Caching

### 7.1 TanStack Query
```ts
const { data } = useQuery({
  queryKey: ["invoices", search, status],
  queryFn: () => api("/api/invoices?q=" + search),
  staleTime: 30_000,    // 30s before refetch
  gcTime: 5 * 60_000,   // 5min before garbage collect
  refetchOnWindowFocus: false,
});
```

### 7.2 Cache Invalidation
After mutations:
```ts
queryClient.invalidateQueries({ queryKey: ["invoices"] });
queryClient.invalidateQueries({ queryKey: ["dashboard"] }); // if affects KPIs
```

### 7.3 HTTP Cache (planned)
- `Cache-Control: private, max-age=30, stale-while-revalidate=60` on list GETs
- `ETag` for single resource GETs

## 8. Rendering Strategy

### 8.1 Current (Single-Route SPA)
- `page.tsx` is `'use client'` (required for Zustand view switching)
- All views are client components (lazy-loaded)
- App shell is always mounted

### 8.2 Trade-off
- ❌ No SSR for view content (initial paint requires JS)
- ✅ Sub-16ms navigation (state change, no network)
- ✅ Code-split per view

### 8.3 Server Components (Phase 5)
Move read-only heavy components to RSC where possible:
- Invoice viewer print template
- Report renderers
- Party statement

## 9. Animation Performance ✅

### 9.1 Rules
- **Transform + opacity only** — GPU-accelerated
- **`gpu` utility class** — `translateZ(0)`, `will-change: transform, opacity`
- **No layout animations** — avoid animating `width`, `height`, `top`, `left`
- **`layout` prop** — use sparingly (causes reflow)

### 9.2 Framer Motion
```tsx
<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.18, ease: "easeOut" }}
  className="gpu"
>
```

## 10. Bundle Optimization

### 10.1 Heavy Dependencies
| Package | Size | Mitigation |
|---------|------|------------|
| recharts | ~400 KB | Consider lightweight SVG for sparklines |
| framer-motion | ~100 KB | Already tree-shaken |
| @radix-ui/* | ~150 KB | Tree-shaken per primitive |
| zod | ~60 KB | Currently unused — use or remove |

### 10.2 Tree Shaking
- Import only what's needed: `import { Check } from "lucide-react"` (not `import * as Icons`)
- Use `optimizePackageImports` in next.config (planned)

### 10.3 Code Elimination
- Remove unused dependencies (`zod` if not adopting, `next-auth` if not implementing)
- Dead code elimination via Turbopack

## 11. Memory Management

### 11.1 Cleanup
- `setInterval` → always `clearInterval` in cleanup
- `addEventListener` → always `removeEventListener` in cleanup
- React Query handles cache GC automatically

### 11.2 Large Lists
- Virtualize (see §4)
- Don't store computed arrays in state — compute in render or useMemo

## 12. Network Optimization

### 12.1 Reduce Requests
- Topbar notification polling: 60s interval (pause when tab hidden — Phase 4)
- Dashboard: single `/api/dashboard` call (aggregated, not N+1)
- Avoid fetching the same data in multiple components (React Query dedupes)

### 12.2 Reduce Payload
- `select` only needed fields in Prisma
- Cursor pagination (Phase 3) instead of fetching all
- Compress responses (Caddy/gzip)

## 13. Performance Checklist

- [ ] `@next/bundle-analyzer` installed
- [ ] Bundle <200 KB dashboard, <150 KB other
- [ ] `@tanstack/react-virtual` on lists >50 rows
- [ ] `useMutation` optimistic updates on POS/invoice
- [ ] No N+1 queries (verified via Prisma query log in dev)
- [ ] `select` on all list queries
- [ ] `staleTime: 30s` on TanStack Query
- [ ] Prisma query logging disabled in production
- [ ] Notification polling paused when tab hidden
- [ ] Lighthouse Performance >90
- [ ] LCP <2.5s
- [ ] INP <200ms
