# AGENTS.md — Guide for AI Agents Working on MedBill

> **Read this file completely before making any changes to the MedBill codebase.**
> Last updated: 2026-07-06

## Project Identity

MedBill is a **production-grade GST Billing ERP for Indian MSMEs**. It is NOT a demo. Every change must increase reliability, scalability, maintainability, performance, or developer productivity.

- **Stack:** Next.js 16 (App Router) + React 19 + TypeScript 5 + Prisma 6 + SQLite + shadcn/ui + Tailwind CSS 4
- **Constraint:** Single-route SPA at `/` (only user-visible route). All "pages" are client-side view switches via Zustand.
- **Admin Panel:** Separate route at `/admin` with super admin authentication
- **Design:** Emerald theme (NO indigo or blue)
- **Repo:** https://github.com/erisvulgaris/medbill-gst-erp

## Architecture Summary

```
src/
├── app/
│   ├── admin/              # Admin panel page (/admin)
│   ├── api/                # 33 REST route handlers
│   │   ├── auth/           # 7 auth routes (login, register, logout, me, switch-business, otp)
│   │   ├── admin/          # 8 admin routes (dashboard, businesses, users, subscriptions, plans, audit)
│   │   ├── invoices/       # GET/POST + [id]/GET/DELETE
│   │   ├── products/       # GET/POST/PATCH/DELETE
│   │   ├── parties/        # GET/POST/PATCH + [id]/GET (statement)
│   │   ├── purchases/      # GET/POST
│   │   ├── quotations/     # GET/POST + [id]/GET/PATCH
│   │   ├── payments/       # GET/POST
│   │   ├── expenses/       # GET/POST
│   │   ├── reports/        # GET (6 report types)
│   │   ├── gst/            # GET (GSTR-1)
│   │   ├── audit/          # GET
│   │   ├── notifications/  # GET/PATCH
│   │   ├── business/       # GET/PATCH
│   │   ├── dashboard/      # GET (aggregated KPIs)
│   │   ├── subscription/   # GET (current plan)
│   │   └── seed/           # POST (demo data)
│   ├── page.tsx            # Single-route SPA entry ('use client')
│   ├── layout.tsx          # Root layout (fonts, theme, query providers)
│   ├── error.tsx           # Global error boundary
│   ├── globals.css         # Design tokens (OKLCH colors, shadows, animations)
│   └── middleware.ts       # Security headers + CSRF + request IDs
├── components/
│   ├── app/                # MedBill-specific components
│   │   ├── sidebar.tsx          # Desktop nav with plan badge
│   │   ├── topbar.tsx           # Search, notifications, theme toggle
│   │   ├── mobile-bottom-nav.tsx # 5-tab mobile nav
│   │   ├── command-palette.tsx  # ⌘K global search
│   │   ├── onboarding.tsx       # 4-step wizard
│   │   ├── error-boundary.tsx   # View-level error catch
│   │   ├── invoice-editor.tsx   # Create/edit invoice with live GST
│   │   ├── invoice-viewer.tsx   # Printable invoice + collect payment
│   │   ├── quotation-editor.tsx # Create quotation
│   │   ├── quotation-viewer.tsx # View + convert to invoice
│   │   ├── party-statement.tsx  # Party ledger with running balance
│   │   ├── quick-create.tsx     # Create customer/supplier/product on-the-fly
│   │   └── subscription-banner.tsx # Trial/expired/suspended warnings
│   ├── views/              # 12 view components (lazy-loaded)
│   │   ├── dashboard-view.tsx
│   │   ├── sales-view.tsx
│   │   ├── pos-view.tsx
│   │   ├── purchases-view.tsx
│   │   ├── inventory-view.tsx
│   │   ├── parties-view.tsx
│   │   ├── quotations-view.tsx
│   │   ├── expenses-view.tsx
│   │   ├── reports-view.tsx
│   │   ├── gst-view.tsx
│   │   ├── audit-view.tsx
│   │   └── settings-view.tsx
│   └── ui/                 # shadcn/ui primitives (48 files — DO NOT MODIFY)
├── lib/
│   ├── gst.ts              # Pure — GST calculation engine (100% tested)
│   ├── format.ts           # Pure — INR formatters (99% tested)
│   ├── store.ts            # Client — Zustand app store (persisted)
│   ├── api.ts              # Client — fetch wrapper (unwraps envelope)
│   ├── api-error.ts        # Server — ApiError + apiHandler wrapper
│   ├── auth.ts             # Server — JWT auth + bcrypt + RBAC
│   ├── admin-auth.ts       # Server — Super admin authentication
│   ├── business-context.ts # Server — Tenant isolation + subscription enforcement
│   ├── audit.ts            # Server — recordAudit helper
│   ├── db.ts               # Server — Prisma client (dev-only query logging)
│   ├── nav.ts              # Pure — navigation config (100% tested)
│   ├── utils.ts            # Pure — cn() class merge (100% tested)
│   ├── industry-profiles.ts # Pure — 14 industry profiles (100% tested)
│   └── schemas/            # Shared — Zod validation schemas (client + server)
├── hooks/                  # React hooks
└── scripts/                # CLI utilities (backup, restore, health check)

prisma/
├── schema.prisma           # 24 models
└── migrations/             # Migration baseline

docs/                       # 56+ documentation files
reports/                    # Improvement reports
```

## Key Rules

### 1. API Routes
Every route handler must:
- Be wrapped in `apiHandler()` (from `@/lib/api-error`)
- Validate input with zod schema (from `@/lib/schemas`)
- Use `getBusinessContext()` or `requireRoleOrDemo()` for tenant isolation
- Return `apiSuccess(data)` or `apiSuccess({ items: [...] })` envelope
- Call `recordAudit()` on mutations
- Filter all queries by `ctx.businessId` (NEVER trust client-sent businessId)

```typescript
// Reference pattern:
import { apiHandler, apiSuccess, ApiError } from "@/lib/api-error";
import { requireRoleOrDemo } from "@/lib/business-context";
import { createInvoiceSchema } from "@/lib/schemas";

export const POST = apiHandler(async (req: NextRequest) => {
  const ctx = await requireRoleOrDemo(req, ["owner", "manager", "sales"]);
  const parsed = createInvoiceSchema.safeParse(await req.json());
  if (!parsed.success) throw ApiError.validation("Invalid input", parsed.error.issues);
  // ... business logic using ctx.businessId ...
  return apiSuccess({ id: inv.id, number: inv.number }, undefined, 201);
});
```

### 2. Components
- Use shadcn/ui from `@/components/ui/` — don't reinvent
- Use design tokens (`bg-primary`, `text-muted-foreground`) — no raw hex
- NO indigo or blue colors
- `tnum` class on all numeric displays
- Mobile-first responsive (`sm:`, `md:`, `lg:`)
- Animate transform + opacity only (GPU-accelerated)
- `data-testid` on interactive elements for testing

### 3. Database
- Never use `db:push` in production — use `prisma migrate deploy`
- Every model has `businessId` for tenant isolation
- Soft-delete: set `deletedAt`, never hard-delete entities
- No raw SQL (`$queryRawUnsafe`) — use Prisma's parameterized queries

### 4. Testing
- Pure libs: 100% coverage target
- Run `bun run test` before committing
- Test naming: `src/lib/gst.test.ts` (co-located)

### 5. Git
- Commit messages: `type(scope): description` (e.g., `feat(invoice): add quick create`)
- Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`
- Never commit `.env`, `db/*.db`, `dev.log`, `screenshot-*.png`

## Admin Credentials
```
URL: http://localhost:3000/admin
Email: admin@medbill.in
Password: Admin@MedBill2026
```

## Subscription Plans
| Plan | Price | Users | Products |
|------|-------|-------|----------|
| Starter | ₹599/yr | 1 | 50 |
| Professional | ₹2,999/yr | 5 | 500 |
| Enterprise | ₹9,999/yr | Unlimited | Unlimited |

## Verification Commands

```bash
bun run lint          # ESLint (must be 0 errors)
bun run test          # 214 tests (must all pass)
bun run db:health     # 11 database checks
curl localhost:3000   # Server health
curl localhost:3000/admin  # Admin panel
```

## Current State (2026-07-06)
- 214 tests passing (9 files)
- 0 lint errors
- 33 API routes (32 using apiHandler)
- 24 Prisma models
- 12 views + admin panel (8 tabs)
- 56+ documentation files
- Industry Profile Engine (14 industries)
- Subscription system (3 tiers)
- QuickCreate (customers/suppliers/products on-the-fly)
- Keyboard shortcuts (⌘K, ⌘N, ⌘P, ⌘B)
- CSV export (sales, inventory, parties)
- Dark mode
- Mobile responsive

## What NOT to Do
- ❌ Add `any` types in new code
- ❌ Use `console.log` in committed code
- ❌ Use `useState + useEffect + fetch` (use `useQuery`)
- ❌ Hardcode user/business identity
- ❌ Use `db:push` in production
- ❌ Add indigo/blue colors
- ❌ Create routes without zod validation
- ❌ Skip error handling (use `apiHandler`)
- ❌ Commit `.env`, `db/*.db`, or screenshots
