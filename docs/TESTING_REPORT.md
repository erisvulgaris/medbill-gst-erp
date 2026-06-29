# MedBill — Testing Report

> **Audit date:** 2026-06-29
> **Current state:** Zero automated tests; manual QA only via agent-browser

## Executive Summary

MedBill has **no test infrastructure**. No test runner is installed, no test files exist, no coverage is measured. All verification is manual (agent-browser smoke tests). This is the single largest gap blocking production readiness.

| Metric | Current | Target |
|--------|---------|--------|
| Test runner | None | Vitest (unit) + Playwright (e2e) |
| Test files | 0 | 50+ |
| Line coverage (business logic) | 0% | 95% |
| E2E scenarios | 0 | 20+ |
| Accessibility tests | 0 | Automated via axe-core |
| Visual regression | 0 | Chromatic / Playwright screenshots |
| Performance tests | 0 | Lighthouse CI |
| CI pipeline | None | GitHub Actions |

---

## 1. Current Verification Method

**Manual QA via agent-browser** — documented in worklog:
- Dashboard renders, KPIs populate
- Invoice create flow (select party → add product → GST calc → save)
- Payment collection dialog
- POS checkout
- Mobile viewport bottom nav
- Reports P&L renders
- GST HSN summary renders

**Limitations:**
- Not repeatable
- Not in CI
- No regression protection
- No coverage measurement
- Tests pass/fail based on visual inspection, not assertions

---

## 2. Required Test Infrastructure

### 2.1 Unit & Integration Tests — Vitest

**Why Vitest:** Native ESM, fast, Jest-compatible API, works with Bun.

**Setup:**
```bash
bun add -d vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom jsdom
```

**Config:** `vitest.config.ts`
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/lib/**", "src/components/app/**"],
      exclude: ["src/components/ui/**"], // shadcn primitives
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
    },
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
```

### 2.2 E2E Tests — Playwright

**Why Playwright:** Multi-browser, fast, good Next.js integration, supports `data-testid`.

**Setup:**
```bash
bun add -d @playwright/test
bunx playwright install --with-deps
```

**Config:** `playwright.config.ts`
```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [["html"], ["github"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "bun run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "mobile", use: { devices: ["Pixel 7"] } },
  ],
});
```

### 2.3 Accessibility Tests — axe-core

```bash
bun add -d @axe-core/playwright
```

In every Playwright test:
```ts
import AxeBuilder from "@axe-core/playwright";

test("dashboard is accessible", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

### 2.4 Visual Regression — Playwright Screenshots

```ts
test("dashboard visual", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveScreenshot("dashboard.png", { maxDiffPixelRatio: 0.01 });
});
```

### 2.5 Performance Tests — Lighthouse CI

```bash
bun add -d @lhci/cli
```

**Config:** `lighthouserc.json`
```json
{
  "ci": {
    "collect": { "url": ["http://localhost:3000/"], "numberOfRuns": 3 },
    "assert": {
      "assertions": {
        "categories:performance": ["warn", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }]
      }
    }
  }
}
```

---

## 3. Test Plan

### 3.1 Unit Tests (Vitest) — Priority by criticality

**GST Engine (`src/lib/gst.ts`)** — highest priority, pure functions
- `computeLine` intra-state: qty×price, discount %, CGST+SGST split
- `computeLine` inter-state: IGST
- `computeLine` with discount amount + percent
- `computeDocument` totals aggregation
- `computeDocument` round-off calculation
- `isValidGstin` valid/invalid cases (29 states + UTs)
- `stateCodeFromGstin` extraction
- `deriveSupplyType` same/different/missing state
- Edge: zero quantity, negative price (should clamp), 100% discount

**Formatters (`src/lib/format.ts`)** — high priority, pure functions
- `formatINR` basic, large numbers (₹1,23,456.78), negative
- `formatINRCompact` thousands, lakhs, crores
- `amountInWords` 0, single digits, thousands, lakhs, crores, paise
- `formatDate`, `formatDateShort`, `formatDateTime`
- `relativeTime` seconds/minutes/hours/days
- `initials` single name, multi name, empty

**Store (`src/lib/store.ts`)** — medium
- `setBusiness` / `clearBusiness`
- `openView` sets view + viewParams
- `toggleSidebar`
- Persistence (localStorage mock)

**API client (`src/lib/api.ts`)** — medium
- Success: returns parsed JSON
- 404: throws with message
- Network error: throws
- (Mock `fetch`)

### 3.2 Component Tests (Vitest + Testing Library)

**StatusBadge** — render all statuses, verify color class
**StatCard** — render with each accent
**InvoiceEditor** —
- Add product → line appears
- Change qty → totals update
- Change tax rate → CGST/SGST recalc
- Select party → supply type updates
- Submit with empty items → validation error
**CollectPaymentDialog** —
- Quick amount buttons (Full/Half/Quarter)
- Amount exceeds balance → error
- Save → calls POST /api/payments
**Dashboard** —
- Renders KPIs from mock data
- Renders charts (mock recharts)
- Empty state when no data

### 3.3 E2E Tests (Playwright) — Critical paths

**Auth (once implemented):**
1. Login with email + password
2. Login with OTP
3. Logout

**Billing:**
1. Create invoice (select party → add 2 products → save → verify in list → open → verify GST breakdown)
2. Collect payment on unpaid invoice → verify status = paid
3. Cancel invoice → verify stock restored
4. POS: add 3 products to cart → checkout → verify invoice created + payment recorded

**Quotations:**
1. Create quotation → save → mark sent → accept → convert to invoice → verify stock deducted

**Inventory:**
1. Add product → verify in list
2. Stock adjustment (in) → verify stock increased
3. Low stock filter

**Reports:**
1. Sales register renders with date range
2. P&L renders revenue/COGS/profit
3. Export CSV downloads file

**GST:**
1. GSTR-1 renders HSN summary + rate-wise breakdown

**Party Statement:**
1. Click party → statement opens → ledger shows opening + invoices + payments → closing balance

**Mobile:**
1. Bottom nav renders 5 tabs
2. Navigate via bottom nav
3. Open command palette via search icon

**Accessibility (every view):**
1. axe-core scan → 0 violations

### 3.4 Visual Regression (Playwright screenshots)
- Dashboard (light + dark)
- Invoice list
- Invoice viewer
- POS
- Inventory
- Each report
- Mobile dashboard

### 3.5 Performance (Lighthouse CI)
- Dashboard route: Performance >90, A11y >95, Best Practices >90, SEO >90

---

## 4. Coverage Targets

| Module | Target | Critical paths |
|--------|--------|----------------|
| `src/lib/gst.ts` | 100% | All calc functions |
| `src/lib/format.ts` | 100% | All formatters |
| `src/lib/store.ts` | 90% | State transitions |
| `src/lib/api.ts` | 90% | Fetch wrapper |
| `src/lib/audit.ts` | 90% | recordAudit |
| `src/app/api/**` | 80% | Route handlers (integration) |
| `src/components/app/**` | 75% | Interactive components |
| `src/components/views/**` | 60% | View-level (e2e covers more) |
| `src/components/ui/**` | 0% (excluded) | shadcn primitives |

**Overall business logic target: 95%.**

---

## 5. CI Pipeline (Proposed)

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps: [uses: actions/checkout@v4, uses: oven-sh/setup-bun@v1, bun install, bun run lint]
  typecheck:
    runs-on: ubuntu-latest
    steps: [ ..., bunx tsc --noEmit ]
  unit:
    runs-on: ubuntu-latest
    steps: [ ..., bun run test:unit ]
  e2e:
    runs-on: ubuntu-latest
    steps: [ ..., bun run test:e2e ]
  a11y:
    runs-on: ubuntu-latest
    steps: [ ..., bun run test:a11y ]
  lighthouse:
    runs-on: ubuntu-latest
    steps: [ ..., bun run lhci ]
```

---

## 6. Missing Test Scenarios (Backlog)

- Multi-tenant isolation (once auth lands)
- RBAC permission denied paths
- Offline mode (once service worker lands)
- Concurrent invoice creation (race on invoice sequence)
- GSTIN validation for all 38 state codes
- Amount-in-words for crore values
- Date timezone edge cases
- Large list (1000+ products) render performance
- Print layout correctness (invoice/quote PDF)

---

## 7. Remediation Checklist

| Priority | Item | Effort |
|----------|------|--------|
| P0 | Install Vitest + config + setup | S |
| P0 | Write GST engine unit tests (target 100%) | M |
| P0 | Write formatter unit tests (target 100%) | S |
| P0 | Install Playwright + config | S |
| P0 | Write invoice create→pay→view e2e | M |
| P1 | Write component tests for InvoiceEditor | M |
| P1 | Write e2e for POS checkout | S |
| P1 | Write e2e for quotation→convert flow | S |
| P1 | Add axe-core a11y tests for all views | M |
| P1 | Add visual regression screenshots | M |
| P2 | Set up GitHub Actions CI | S |
| P2 | Add Lighthouse CI | S |
| P2 | Add coverage gate (95% business logic) | XS |
| P3 | Add performance budget tests | M |
| P3 | Add load tests (k6) | L |

---

**This report feeds into `16_TESTING_GUIDE.md` and `19_BACKLOG.md`.**
