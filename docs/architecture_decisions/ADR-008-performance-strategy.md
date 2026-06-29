# ADR-008: Performance Strategy

> **Status:** Accepted
> **Date:** 2026-06-29

## Context
The PRD sets aggressive performance targets: 120 FPS scrolling, <100ms interactions, <150KB critical JS, zero unnecessary re-renders.

## Problem
Define the performance strategy and budgets.

## Decision

### Principles
1. **Code-split everything** — `next/dynamic` for all views
2. **GPU-accelerated animations** — `transform` + `opacity` only, via framer-motion
3. **Virtualize large lists** — `@tanstack/react-virtual` for any list >50 rows
4. **Optimistic updates** — `useMutation` with `onMutate` for perceived speed
5. **Cache-first** — TanStack Query with 30s staleTime
6. **Tabular numerals** — `tnum` class prevents layout shift on finance figures

### Budgets
| Metric | Budget |
|--------|--------|
| Initial JS (dashboard) | <200 KB |
| Initial JS (other routes) | <150 KB |
| LCP | <2.5s |
| INP | <200ms |
| API p95 | <200ms |
| Dashboard queries | <10 |

### Techniques
- `next/dynamic` lazy views (✅ done)
- `@tanstack/react-virtual` (❌ Phase 4)
- `useMutation` optimistic updates (❌ Phase 4)
- `useMemo`/`useCallback` for expensive renders (partial)
- `prefers-reduced-motion` respected (✅ in globals.css)
- Recharts for charts (consider lightweight SVG for sparklines)
- Prisma query logging disabled in prod (❌ Phase 3)

## Consequences
### Positive
- ✅ Meets "native app feel" goal
- ✅ Sub-100ms navigation (instant via Zustand)
- ✅ Measurable via budgets

### Negative
- ❌ Virtualization adds complexity (custom row rendering)
- ❌ Optimistic updates require rollback logic (more code)
- ❌ Budget enforcement requires CI (Lighthouse CI)

## Future Review
Revisit if:
1. Budgets are consistently missed (loosen or optimize)
2. Recharts becomes a bottleneck (replace with custom SVG)
3. Mobile performance lags (reduce JS payload further)

## References
- `14_PERFORMANCE_GUIDE.md`
- `PERFORMANCE_REPORT.md`
