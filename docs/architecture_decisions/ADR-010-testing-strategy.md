# ADR-010: Testing Strategy

> **Status:** Proposed (not yet implemented)
> **Date:** 2026-06-29

## Context
MedBill has zero automated tests. The PRD requires unit, integration, e2e, visual regression, and accessibility tests with 95%+ coverage on business logic.

## Problem
Choose test tooling and define coverage targets.

## Alternatives
1. **Jest + React Testing Library + Cypress** — Mature but slow (Jest), Cypress is heavy.
2. **Vitest + Testing Library + Playwright** — Fast (esbuild), modern, Playwright for e2e.
3. **Bun test** — Native to Bun, but limited ecosystem.

## Decision
**Vitest (unit/integration) + Playwright (e2e) + axe-core (a11y) + Lighthouse CI (perf).**

### Coverage Targets
| Module | Target |
|--------|--------|
| `src/lib/gst.ts` | 100% |
| `src/lib/format.ts` | 100% |
| `src/lib/store.ts` | 90% |
| `src/lib/api.ts` | 90% |
| `src/app/api/**` | 80% |
| `src/components/app/**` | 75% |
| `src/components/views/**` | 60% (e2e covers more) |
| `src/components/ui/**` | 0% (vendored shadcn) |

### Tooling
- **Vitest** — unit/integration, jsdom, coverage via v8
- **@testing-library/react** — component tests
- **Playwright** — e2e, multi-browser, screenshots for visual regression
- **@axe-core/playwright** — accessibility audits
- **Lighthouse CI** — performance budgets
- **GitHub Actions** — CI pipeline

### Test Pyramid
- **Unit (most):** pure libs (gst, format), store, utils
- **Integration:** API routes with test DB, component interactions
- **E2E (few):** critical user flows (create invoice, POS checkout, quotation convert)
- **Visual:** screenshot diff per view (light + dark)

## Consequences
### Positive
- ✅ Vitest is 3-10x faster than Jest
- ✅ Playwright is the modern e2e standard
- ✅ Coverage gate enforces quality
- ✅ Lighthouse CI prevents perf regressions

### Negative
- ❌ CI runtime increases (~5-10 min for full suite)
- ❌ Test maintenance overhead (~20% of dev time)
- ❌ Visual regression tests are flaky (font rendering, timing)

## Implementation Plan (Phase 5)
1. Install Vitest + config + setup
2. Write GST engine unit tests (100% target)
3. Write formatter unit tests (100% target)
4. Install Playwright + config
5. Write invoice create→pay→view e2e
6. Add axe-core a11y tests
7. Add visual regression screenshots
8. Set up GitHub Actions CI
9. Add coverage gate (95% business logic)

## Future Review
Revisit if:
1. CI runtime exceeds 15 min (parallelize or split)
2. Visual regression flakiness >5% (relax diff threshold)
3. E2e suite becomes slow (shard across machines)

## References
- `TESTING_REPORT.md`
- `16_TESTING_GUIDE.md`
