# Next 100 Tasks — ROI-Sorted Roadmap

> **Generated:** 2026-06-30
> **Method:** Sorted by ROI (business value ÷ effort), not implementation difficulty
> **Rule:** No new coding begins until this roadmap is reviewed

## Scoring

Each task has:
- **Priority:** P0 (block production) → P3 (polish)
- **Effort:** XS (<2h) / S (2-4h) / M (1-2d) / L (3-5d) / XL (1-2w)
- **Dependencies:** Task IDs that must complete first
- **Business value:** 1-10 (impact on users/revenue)
- **Technical risk:** 1-10 (chance of breakage)
- **Expected impact:** What changes after completion
- **ROI:** Value ÷ Effort (higher = do first)

---

## Tier 1 — P0 Production Blockers (ROI: Highest)

| # | Task | Pri | Effort | Deps | Value | Risk | Impact | ROI |
|---|------|-----|--------|------|-------|------|--------|-----|
| 1 | Implement NextAuth (Credentials + JWT) | P0 | L | — | 10 | 7 | Enables login, multi-user | 10 |
| 2 | Refactor 18 routes to use `apiHandler` | P0 | M | — | 9 | 4 | Standardized errors, request IDs | 9 |
| 3 | Wire zod schemas into 18 routes | P0 | M | 2 | 9 | 3 | Input validation, 422 errors | 9 |
| 4 | Implement `requireRole` middleware | P0 | M | 1 | 9 | 5 | RBAC enforcement | 9 |
| 5 | Create `.env.example` + verify `.gitignore` | P0 | XS | — | 7 | 1 | Secrets documented | 7 |
| 6 | Remove `ignoreBuildErrors: true` | P0 | S | 3 | 8 | 6 | TS errors surface | 8 |
| 7 | Add rate limiting (`@upstash/ratelimit`) | P0 | S | — | 7 | 2 | Brute-force protection | 7 |
| 8 | Add CSP + HSTS headers in next.config | P0 | XS | — | 7 | 1 | XSS mitigation | 7 |
| 9 | Add CSRF protection (Origin check) | P0 | S | 1 | 7 | 3 | CSRF mitigation | 7 |
| 10 | Wire `recordAudit` into all 18 mutating routes | P0 | M | 2 | 7 | 2 | Full audit trail | 7 |

## Tier 2 — P0/P1 High ROI Quick Wins

| # | Task | Pri | Effort | Deps | Value | Risk | Impact | ROI |
|---|------|-----|--------|------|-------|------|--------|-----|
| 11 | Remove 10 unused npm dependencies | P1 | XS | — | 6 | 1 | -200KB bundle | 6 |
| 12 | Extract shared `StatCard` component | P1 | S | — | 5 | 1 | -75 LOC, consistency | 5 |
| 13 | Extract shared `StatusBadge` component | P1 | S | — | 5 | 1 | -30 LOC, consistency | 5 |
| 14 | Extract shared `Field` component | P1 | S | — | 4 | 1 | -30 LOC, consistency | 4 |
| 15 | Install `@tanstack/react-virtual` | P1 | S | — | 7 | 2 | 120fps lists | 7 |
| 16 | Virtualize inventory list | P1 | M | 15 | 7 | 3 | 120fps at 5000 rows | 7 |
| 17 | Add `useMutation` + optimistic updates to POS | P1 | M | — | 8 | 4 | <100ms perceived checkout | 8 |
| 18 | Install `@next/bundle-analyzer` | P1 | XS | — | 6 | 1 | Measure bundle | 6 |
| 19 | Run bundle analysis + document baseline | P1 | S | 18 | 7 | 1 | Identify heavy chunks | 7 |
| 20 | Install Playwright + config | P1 | S | — | 8 | 2 | E2e test infrastructure | 8 |
| 21 | Write e2e: invoice create→pay→view | P1 | M | 20 | 9 | 3 | Critical path verified | 9 |
| 22 | Write e2e: POS checkout | P1 | S | 20 | 7 | 2 | POS verified | 7 |
| 23 | Write e2e: quotation→convert | P1 | S | 20 | 6 | 2 | Quotation verified | 6 |
| 24 | Install `@axe-core/playwright` | P1 | XS | 20 | 6 | 1 | A11y automation | 6 |
| 25 | Run axe audit on all 12 views | P1 | M | 24 | 7 | 2 | A11y violations found | 7 |
| 26 | Add cursor pagination to list endpoints | P1 | M | 2 | 7 | 3 | Scales to 100k+ | 7 |
| 27 | Replace hardcoded "Rahul" with auth user | P1 | XS | 1 | 5 | 1 | Personalized | 5 |
| 28 | Add structured logger (pino) | P1 | S | — | 5 | 2 | Observable | 5 |
| 29 | Generate OpenAPI spec from schemas | P1 | M | 3 | 6 | 2 | API documented | 6 |
| 30 | Set up GitHub Actions CI (run on push) | P1 | S | 2,3 | 8 | 3 | Automated checks | 8 |

## Tier 3 — P1/P2 Important Improvements

| # | Task | Pri | Effort | Deps | Value | Risk | Impact | ROI |
|---|------|-----|--------|------|-------|------|--------|-----|
| 31 | Split `invoice-viewer.tsx` (521→2 files) | P1 | S | — | 4 | 2 | Maintainable | 4 |
| 32 | Split `dashboard-view.tsx` (443→3 files) | P1 | S | — | 4 | 2 | Maintainable | 4 |
| 33 | Split `inventory-view.tsx` (401→3 files) | P1 | S | — | 4 | 2 | Maintainable | 4 |
| 34 | Split `seed/route.ts` (456→5 files) | P1 | S | — | 3 | 1 | Maintainable | 3 |
| 35 | Extract shared `DocumentEditor` | P2 | M | 12,13 | 6 | 5 | -300 LOC | 6 |
| 36 | Float → Decimal migration (78 columns) | P1 | L | 6 | 9 | 8 | Precision correct | 9 |
| 37 | Add composite indexes (4 missing) | P1 | XS | — | 5 | 1 | Faster queries | 5 |
| 38 | Add automated backup cron | P1 | XS | — | 6 | 1 | Data safety | 6 |
| 39 | Install Sentry error tracking | P1 | S | — | 6 | 2 | Error visibility | 6 |
| 40 | Add web vitals reporting | P2 | S | — | 5 | 2 | Performance data | 5 |
| 41 | Add request ID middleware | P1 | XS | 2 | 4 | 1 | Traceable | 4 |
| 42 | Reduce `any` types (80→<20) | P1 | M | 3 | 5 | 3 | Type safety | 5 |
| 43 | Add keyboard shortcuts (⌘N, ⌘P) | P2 | S | — | 5 | 1 | Power user speed | 5 |
| 44 | Fix touch targets (h-9→h-11 mobile) | P2 | S | — | 5 | 2 | A11y compliance | 5 |
| 45 | Add skip-to-content link | P2 | XS | — | 4 | 1 | A11y | 4 |
| 46 | Add `aria-live` to toast region | P2 | XS | — | 3 | 1 | Screen reader | 3 |
| 47 | Install Lighthouse CI | P1 | S | — | 7 | 2 | Perf budget | 7 |
| 48 | Run Lighthouse baseline on all routes | P1 | S | 47 | 7 | 1 | Baseline measured | 7 |
| 49 | Optimize dashboard API (166→<80ms) | P2 | M | 2 | 5 | 3 | Faster dashboard | 5 |
| 50 | Split products API (4 collections→4 endpoints) | P2 | M | 2 | 5 | 3 | Faster products | 5 |
| 51 | Pause notification polling when tab hidden | P2 | XS | — | 3 | 1 | Battery/bandwidth | 3 |
| 52 | Add OTP login (phone) | P1 | L | 1 | 8 | 5 | Phone auth | 8 |
| 53 | Add Google OAuth login | P1 | M | 1 | 7 | 3 | Google auth | 7 |
| 54 | Add session management UI | P1 | M | 1 | 5 | 2 | Device management | 5 |
| 55 | Add login history | P2 | S | 1 | 4 | 1 | Security visibility | 4 |
| 56 | Add branch switching UI | P2 | M | 4 | 5 | 3 | Multi-branch | 5 |
| 57 | Add multi-business switcher | P2 | M | 1 | 6 | 4 | Multi-tenant | 6 |
| 58 | Add e-invoicing (IRN/QR) | P0 | L | — | 9 | 7 | GST compliance | 9 |
| 59 | Add e-way bill generation | P0 | L | — | 8 | 6 | GST compliance | 8 |
| 60 | Add GSTR-3B generation | P1 | M | — | 6 | 3 | GST filing | 6 |
| 61 | Add GSTR-2B reconciliation | P2 | L | — | 5 | 4 | GST matching | 5 |
| 62 | Add credit/debit notes | P1 | M | 3 | 6 | 4 | Returns handling | 6 |
| 63 | Add sales returns | P1 | M | 3 | 6 | 3 | Returns workflow | 6 |
| 64 | Add purchase returns | P1 | M | 3 | 5 | 3 | Returns workflow | 5 |
| 65 | Add batch tracking UI | P2 | M | — | 5 | 3 | Pharma/food | 5 |
| 66 | Add expiry tracking UI | P2 | M | 65 | 5 | 3 | Pharma/food | 5 |
| 67 | Add serial tracking UI | P2 | M | — | 4 | 3 | Electronics | 4 |
| 68 | Add multi-warehouse UI | P2 | L | — | 5 | 4 | Multi-location | 5 |
| 69 | Add stock transfer | P2 | M | 68 | 5 | 3 | Multi-location | 5 |
| 70 | Add barcode scanner (camera) | P1 | M | — | 7 | 4 | POS speed | 7 |

## Tier 4 — P2/P3 Polish & Differentiation

| # | Task | Pri | Effort | Deps | Value | Risk | Impact | ROI |
|---|------|-----|--------|------|-------|------|--------|-----|
| 71 | Add PWA service worker | P2 | L | — | 7 | 5 | Offline shell | 7 |
| 72 | Add IndexedDB cache | P2 | L | 71 | 7 | 6 | Offline data | 7 |
| 73 | Add background sync | P2 | L | 72 | 6 | 6 | Offline mutations | 6 |
| 74 | Add sync dashboard | P2 | M | 73 | 4 | 3 | Sync visibility | 4 |
| 75 | Add payment links (UPI) | P2 | M | 1 | 6 | 3 | Online payment | 6 |
| 76 | Add recurring invoices | P2 | M | 3 | 5 | 3 | Automation | 5 |
| 77 | Add outstanding reminders (WhatsApp) | P2 | M | — | 6 | 2 | Collections | 6 |
| 78 | Add email notifications | P2 | M | — | 4 | 2 | Communication | 4 |
| 79 | Add SMS notifications | P2 | M | — | 4 | 2 | Communication | 4 |
| 80 | Add balance sheet | P2 | L | 36 | 6 | 4 | Accounting depth | 6 |
| 81 | Add trial balance | P2 | M | 36 | 5 | 3 | Accounting depth | 5 |
| 82 | Add cash flow statement | P2 | M | 36 | 5 | 3 | Accounting depth | 5 |
| 83 | Add double-entry accounting | P2 | XL | 80 | 7 | 8 | Accounting depth | 7 |
| 84 | Add payroll module | P2 | XL | 1 | 5 | 5 | Employee mgmt | 5 |
| 85 | Add CRM module | P2 | L | — | 5 | 4 | Leads/follow-ups | 5 |
| 86 | Add manufacturing (BOM) | P3 | XL | — | 4 | 6 | Production | 4 |
| 87 | Add multi-currency | P3 | L | 36 | 3 | 5 | International | 3 |
| 88 | Add multi-language | P3 | L | — | 4 | 4 | Localization | 4 |
| 89 | Add custom report builder | P3 | XL | — | 4 | 6 | Flexibility | 4 |
| 90 | Add Tally data import | P3 | L | — | 6 | 5 | Migration | 6 |
| 91 | Add bank statement import | P3 | M | — | 5 | 4 | Reconciliation | 5 |
| 92 | Add PDF generation (server-side) | P3 | M | — | 5 | 3 | Email/print | 5 |
| 93 | Add mobile app (React Native) | P3 | XL | — | 6 | 7 | Mobile native | 6 |
| 94 | Add API for third-party integrations | P3 | L | 29 | 5 | 4 | Extensibility | 5 |
| 95 | Add white-label / reseller | P3 | L | 57 | 4 | 5 | B2B | 4 |
| 96 | Add Dockerfile + Docker Compose | P1 | M | — | 7 | 3 | Deployment | 7 |
| 97 | Add production build verification | P1 | S | 96 | 6 | 3 | Deploy confidence | 6 |
| 98 | Add staging environment | P2 | M | 96 | 5 | 3 | Safe testing | 5 |
| 99 | Add Litestream continuous backup | P2 | M | — | 6 | 4 | HA backup | 6 |
| 100 | Add analytics (PostHog) | P2 | S | — | 5 | 2 | Product insights | 5 |

---

## Summary by Priority

| Priority | Count | Total Effort | Avg Value | Avg Risk |
|----------|-------|-------------|-----------|----------|
| P0 | 12 | ~6 weeks | 8.3 | 3.5 |
| P1 | 33 | ~8 weeks | 6.5 | 2.8 |
| P2 | 38 | ~14 weeks | 5.4 | 3.5 |
| P3 | 17 | ~18 weeks | 4.7 | 5.1 |

## Recommended Execution Order

### Sprint 1 (Weeks 1-2): Security Foundation
Tasks: 1, 2, 3, 4, 5, 7, 8, 9, 10
**Goal:** Auth + validation + error handling + rate limiting on all routes

### Sprint 2 (Weeks 3-4): Testing & CI
Tasks: 20, 21, 22, 23, 24, 25, 30, 47, 48
**Goal:** E2e tests + a11y audit + Lighthouse + CI running

### Sprint 3 (Weeks 5-6): Performance
Tasks: 11, 15, 16, 17, 18, 19, 49, 50
**Goal:** Virtualization + optimistic updates + bundle analysis + API optimization

### Sprint 4 (Weeks 7-8): Refactoring
Tasks: 12, 13, 14, 31, 32, 33, 34, 35, 42
**Goal:** Shared components + split files + reduce `any`

### Sprint 5 (Weeks 9-10): GST Compliance
Tasks: 58, 59, 60, 62, 63, 64
**Goal:** E-invoicing + e-way bill + returns

### Sprint 6 (Weeks 11-12): Deployment
Tasks: 36, 38, 39, 96, 97, 99
**Goal:** Float→Decimal + backup cron + Sentry + Docker + Litestream

---

**This roadmap is sorted by ROI. P0 items (tasks 1-12) must complete before any production deploy. No new feature work should begin until tasks 1-10 are done.**
