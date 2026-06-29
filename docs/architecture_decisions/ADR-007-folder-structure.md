# ADR-007: Folder Structure

> **Status:** Accepted
> **Date:** 2026-06-29

## Context
A solo-founder project needs a folder structure that is predictable, scales to 50+ files per layer, and follows Next.js App Router conventions.

## Problem
Define the canonical folder structure for `src/`.

## Decision
Feature-first structure with clear layer boundaries:

```
src/
├── app/                      # Next.js App Router
│   ├── api/                  # Route Handlers (REST endpoints)
│   │   ├── invoices/
│   │   │   ├── route.ts      # GET, POST
│   │   │   └── [id]/route.ts # GET, PATCH, DELETE
│   │   └── ...
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Single-route SPA entry
│   └── globals.css           # Design tokens
├── components/
│   ├── app/                  # App-specific (sidebar, topbar, views, editors)
│   ├── views/                # One file per major view
│   └── ui/                   # shadcn/ui primitives (vendored)
├── lib/                      # Shared libraries (pure + client + server)
│   ├── gst.ts                # Pure — GST engine
│   ├── format.ts             # Pure — formatters
│   ├── store.ts              # Client — Zustand
│   ├── api.ts                # Client — fetch wrapper
│   ├── auth.ts               # Server — getActiveBusiness (TODO: real auth)
│   ├── audit.ts              # Server — recordAudit
│   ├── db.ts                 # Server — Prisma client
│   ├── nav.ts                # Pure — nav config
│   └── utils.ts              # Pure — cn() class merge
└── hooks/                    # React hooks
```

### Rules
1. **Pure libs** (`gst`, `format`, `nav`, `utils`) — no client/server imports. Testable in isolation.
2. **Client libs** (`store`, `api`) — use `'use client'` implicitly via hooks. Import only from pure libs.
3. **Server libs** (`auth`, `audit`, `db`) — import Prisma. Never imported by client code.
4. **Views** — one file per view. If a view grows >300 LOC, split into a directory.
5. **App components** — feature components used by views (editors, viewers, dialogs).
6. **UI components** — shadcn primitives only. Don't modify unless upgrading.

## Consequences
### Positive
- ✅ Predictable — a new engineer can find any file by feature
- ✅ Pure libs are easily unit-tested (no mocking)
- ✅ Clear client/server boundary prevents accidental server-code-in-client bugs
- ✅ Views are self-contained — easy to lazy-load

### Negative
- ❌ Some duplication (e.g., `StatusBadge` defined in multiple views — fix by extracting to `components/app/`)
- ❌ `components/app/` mixes shell + feature components — Phase 4: split into `shell/` and `features/`

## Future Review
Revisit if:
1. File count exceeds 200 (introduce feature subfolders)
2. Shared feature components proliferate (introduce `components/features/`)
3. Multiple apps are added (monorepo with `packages/`)

## References
- `02_SYSTEM_ARCHITECTURE.md`
- `17_CODING_STANDARDS.md`
