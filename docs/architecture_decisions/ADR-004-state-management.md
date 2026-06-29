# ADR-004: State Management Strategy

> **Status:** Accepted
> **Date:** 2026-06-29

## Context

MedBill has three distinct state domains: server data (invoices, products), client UI state (active view, sidebar), and local form state. The app is a single-route SPA with 12 views.

## Problem

Choose state management libraries/patterns for each domain.

## Alternatives

1. **Redux Toolkit** — Mature, but heavy boilerplate. Overkill for a solo-founder project.
2. **Jotai/Recoil** — Atomic state. Good for fine-grained reactivity, but less ergonomic for server cache.
3. **Zustand + TanStack Query** — Minimal boilerplate, clear separation of server vs client state.
4. **React Context only** — No external deps, but Context re-renders are expensive at scale.
5. **SWR** — Alternative to TanStack Query. Simpler API, fewer features.

## Decision

**Zustand (client UI state) + TanStack Query (server state) + useState (local form state).**

### Zustand — `src/lib/store.ts`
Holds: `business`, `view`, `viewParams`, `sidebarCollapsed`, `commandOpen`, `onboarded`. Persisted to localStorage.

### TanStack Query
Holds: all API data (invoices, products, parties, dashboard, etc.). `staleTime: 30s`, `gcTime: 5min`, `refetchOnWindowFocus: false`. Mutations invalidate specific query keys.

### useState
Holds: form inputs (invoice editor, dialogs), UI toggles (filter tabs).

## Consequences

### Positive
- ✅ Clear separation: server data in Query, UI state in Zustand, forms in useState
- ✅ Zustand is 1KB, zero boilerplate
- ✅ TanStack Query gives cache, dedup, retry, stale-while-revalidate for free
- ✅ No provider hell (single `QueryProvider` + Zustand's global store)
- ✅ Persisted Zustand survives reloads (onboarding state, sidebar pref)

### Negative
- ❌ Two libraries to learn (acceptable — both are industry standard)
- ❌ Zustand's `persist` can cause stale business data if server updates (mitigation: `useBootstrapBusiness` re-fetches on mount)
- ❌ `viewParams` is `Record<string, unknown>` — untyped. Phase 3: discriminated union.
- ❌ No `useMutation` yet — mutations are inline `api()` calls + `invalidateQueries`. Phase 4: migrate to `useMutation` for optimistic updates.

## Future Review Criteria

Revisit if:
1. State sync across tabs becomes needed (Zustand `broadcastChannel` middleware)
2. Optimistic updates become complex (formalize `useMutation` patterns)
3. Server state grows complex (consider Query's `select` + normalized cache)
4. Offline mode lands (Zustand + IndexedDB sync layer)

## References
- `src/lib/store.ts`
- `src/components/query-provider.tsx`
- `02_SYSTEM_ARCHITECTURE.md` §5
