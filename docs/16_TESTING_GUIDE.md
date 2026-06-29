# 16 — Testing Guide

> **Status:** Source of truth for all testing practices
> **Related:** ADR-010 (Testing Strategy), `TESTING_REPORT.md`, `18_RELEASE_PROCESS.md`

## 1. Testing Philosophy

MedBill follows a **testing pyramid**:

```
        /\
       /e2e\        ← Few, slow, high-confidence (Playwright)
      /------\
     /integration\  ← Some, medium (Vitest + test DB)
    /--------------\
   /     unit      \ ← Many, fast (Vitest, pure functions)
  /------------------\
```

**Principles:**
1. **Pure functions get 100% coverage** — GST engine, formatters, utils
2. **Critical user flows have e2e tests** — invoice create→pay→view, POS checkout
3. **Accessibility is automated** — axe-core on every view
4. **Performance is measured** — Lighthouse CI on every PR
5. **Tests run before code merges** — CI gate

## 2. Test Infrastructure

### 2.1 Tools

| Tool | Purpose | Config |
|------|---------|--------|
| **Vitest 4** | Unit + integration tests | `vitest.config.ts` |
| **@vitest/coverage-v8** | Coverage reporting | V8 provider |
| **@vitejs/plugin-react** | JSX transform for component tests | — |
| **Playwright** (planned) | E2E + visual regression | `playwright.config.ts` |
| **@axe-core/playwright** (planned) | Accessibility audits | — |
| **Lighthouse CI** (planned) | Performance budgets | `lighthouserc.json` |

### 2.2 Scripts

```bash
bun run test              # Run all unit tests once
bun run test:watch        # Watch mode (dev)
bun run test:coverage     # Run tests + coverage report
bun run test:e2e          # (planned) Playwright e2e
bun run test:a11y         # (planned) axe-core accessibility
bun run lhci              # (planned) Lighthouse CI
```

### 2.3 Configuration

**`vitest.config.ts`:**
- Environment: `node` (pure lib tests don't need DOM)
- Globals: `true` (describe/it/expect available without import)
- Coverage: V8 provider, per-file thresholds on pure libs
- Alias: `@` → `src/`

## 3. Coverage Targets

| Module | Target | Current | Notes |
|--------|--------|---------|-------|
| `src/lib/gst.ts` | 100% | ✅ 100% | Critical business logic |
| `src/lib/format.ts` | 100% | ✅ 99% | 1 uncovered branch (private helper) |
| `src/lib/utils.ts` | 100% | ✅ 100% | `cn()` class merge |
| `src/lib/nav.ts` | 100% | ✅ 100% | Navigation config |
| `src/lib/store.ts` | 90% | 0% | Needs jsdom + localStorage mock |
| `src/lib/api.ts` | 90% | 0% | Needs fetch mock |
| `src/app/api/**` | 80% | 0% | Integration tests with test DB |
| `src/components/app/**` | 75% | 0% | Component tests (planned) |
| `src/components/views/**` | 60% | 0% | E2E covers more |
| `src/components/ui/**` | 0% | 0% | Vendored shadcn, excluded |

**Overall pure-lib coverage: 99.38% statements, 100% functions, 100% lines.**

## 4. Unit Test Patterns

### 4.1 Pure Function Tests (gst.ts, format.ts)

```ts
import { describe, it, expect } from "vitest";
import { computeLine } from "./gst";

describe("computeLine — intra-state", () => {
  it("computes CGST + SGST for 18% GST", () => {
    const result = computeLine({ name: "x", quantity: 1, price: 100, taxRate: 18 }, "intra");
    expect(result.cgst).toBe(9);
    expect(result.sgst).toBe(9);
    expect(result.total).toBe(118);
  });
});
```

### 4.2 Edge Case Tests

Every pure function must test:
- Zero / null / undefined / NaN inputs
- Negative inputs (verify clamping)
- Boundary values (0, 100, max)
- Type coercion (string vs number)

### 4.3 Integration / Real-World Scenario Tests

```ts
describe("Integration: real-world invoice scenarios", () => {
  it("matches the documented example: 2x Atta @ ₹290, 5% GST", () => {
    const { totals } = computeDocument(
      [{ name: "Atta", hsn: "1101", quantity: 2, price: 290, taxRate: 5 }],
      "intra"
    );
    expect(totals.grandTotal).toBe(609);
  });
});
```

### 4.4 Time-Dependent Tests (fake timers)

```ts
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-06-29T12:00:00Z"));
});
afterAll(() => vi.useRealTimers());

it("returns '5m ago' for 5 minutes ago", () => {
  expect(relativeTime(new Date("2026-06-29T11:55:00Z"))).toBe("5m ago");
});
```

## 5. Test File Conventions

### 5.1 Naming
- Unit: `src/lib/gst.test.ts` (co-located with source)
- Component: `src/components/app/invoice-editor.test.tsx` (planned)
- E2E: `e2e/invoice-create.spec.ts` (planned)

### 5.2 Structure
```ts
describe("functionName — category", () => {
  it("does X when Y", () => {
    // arrange
    const input = ...;
    // act
    const result = fn(input);
    // assert
    expect(result).toBe(expected);
  });
});
```

### 5.3 What to Test
- ✅ Pure functions (gst, format, utils, nav)
- ✅ Edge cases and boundary values
- ✅ Real-world scenarios (documented examples)
- ❌ shadcn/ui primitives (vendored)
- ❌ Trivial pass-through components

## 6. E2E Test Plan (Playwright — planned)

### 6.1 Critical Paths

| # | Scenario | Steps |
|---|----------|-------|
| 1 | Create invoice | Dashboard → New Invoice → select party → add product → save → verify in list |
| 2 | Collect payment | Open unpaid invoice → Collect Payment → full amount → verify PAID status |
| 3 | Cancel invoice | Open invoice → Cancel → verify stock restored |
| 4 | POS checkout | POS → add 3 products → select cash → checkout → verify success |
| 5 | Quotation flow | New Quotation → save → mark sent → accept → convert to invoice → verify stock |
| 6 | Party statement | Parties → click row → verify ledger shows opening + invoices + closing |
| 7 | Inventory adjust | Inventory → adjust stock → verify new stock value |
| 8 | Reports | Reports → P&L → verify revenue/COGS/profit render |
| 9 | GST GSTR-1 | GST → verify HSN summary + rate-wise breakdown |
| 10 | Mobile nav | Set mobile viewport → verify bottom nav → navigate |

### 6.2 Accessibility (every view)
```ts
import AxeBuilder from "@axe-core/playwright";

test("dashboard accessible", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

### 6.3 Visual Regression
```ts
test("dashboard visual", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveScreenshot("dashboard.png", { maxDiffPixelRatio: 0.01 });
});
```

## 7. CI Pipeline (planned)

```yaml
# .github/workflows/ci.yml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps: [checkout, setup-bun, bun install, bun run lint]
  typecheck:
    steps: [ ..., bunx tsc --noEmit ]
  unit:
    steps: [ ..., bun run test:coverage ]
  e2e:
    steps: [ ..., bun run test:e2e ]
  a11y:
    steps: [ ..., bun run test:a11y ]
  lighthouse:
    steps: [ ..., bun run lhci ]
```

**Gate:** PR cannot merge if any job fails.

## 8. Running Tests

### During Development
```bash
bun run test:watch    # Watch mode, re-runs on save
```

### Pre-Commit
```bash
bun run lint && bun run test
```

### Pre-Release
```bash
bun run lint
bunx tsc --noEmit
bun run test:coverage
bun run test:e2e
bun run test:a11y
bun run lhci
```

## 9. Coverage Report

After `bun run test:coverage`:
- **Console:** summary table
- **`coverage/index.html`:** detailed HTML report (open in browser)
- **`coverage/lcov.info`:** for CI services (Codecov, Coveralls)

## 10. Test Data

- **Unit tests:** inline data (no DB needed)
- **Integration tests (planned):** use a test SQLite DB (`db/test.db`) seeded via `prisma db seed`
- **E2E tests:** use the dev server with seeded demo data (Shree Balaji Traders)

## 11. Current Status

| Item | Status |
|------|--------|
| Vitest installed | ✅ |
| vitest.config.ts | ✅ |
| GST engine tests (64 tests, 100% coverage) | ✅ |
| Formatter tests (55 tests, 99% coverage) | ✅ |
| Utils tests (6 tests, 100% coverage) | ✅ |
| Nav tests (13 tests, 100% coverage) | ✅ |
| Total: 138 tests passing | ✅ |
| Playwright installed | ❌ (planned) |
| E2E scenarios | ❌ (planned) |
| axe-core a11y | ❌ (planned) |
| Lighthouse CI | ❌ (planned) |
| GitHub Actions CI | ❌ (planned) |

## 12. Best Practices

1. **Test behavior, not implementation** — assert on outputs, not internal state
2. **One assertion per test** (ideally) — easier to diagnose failures
3. **Descriptive test names** — "computes CGST for 18% GST intra-state" not "test1"
4. **Arrange-Act-Assert** — clear structure
5. **No shared mutable state** — each test is independent
6. **Fast tests** — pure unit tests < 1ms each; full suite < 5s
7. **Deterministic** — no `Date.now()`, no `Math.random()` without mocking
8. **Coverage is a guide, not a goal** — 100% coverage doesn't mean 100% correct
