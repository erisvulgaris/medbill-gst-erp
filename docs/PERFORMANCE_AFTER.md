# Performance After Optimization

> **Status:** Not yet optimized — this document tracks planned improvements and will be updated with actual before/after measurements
> **Baseline:** `PERFORMANCE_BASELINE.md` (2026-06-30)
> **Principle:** Measure, optimize, re-measure. No claims without evidence.

## Executive Summary

**Status: PLANNED — no optimizations applied yet.**

The performance baseline was measured on 2026-06-30. This document defines the optimization plan and target metrics. Once optimizations are applied, this file will contain actual before/after measurements.

| Metric | Baseline | Target | Status |
|--------|----------|--------|--------|
| LCP | ~2s (est) | <1.5s | ❌ Not optimized |
| INP | ~50ms (est) | <100ms | ✅ Already met |
| CLS | ~0.05 (est) | <0.05 | ✅ Already met |
| Dashboard API | 166ms | <80ms | ❌ Not optimized |
| 120 FPS scrolling | Unmeasured | 120fps | ❌ No virtualization |
| Bundle size | ~350KB (est) | <200KB | ❌ No analyzer |

---

## Optimization Plan (Not Yet Executed)

### 1. Dashboard API Optimization
**Current:** 166ms (4 parallel queries + 2 sparkline queries)
**Target:** <80ms
**Method:**
- Add `Cache-Control: private, max-age=30, stale-while-revalidate=60` header
- Use `select` to fetch only needed fields
- Consider `groupBy` for sparkline instead of findMany + JS bucketing
- Move low-stock query to separate endpoint (cached separately)

**Status:** ❌ Not started

### 2. Products API Split
**Current:** 116ms (returns 4 collections: products, units, taxes, categories)
**Target:** <50ms (products only)
**Method:**
- Split into `GET /api/products`, `GET /api/units`, `GET /api/taxes`, `GET /api/categories`
- Client fetches in parallel with `Promise.all`
- Cache units/taxes/categories for 5 minutes (rarely change)

**Status:** ❌ Not started

### 3. List Virtualization
**Current:** All rows rendered (no virtualization)
**Target:** 120 FPS with 5000 rows
**Method:**
- Install `@tanstack/react-virtual`
- Apply to: inventory, invoices, parties, audit log
- Measure with Chrome DevTools Performance tab

**Status:** ❌ Not started

### 4. Optimistic Updates
**Current:** All mutations block UI
**Target:** <100ms perceived interaction
**Method:**
- Convert inline `api()` calls to `useMutation`
- Add `onMutate` optimistic update + `onError` rollback
- Apply to: POS checkout, invoice save, expense add, stock adjust

**Status:** ❌ Not started

### 5. Bundle Analysis
**Current:** ~350KB estimated (no measurement)
**Target:** <200KB dashboard route
**Method:**
- Install `@next/bundle-analyzer`
- Run `ANALYZE=true bun run build`
- Identify heavy chunks
- Consider replacing recharts with lightweight SVG for sparklines
- Lazy-load heavy chart library only on dashboard/reports

**Status:** ❌ Not started

### 6. Lighthouse CI
**Current:** Not configured
**Target:** Performance >90, A11y >95
**Method:**
- Install `@lhci/cli`
- Configure `lighthouserc.json`
- Run in CI on every PR
- Block merge if below threshold

**Status:** ❌ Not started (workflow placeholder exists in `.github/workflows/ci.yml`)

---

## Measurement Tools Required

Before optimization can begin, these tools must be installed:

| Tool | Purpose | Install |
|------|---------|---------|
| `@next/bundle-analyzer` | Bundle size analysis | `bun add -d @next/bundle-analyzer` |
| `@lhci/cli` | Lighthouse CI | `bun add -d @lhci/cli` |
| `@tanstack/react-virtual` | List virtualization | `bun add @tanstack/react-virtual` |
| React DevTools Profiler | Render profiling | Browser extension |
| Chrome DevTools Performance | Flamegraphs | Built-in |

---

## Honest Assessment

**This document is currently a plan, not a result.** The baseline was measured; optimizations have not been applied. To produce a real "after" report:

1. Install measurement tools
2. Run baseline Lighthouse + bundle analysis
3. Apply optimizations (virtualization, caching, bundle splitting)
4. Run "after" Lighthouse + bundle analysis
5. Document actual before/after numbers here

**No performance claims are made in this document because no optimizations have been applied.**

---

## When This Document Will Be Updated

This document will be updated with actual measurements when:
1. `@next/bundle-analyzer` is installed and a build is analyzed
2. Lighthouse CI is run on the deployed app
3. Virtualization is applied to at least the inventory view
4. Optimistic updates are applied to at least POS checkout

Until then, this document serves as the optimization plan and target definition.
