# ADR-009: Offline-First Strategy

> **Status:** Proposed (not yet implemented)
> **Date:** 2026-06-29

## Context
Indian MSMEs often have unreliable internet. The PRD requires offline-first architecture with IndexedDB cache and background sync.

## Problem
Define the offline strategy.

## Alternatives
1. **Service Worker + Cache API** — Cache responses for offline read. Doesn't handle writes.
2. **IndexedDB + background sync** — Full offline: read from IDB, queue writes, sync when online.
3. **Replicache / ElectricSQL** — Sync engines. Powerful but complex and/or paid.

## Decision
**Service Worker (for app shell) + IndexedDB (for data) + background sync (for writes).** Phase 4 implementation.

### Architecture
- **App shell:** Service Worker caches HTML, JS, CSS for offline load
- **Reads:** TanStack Query + IndexedDB persister (`@tanstack/query-sync-storage-persister`). Data fetched online is persisted to IDB; offline reads serve from IDB.
- **Writes:** Mutations queued in a `pendingMutations` IDB store. A sync worker replays them when online. Conflicts resolved last-write-wins (acceptable for single-user per business).
- **PWA:** manifest.webmanifest + service worker registration

## Consequences
### Positive
- ✅ Works fully offline (read + write)
- ✅ Fast — reads from local IDB
- ✅ Background sync is automatic (browser handles)

### Negative
- ❌ Significant complexity (conflict resolution, sync errors, queue management)
- ❌ IndexedDB schema migrations are painful
- ❌ Service worker versioning is tricky (cache invalidation)
- ❌ Storage limits (~50% of disk, varies by browser)

## Future Review
Revisit if:
1. Conflict resolution becomes a problem (consider CRDTs or Replicache)
2. Storage limits are hit (archive old data)
3. PWA install rates are low (re-evaluate ROI)

## References
- `PERFORMANCE_REPORT.md` §4
- `14_PERFORMANCE_GUIDE.md`
