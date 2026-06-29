# 00 — Project Overview

> **Document status:** Single source of truth
> **Last updated:** 2026-06-29
> **Version:** Phase 2 (Architecture Stabilization)

## What is MedBill?

MedBill is a **production-grade GST billing and business management ERP** for Indian MSMEs (Micro, Small & Medium Enterprises). It targets retail shops, wholesalers, distributors, manufacturers, medical stores, restaurants, salons, service businesses, and freelancers across 24+ industries.

The application adapts its dashboard, navigation, reports, and modules to the selected industry during onboarding — no unnecessary modules appear for a service business, and inventory-heavy businesses get full stock tracking.

## Target Users

| Industry | Example | Key modules |
|----------|---------|-------------|
| Retail Shop | Kirana, electronics, garments | POS, inventory, GST |
| Wholesale / Distributor | FMCG, auto parts | Inventory, GST, party credit |
| Medical / Pharmacy | Pharmacy | Expiry tracking, batch, GST |
| Restaurant / Café | F&B | POS, inventory (light) |
| Salon / Spa | Service | POS, CRM, no inventory |
| Manufacturer | Production | Manufacturing, inventory, GST |
| Service / Freelancer | Consultant | Invoicing, GST, no inventory |

## Problem Statement

Indian MSMEs need billing software that is:
- **Fast** — feels like a native app, sub-100ms interactions
- **GST-compliant** — correct CGST/SGST/IGST, GSTR-1, HSN summaries
- **Adaptive** — customizes to industry without bloat
- **Offline-capable** — works without internet (planned)
- **Affordable** — solo-founder maintainable

Existing products (myBillBook, Vyapar, Swipe, Marg, Tally) serve this market but MedBill aims to improve usability, performance, and onboarding.

## Technology Stack

| Layer | Technology | Why |
|-------|------------|-----|
| Framework | Next.js 16 (App Router) | RSC, edge-ready, Turbopack |
| Language | TypeScript 5 | Type safety |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) | Premium design system, no Material UI |
| Database | SQLite via Prisma 6 | Single-file, zero-config, MSME-scale |
| State | Zustand (client) + TanStack Query (server) | Minimal boilerplate, cache-first |
| Forms | React Hook Form + Zod | Validation-first |
| Charts | Recharts | Declarative, React-native |
| Animation | Framer Motion | GPU-accelerated, transform/opacity only |
| Icons | Lucide React | Tree-shakeable |
| Auth | NextAuth.js v4 (planned) | JWT, multi-provider |

**Constraints (from environment):** Single-route SPA at `/` (only user-visible route). All other "routes" are client-side view switches via Zustand. See ADR-001.

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────────┐
│  Browser (single route: /)                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ App Shell    │  │ View Layer   │  │ Shared Libs  │   │
│  │ (sidebar,    │  │ (12 views,   │  │ (gst, format,│   │
│  │  topbar,     │  │  lazy-loaded)│  │  store, api) │   │
│  │  cmd palette)│  │              │  │              │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         │  Zustand store  │  TanStack Query │           │
│         └────────┬─────────┴────────┬────────┘           │
│                  │  fetch()         │                    │
└──────────────────┼──────────────────┼────────────────────┘
                   │                  │
                   ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│  Next.js API Routes (18 endpoints)                      │
│  /api/business /api/dashboard /api/invoices ...         │
│  Each calls Prisma → SQLite                             │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│  SQLite (db/custom.db) — 22 Prisma models              │
└─────────────────────────────────────────────────────────┘
```

## Current State (Phase 2 baseline)

| Area | Status |
|------|--------|
| Features | 12 views, 18 API routes, 22 models — feature-complete for Phase 1 |
| Design | Premium emerald theme, responsive, dark mode, PWA manifest |
| Auth | ❌ Not implemented (single-tenant demo) |
| Validation | ❌ No zod usage |
| Tests | ❌ None |
| Docs | ✅ This set (Phase 2) |
| Performance | 🟡 Code-split, but no virtualization or optimistic updates |
| Security | ❌ No auth, no rate limiting |

See `AUDIT_REPORT.md` for the full baseline.

## Roadmap

See `19_BACKLOG.md` for the prioritized backlog. High-level:

1. **Phase 2 (current):** Documentation, audits, ADRs, targeted refactoring
2. **Phase 3:** Authentication, validation, error handling, testing infrastructure
3. **Phase 4:** Virtualization, optimistic updates, offline mode, PWA service worker
4. **Phase 5:** Real auth providers (OTP, Google), multi-tenant, RBAC enforcement
5. **Phase 6:** Advanced modules (Payroll, Manufacturing, CRM), e-invoicing (IRN/QR)

## Repository Structure

```
medbill/
├── docs/                      # This documentation set (source of truth)
│   ├── architecture_decisions/  # ADRs
│   ├── AUDIT_REPORT.md
│   ├── DATABASE_AUDIT.md
│   ├── API_AUDIT.md
│   ├── FRONTEND_AUDIT.md
│   ├── SECURITY_AUDIT.md
│   ├── PERFORMANCE_REPORT.md
│   ├── TESTING_REPORT.md
│   └── 00_PROJECT_OVERVIEW.md ... 20_CHANGELOG.md
├── prisma/
│   └── schema.prisma          # 22 models — see 03_DATABASE_SPECIFICATION.md
├── src/
│   ├── app/
│   │   ├── api/               # 18 REST endpoints — see 04_API_SPECIFICATION.md
│   │   ├── page.tsx           # Single-route SPA entry
│   │   ├── layout.tsx         # Root layout (fonts, theme, query providers)
│   │   └── globals.css        # Design tokens — see 05_DESIGN_SYSTEM.md
│   ├── components/
│   │   ├── app/               # App shell + feature components
│   │   ├── views/             # 12 view components
│   │   └── ui/                # shadcn/ui primitives
│   ├── lib/                   # Shared libs (gst, format, store, api, audit, auth)
│   └── hooks/                 # React hooks
├── public/                    # Static assets, PWA manifest
├── prisma/                    # Schema
└── worklog.md                 # Living development log
```

## How to Read This Documentation

| If you are... | Start with |
|---------------|------------|
| A new engineer onboarding | `00_PROJECT_OVERVIEW.md` → `02_SYSTEM_ARCHITECTURE.md` → `17_CODING_STANDARDS.md` |
| Building a new feature | `01_PRD.md` → `10_BUSINESS_RULES.md` → `04_API_SPECIFICATION.md` → `06_COMPONENT_LIBRARY.md` |
| Fixing a bug | `20_CHANGELOG.md` → `AUDIT_REPORT.md` → relevant spec doc |
| Reviewing a PR | `17_CODING_STANDARDS.md` → `18_RELEASE_PROCESS.md` |
| Auditing security | `SECURITY_AUDIT.md` → `15_SECURITY_GUIDE.md` → ADR-006 |
| Understanding GST logic | `11_GST_ENGINE.md` → `src/lib/gst.ts` |
| Deploying | `18_RELEASE_PROCESS.md` → `14_PERFORMANCE_GUIDE.md` |

## Principles

1. **Documentation is the single source of truth.** If it's not documented, it doesn't exist.
2. **Every feature follows the 12-step workflow** (see `18_RELEASE_PROCESS.md`).
3. **No `any` types in new code.** Use Zod + inferred types.
4. **No new client components unless interactivity is required.** Prefer Server Components.
5. **Every API route validates input, authenticates, and handles errors.**
6. **Tests before shipping.** 95% coverage on business logic.
7. **Performance budget: <150 KB critical JS, <100ms interactions.**
8. **Emerald design system only.** No indigo/blue. No Material UI.

## Contact

This is a solo-founder project. All decisions are documented in ADRs. Questions → consult the relevant doc; if unanswered, open an issue and create a new ADR.
