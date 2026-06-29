# 05 — Design System

> **Status:** Source of truth for all visual design
> **Related:** `src/app/globals.css`, `06_COMPONENT_LIBRARY.md`, `FRONTEND_AUDIT.md`

## 1. Design Principles

MedBill's design system follows four principles:

1. **Premium & Minimal** — Linear/Stripe/Apple quality. No visual clutter. Every element earns its place.
2. **Emerald-First** — Money/growth/India-appropriate. NO indigo or blue (per project constraint).
3. **Data-Dense but Breathable** — ERP users need lots of info, but not cramped. Generous padding, clear hierarchy.
4. **Native-App Feel** — Sub-100ms interactions, GPU-accelerated animations, skeleton loading (no spinners).

## 2. Color System

### 2.1 Primary Palette
All colors defined as CSS custom properties in `globals.css` using OKLCH color space.

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--background` | oklch(0.992 0.004 145) | oklch(0.16 0.012 165) | Page background |
| `--foreground` | oklch(0.18 0.02 160) | oklch(0.96 0.006 150) | Body text |
| `--card` | oklch(1 0 0) | oklch(0.205 0.014 165) | Card surfaces |
| `--primary` | oklch(0.52 0.13 162) | oklch(0.7 0.14 162) | Emerald — CTAs, active states |
| `--primary-foreground` | oklch(0.99 0.01 150) | oklch(0.16 0.02 165) | Text on primary |
| `--secondary` | oklch(0.965 0.012 150) | oklch(0.27 0.015 165) | Secondary buttons |
| `--muted` | oklch(0.965 0.006 150) | oklch(0.24 0.012 165) | Muted backgrounds |
| `--muted-foreground` | oklch(0.52 0.02 155) | oklch(0.68 0.015 160) | Helper text |
| `--accent` | oklch(0.95 0.03 160) | oklch(0.3 0.04 162) | Hover/active backgrounds |
| `--border` | oklch(0.918 0.008 150) | oklch(1 0 0 / 9%) | Borders, dividers |
| `--ring` | oklch(0.52 0.13 162) | oklch(0.7 0.14 162) | Focus rings |

### 2.2 Semantic Colors
| Token | Usage | Light | Dark |
|-------|-------|-------|------|
| `--success` | Paid status, positive | Emerald | Emerald |
| `--warning` | Unpaid, low stock | Amber | Amber |
| `--destructive` | Errors, delete | Red | Red |
| `--info` | Info badges | Teal | Teal |

### 2.3 Status Color Mapping
| Status | Color | Example |
|--------|-------|---------|
| Paid | Emerald `bg-emerald-500/12 text-emerald-700` | ✅ |
| Unpaid | Amber `bg-amber-500/12 text-amber-700` | ⏳ |
| Partial | Blue `bg-blue-500/12 text-blue-700` | 🔵 |
| Overdue | Red `bg-red-500/12 text-red-700` | ⚠️ |
| Draft | Muted `bg-muted text-muted-foreground` | — |
| Cancelled | Muted + line-through | ~~ cancelled ~~ |

### 2.4 Chart Palette
```js
const GST_COLORS = ["#10b981", "#f59e0b", "#3b82f6", "#a855f7", "#ef4444"];
// emerald, amber, blue, purple, red
```

### 2.5 Prohibited Colors
- ❌ **Indigo** — too generic SaaS
- ❌ **Blue** (as primary) — conflicts with "info" semantic
- ❌ **Material UI palette** — we use shadcn/ui (Radix-based)

## 3. Typography

### 3.1 Font Families
| Token | Font | Usage |
|-------|------|-------|
| `--font-geist-sans` | Geist Sans | Body, headings, UI |
| `--font-geist-mono` | Geist Mono | Invoice numbers, GSTIN, SKUs, money |

### 3.2 Type Scale
Use bracket notation for non-standard sizes:

| Class | Size | Usage |
|-------|------|-------|
| `text-[10px]` | 10px | Tiny labels, table cell sub-text |
| `text-[10.5px]` | 10.5px | Uppercase section labels, table headers |
| `text-[11px]` | 11px | Helper text, badges |
| `text-[11.5px]` | 11.5px | Form labels, muted descriptions |
| `text-[12px]` | 12px | Table cell text, secondary |
| `text-[12.5px]` | 12.5px | Body text in tables/dialogs |
| `text-[13px]` | 13px | Primary table cell, list items |
| `text-[13.5px]` | 13.5px | Nav labels, button text |
| `text-[14px]` | 14px | Dialog body |
| `text-[15px]` | 15px | Card titles, dialog headers |
| `text-[17px]` | 17px | Invoice headers |
| `text-[18px]` | 18px | Stat card values |
| `text-[20px]` | 20px | Invoice numbers |
| `text-[22px]` | 22px | Page titles, hero stats |
| `text-[26px]` | 26px | Dashboard greeting |

### 3.3 Font Weights
| Weight | Class | Usage |
|--------|-------|-------|
| 400 (Regular) | `font-normal` | Body text |
| 500 (Medium) | `font-medium` | Table cells, labels |
| 600 (Semibold) | `font-semibold` | Section labels, card titles |
| 700 (Bold) | `font-bold` | Page titles, KPI values, totals |

### 3.4 Tabular Numerals
**All finance figures must use `tnum` class:**
```html
<span class="tnum">₹1,23,456.78</span>
```
This applies `font-variant-numeric: tabular-nums` to prevent layout shift when numbers change.

### 3.5 Text Transform
- `uppercase tracking-wider` — section labels ("CUSTOMER", "INVOICE DETAILS")
- `capitalize` — status badges
- `font-mono` — invoice numbers, GSTIN, SKUs, barcodes

## 4. Spacing

### 4.1 Scale (Tailwind defaults)
| Class | Value | Usage |
|-------|-------|-------|
| `p-2` | 8px | Compact buttons, dense cells |
| `p-3` | 12px | Filter bars, small cards |
| `p-4` | 16px | Standard card padding |
| `p-5` | 20px | Dialog padding |
| `p-6` | 24px | Large card, page section |
| `p-7` | 28px | Page container padding |

### 4.2 Gaps
| Class | Usage |
|-------|-------|
| `gap-1` (4px) | Icon + text inline |
| `gap-2` (8px) | Button groups, form fields |
| `gap-3` (12px) | Stat card grids |
| `gap-4` (16px) | Card grids, dialog sections |
| `gap-5` (20px) | Page-level sections |
| `space-y-5` | Vertical page stacking |

### 4.3 Page Container
```html
<div class="p-4 sm:p-6 lg:p-7 space-y-5 max-w-[1600px] mx-auto">
```
- Mobile: 16px padding
- Tablet: 24px padding
- Desktop: 28px padding
- Max width: 1600px (prevents ultra-wide stretch)

## 5. Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius` | 0.75rem (12px) | Base radius |
| `rounded-md` | 6px | Inputs, small buttons |
| `rounded-lg` | 8px | Buttons, badges |
| `rounded-xl` | 12px | Cards, dialogs |
| `rounded-2xl` | 16px | Hero banners, large cards |
| `rounded-full` | 9999px | Avatars, dots |

## 6. Shadows

| Class | Definition | Usage |
|-------|-----------|-------|
| `shadow-soft` | `0 1px 2px + 0 1px 3px` | Buttons, small cards |
| `shadow-card` | `0 1px 2px + 0 4px 12px` | Standard cards |
| `shadow-float` | `0 4px 16px + 0 12px 32px` | Modals, popovers, invoices |
| `shadow-glow-emerald` | `0 0 0 1px + 0 8px 24px` | Logo, primary CTA glow |

## 7. Glass / Backdrop Effects

| Class | Usage |
|-------|-------|
| `glass` | Topbar, dialogs — `backdrop-blur(20px)` + 72% card opacity |
| `glass-sidebar` | Sidebar — `backdrop-blur(24px)` + 80% sidebar opacity |

**Rule:** Use glass sparingly — only for elements that overlay scrolling content (topbar, sidebar, command palette).

## 8. Animation

### 8.1 Principles
- **Transform + opacity only** — GPU-accelerated, no layout thrash
- **`gpu` utility class** — `translateZ(0)` + `will-change: transform, opacity`
- **Duration:** 150-300ms for UI, 400ms for page transitions
- **Easing:** `ease-out` for entrances, `ease-in` for exits

### 8.2 Framer Motion Patterns
```tsx
// View transition (page switch)
<motion.div
  initial={{ opacity: 0, y: 6 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -4 }}
  transition={{ duration: 0.18, ease: "easeOut" }}
>

// Staggered list
{items.map((item, i) => (
  <motion.tr
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: Math.min(i * 0.02, 0.3) }}
  />
))}

// Layout animation (active nav indicator)
<motion.div layoutId="sidebar-active" className="absolute inset-0 rounded-xl bg-sidebar-accent" />
```

### 8.3 Utility Animations (CSS)
```css
.shimmer { animation: shimmer 1.6s ease-in-out infinite; }
.fade-up { animation: fade-up 0.32s cubic-bezier(0.22, 1, 0.36, 1) both; }
```

### 8.4 Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## 9. Responsive Breakpoints

| Prefix | Min-width | Target |
|--------|-----------|--------|
| (none) | 0 | Mobile (default) |
| `sm:` | 640px | Large phone / small tablet |
| `md:` | 768px | Tablet |
| `lg:` | 1024px | Desktop (sidebar appears) |
| `xl:` | 1280px | Large desktop |

### 9.1 Mobile-First Rules
- Bottom navigation shows on `< lg` (5 tabs, safe-area aware)
- Sidebar shows on `>= lg`
- Tables: hide non-essential columns on small screens (`hidden sm:table-cell`, `hidden md:table-cell`)
- Dialogs: full-width on mobile, max-w on desktop

## 10. Component Patterns

### 10.1 Stat Card
```tsx
<Card className="p-4 shadow-card border-border/50">
  <div className="grid place-items-center w-8 h-8 rounded-lg mb-2 {accentBg}">
    <Icon className="w-4 h-4" />
  </div>
  <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
  <p className="text-[18px] font-bold tnum tracking-tight mt-0.5">{value}</p>
</Card>
```

### 10.2 Status Badge
```tsx
<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md {statusColor}">
  {status}
</span>
```

### 10.3 Section Label
```tsx
<p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/70">
  TRANSACTIONS
</p>
```

### 10.4 Money Display
```tsx
<span className="font-semibold tnum">{formatINR(amount)}</span>
// Negative: text-red-600
// Positive balance: text-amber-600
// Paid: text-emerald-600
```

## 11. Dark Mode

- Implemented via `next-themes` with `class` strategy
- `suppressHydrationWarning` on `<html>` to prevent flash
- All colors have dark variants in `.dark` selector
- Toggle in topbar (Sun/Moon icons)
- Default: system preference

## 12. Print Styles

```css
@media print {
  @page { margin: 0; size: A4; }
  body { background: white !important; }
  aside, header, nav[data-testid="mobile-bottom-nav"] { display: none !important; }
}
```

Invoices and quotations use `print:hidden` on action bars and `print:shadow-none` on the paper.

## 13. Accessibility

- **Focus rings:** `outline: 2px solid var(--ring); outline-offset: 2px`
- **Color contrast:** All text meets WCAG AA (4.5:1)
- **Color + icon:** Status indicators always have an icon + text, not color alone
- **Touch targets:** Minimum 44px (h-9 = 36px is acceptable for secondary actions)
- **Screen readers:** `sr-only` class for visually-hidden text

## 14. Iconography

- **Library:** Lucide React (tree-shakeable)
- **Default size:** `w-4 h-4` (16px) for inline, `w-5 h-5` (20px) for nav/headers
- **Stroke width:** 2 (default), 2.4 for active nav items
- **Never** use emoji as functional icons (only in greetings/celebratory text)

## 15. Grid Background

```css
.grid-bg {
  background-image:
    linear-gradient(to right, oklch(0.2 0.02 160 / 0.04) 1px, transparent 1px),
    linear-gradient(to bottom, oklch(0.2 0.02 160 / 0.04) 1px, transparent 1px);
  background-size: 32px 32px;
}
```
Used on onboarding screen for a subtle technical feel.
