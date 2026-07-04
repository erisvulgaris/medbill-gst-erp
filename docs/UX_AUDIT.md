# UX Audit

> **Audit date:** 2026-06-30
> **Method:** Screen-by-screen review against UX best practices
> **Related:** `05_DESIGN_SYSTEM.md`, `07_UI_SCREEN_SPECIFICATION.md`

## Executive Summary

MedBill's UX is **above average for Indian ERP software** but below the standard set by Linear/Stripe. The design system is premium and consistent, but workflow efficiency (taps required, time-to-complete) has not been measured.

| Dimension | Score | Notes |
|-----------|-------|-------|
| Visual design | 8/10 | Premium emerald, consistent |
| Spacing | 7/10 | Generally good, minor variance |
| Typography | 8/10 | Clear hierarchy, tnum on finance |
| Hierarchy | 7/10 | Good, but some dense tables |
| Accessibility | 5/10 | Radix-based, but no axe audit |
| Animations | 8/10 | GPU-accelerated, reduced-motion |
| Touch targets | 7/10 | Some <44px |
| Keyboard support | 6/10 | Radix handles dialogs, but no shortcuts |
| Tablet layout | 5/10 | Not specifically designed for |
| Desktop layout | 8/10 | Sidebar + content works well |
| Mobile experience | 7/10 | Bottom nav, responsive tables |

**Overall UX: 7/10** — Good foundation, needs workflow measurement + accessibility audit.

---

## 1. Workflow Benchmarks (Estimated, Not Measured)

| Workflow | Target | Estimated | Status |
|----------|--------|-----------|--------|
| Invoice creation | <5s | ~15-20s | ❌ Over target |
| Purchase entry | <10s | ~20-30s | ❌ Over target |
| Payment collection | <3s | ~5-8s | ❌ Over target |
| POS checkout | <10s | ~10-15s | 🟡 Close |
| Navigation (view switch) | <100ms | <16ms | ✅ Met |
| Search (command palette) | <500ms | ~200ms | ✅ Met |

**Gap:** Workflows not measured with actual user testing. Estimates based on click-count analysis.

---

## 2. Screen-by-Screen Review

### 2.1 Dashboard
- ✅ Hero gradient with inline stats — excellent visual hierarchy
- ✅ KPI cards with sparklines — informative
- ✅ Recent invoices — scannable
- ❌ "Welcome back, Rahul" — hardcoded name (not personalized)
- ❌ No quick-filter on recent invoices (e.g., "show only unpaid")
- **Taps to create invoice:** 2 (hero button → editor) ✅

### 2.2 Sales & Invoices
- ✅ List with search + status filter — good
- ✅ Summary stat cards — informative
- ❌ Invoice editor requires party selection + product selection + save = 3+ taps minimum
- ❌ No "recent parties" quick-select
- ❌ No "duplicate invoice" feature
- **Taps to create invoice:** ~8-12 (new → select party → add product → adjust qty → save → view)
- **Target:** <5s actual time — achievable with optimistic updates

### 2.3 POS Billing
- ✅ Product grid — tap to add
- ✅ Cart with qty controls
- ✅ Payment mode selection
- ❌ No barcode scanner (planned)
- ❌ No "hold bill" / recall
- **Taps to checkout:** ~5-7 (3 products + mode + charge)
- **Target:** <10s — achievable

### 2.4 Inventory
- ✅ List with search + category filter
- ✅ Stock adjust dialog
- ❌ No bulk edit
- ❌ No import/export in UI
- **Taps to add product:** ~15+ (many form fields)

### 2.5 Parties
- ✅ Unified customer/supplier
- ✅ Outstanding balance shown
- ✅ Click row → statement
- ❌ No quick "add customer" from invoice editor
- ❌ No bulk import

### 2.6 Quotations
- ✅ Full editor
- ✅ Convert to invoice
- ❌ No email sending
- ❌ No template selection

### 2.7 Reports
- ✅ 6 report types
- ✅ Date range picker
- ✅ CSV export
- ❌ No scheduled reports
- ❌ No custom report builder

### 2.8 GST Returns
- ✅ GSTR-1 with HSN summary
- ✅ Rate-wise breakdown
- ❌ No actual filing (redirect to portal)
- ❌ No GSTR-3B

### 2.9 Settings
- ✅ Tabbed (Business, Modules, Roles, Security, Data)
- ✅ Module toggles
- ❌ Roles are view-only (no actual management)

---

## 3. Spacing Analysis

| Component | Padding | Status |
|-----------|---------|--------|
| Page container | p-4 sm:p-6 lg:p-7 | ✅ Consistent |
| Cards | p-4 or p-5 | ✅ Consistent |
| Dialogs | p-5 or p-6 | ✅ Consistent |
| Table cells | py-2.5 or py-3 | ✅ Consistent |
| Button height | h-9 (36px) | 🟡 Some secondary <44px touch target |
| Nav items | h-9 (36px) | 🟡 Below 44px touch target |
| Bottom nav | h-16 (64px) | ✅ Good touch target |

**Issue:** Many interactive elements are 36px (h-9), below the 44px iOS/Android touch target guideline. Acceptable for desktop, marginal for mobile.

---

## 4. Typography Analysis

| Element | Size | Weight | Status |
|---------|------|--------|--------|
| Page title | 22px | bold | ✅ |
| Card title | 15px | semibold | ✅ |
| Table header | 10.5px | semibold uppercase | ✅ |
| Table cell | 13px | normal/medium | ✅ |
| Helper text | 11.5px | normal | ✅ |
| Badge | 10.5px | semibold | ✅ |
| Money value | 18-22px | bold tnum | ✅ |

**Status:** ✅ Consistent and readable. `tnum` on all finance figures prevents layout shift.

---

## 5. Accessibility Audit

| Check | Status | Evidence |
|-------|--------|----------|
| Semantic HTML | ✅ | `<main>`, `<header>`, `<nav>`, `<section>` |
| ARIA labels on icon buttons | ✅ | 23 `aria-label` usages |
| Focus-visible rings | ✅ | `outline-ring/50` in globals.css |
| Keyboard navigation (Radix) | ✅ | Dialogs, selects trap focus |
| Color contrast (WCAG AA) | 🟡 | Not verified with axe |
| Screen reader support | 🟡 | `sr-only` class available but underused |
| Skip-to-content link | ❌ | Not present |
| `aria-live` on toasts | ❌ | Sonner toasts don't announce |
| Color + icon (not color alone) | ✅ | Status badges have text |
| `prefers-reduced-motion` | ✅ | Respected in globals.css |
| `data-testid` for testing | ✅ | 66 usages |

**Gap:** No axe-core automated audit. Lighthouse a11y score unknown.

---

## 6. Animation Quality

| Pattern | Implementation | Status |
|---------|---------------|--------|
| View transitions | framer-motion AnimatePresence | ✅ Smooth |
| List stagger | motion.tr with delay | ✅ Good |
| Active nav indicator | layoutId animation | ✅ Premium feel |
| Dialog entrance | Radix built-in | ✅ |
| Cart item add | AnimatePresence | ✅ |
| Loading skeletons | Skeleton component | ✅ No spinners |
| Reduced motion | CSS media query | ✅ |

**Status:** ✅ Animations are GPU-accelerated (transform+opacity) and respect reduced-motion.

---

## 7. Touch Target Analysis

| Element | Size | Touch target met? |
|---------|------|-------------------|
| Primary buttons | h-9 (36px) | ❌ Below 44px |
| Nav items | h-9 (36px) | ❌ Below 44px |
| Bottom nav tabs | h-16 (64px) | ✅ |
| Table row click | py-3 (~48px) | ✅ |
| Icon buttons | h-7-9 (28-36px) | ❌ |
| Dialog buttons | h-9 (36px) | ❌ |

**Issue:** Most interactive elements are 36px, below the 44px minimum for touch. This is a common shadcn/ui default.

**Fix:** Increase to `h-11` (44px) on mobile, keep `h-9` on desktop. Use responsive classes.

---

## 8. Keyboard Support

| Action | Shortcut | Status |
|--------|----------|--------|
| Command palette | ⌘K / Ctrl+K | ✅ |
| Escape dialog | Esc | ✅ (Radix) |
| Tab navigation | Tab | ✅ (Radix) |
| Submit form | Enter | ✅ |
| New invoice | ⌘N | ❌ Not implemented |
| Search | ⌘F | ❌ (use ⌘K) |
| Print | ⌘P | ✅ (browser default) |

**Gap:** No app-specific keyboard shortcuts beyond ⌘K.

---

## 9. Tablet Layout

**Status:** 🟡 Not specifically designed.

- `sm:` breakpoint (640px) handles small tablets
- `md:` (768px) handles large tablets
- Sidebar appears at `lg:` (1024px) — tablets in portrait get mobile layout
- No specific tablet optimizations (split view, etc.)

**Gap:** No tablet-specific layout testing.

---

## 10. Recommendations

### P0 (Critical UX)
1. **Measure actual workflow times** — instrument with analytics
2. **Add keyboard shortcuts** — ⌘N (new invoice), ⌘P (print), ⌘/ (shortcuts help)
3. **Fix touch targets** — h-11 on mobile for primary buttons

### P1 (Important UX)
4. **Recent parties quick-select** in invoice editor
5. **Duplicate invoice** feature
6. **Bulk import** for parties/products
7. **axe-core audit** — fix all violations
8. **Skip-to-content** link
9. **`aria-live`** on toast region

### P2 (Polish)
10. **Tablet layout** — test and optimize for 768-1024px
11. **Hold/recall bill** in POS
12. **Template selection** for quotations
13. **Scheduled reports** (email)

---

## 11. Competitor UX Comparison

| Dimension | MedBill | Tally | Vyapar | Zoho Books | Swipe |
|-----------|---------|-------|--------|------------|-------|
| Visual design | 8/10 | 3/10 | 5/10 | 8/10 | 7/10 |
| Onboarding speed | 8/10 | 2/10 | 6/10 | 7/10 | 9/10 |
| Invoice speed (est) | 6/10 | 7/10 | 6/10 | 5/10 | 8/10 |
| Mobile UX | 7/10 | 3/10 | 6/10 | 7/10 | 9/10 |
| Accessibility | 5/10 | 2/10 | 3/10 | 6/10 | 5/10 |

**MedBill's UX advantage:** Modern web design (vs dated desktop UIs)
**MedBill's UX gap:** Workflow efficiency not measured/optimized

---

**This audit is based on screen review, not user testing. Workflow time estimates need validation with real users. Accessibility needs axe-core verification.**
