# ADR-001: Next.js 16 with Single-Route SPA

> **Status:** Accepted
> **Date:** 2026-06-29
> **Decision makers:** Architecture team

## Context

MedBill is deployed in a sandbox environment that exposes **only one route** (`/`) to end users. The environment provides a Next.js 16 scaffold with App Router, Prisma, SQLite, and shadcn/ui. The deployment gateway (Caddy) routes all traffic to the Next.js dev server on port 3000.

The product vision requires:
- 12+ distinct "pages" (dashboard, sales, POS, inventory, parties, reports, GST, settings, etc.)
- Sub-100ms navigation between pages
- 120 FPS scrolling
- Offline-capable (PWA)

## Problem

How do we deliver a multi-"page" ERP experience within a single-route constraint, while meeting performance targets?

## Alternatives Considered

### Alternative A: Multiple Next.js routes (`/dashboard`, `/sales`, `/inventory`, ...)

**Rejected because:** The environment only exposes `/`. Other routes would not be reachable by end users. (Note: the scaffold does allow defining routes, but only `/` is user-visible per the constraint.)

**Pros:** Standard Next.js patterns, SSR/SSG per route, clean URLs.
**Cons:** Violates the single-route constraint.

### Alternative B: Hash-based routing (`/#/dashboard`, `/#/sales`)

**Pros:** Single route, browser back/forward works.
**Cons:** Hash routing is legacy, breaks SSR, hurts SEO (not relevant for an ERP but bad practice), and Next.js App Router doesn't natively support hash routing.

### Alternative C: Client-side view switching via state (Zustand)

**Selected.** The root `page.tsx` is a client component that reads a `view` key from a Zustand store and renders the corresponding view component. Views are lazy-loaded via `next/dynamic` for code splitting.

**Pros:**
- Instant navigation (state change, no network)
- Code-split per view (separate JS chunks)
- Works within single-route constraint
- Zustand is lightweight and persisted
- Supports deep "linking" via `viewParams` (e.g., open a specific invoice)

**Cons:**
- No SSR for view content (loses SEO — irrelevant for ERP)
- All view components are client components
- No browser back/forward without manual wiring
- Initial payload includes app shell + first view

### Alternative D: React Server Components with streaming

**Rejected because:** RSC requires route segments to switch content. Within a single route, RSC can't dynamically swap the rendered tree based on client state. The view-switching pattern fundamentally requires client-side rendering.

## Decision

**Adopt Alternative C: Client-side view switching via Zustand.**

Implementation:
- `src/lib/store.ts` — Zustand store with `view: ViewKey` and `viewParams: Record<string, unknown>`
- `src/app/page.tsx` — `'use client'` component that reads `view` and renders the matching lazy-loaded component
- `src/components/views/*` — 12 view components, each `export function XView()`
- `next/dynamic` with `{ ssr: false, loading: () => <ViewSkeleton /> }` for code splitting
- `framer-motion` `AnimatePresence` for view transitions

## Consequences

### Positive
- ✅ Navigation is instant (<16ms, just a state update + animation)
- ✅ Each view is a separate JS chunk — initial load is small
- ✅ Simple mental model: one store, one switcher
- ✅ Easy to add "deep links" via `viewParams` (e.g., `{ view: "sales", viewParams: { action: "view", id: "123" } }`)
- ✅ Works with the single-route constraint

### Negative
- ❌ No SSR for view content — initial paint requires JS
- ❌ All views are client components — can't use Server Components for view logic
- ❌ Browser back/forward doesn't work (no URL change). **Mitigation:** Could sync `view` to `history.pushState` in a future phase.
- ❌ `viewParams` is `Record<string, unknown>` — requires casts. **Mitigation:** Phase 3 will type it as a discriminated union.
- ❌ Deep links can't be shared (no URL). **Mitigation:** Acceptable for an ERP; users share invoices via PDF/WhatsApp instead.

### Neutral
- The app shell (sidebar, topbar, command palette) is always mounted — state persists across view switches
- TanStack Query cache persists across view switches — no refetch when returning to a view

## Future Review Criteria

Revisit this decision if:
1. The single-route constraint is lifted (then migrate to multi-route App Router)
2. SEO becomes a requirement (unlikely for an ERP)
3. Browser back/forward becomes a user complaint (add `pushState` sync)
4. The view count exceeds ~30 (consider view grouping)

## References

- Next.js App Router docs: https://nextjs.org/docs/app
- Zustand docs: https://docs.pmnd.rs/zustand
- `src/app/page.tsx` — implementation
- `src/lib/store.ts` — store definition
- `02_SYSTEM_ARCHITECTURE.md` — architecture overview
