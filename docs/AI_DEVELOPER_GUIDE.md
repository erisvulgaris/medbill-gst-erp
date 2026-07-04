# AI Developer Guide

> **Status:** Mandatory reading for all AI agents modifying this project
> **Read this BEFORE writing any code.**
> **Last updated:** 2026-06-30

## 1. Project Identity

**MedBill** is a production-grade GST Billing ERP for Indian MSMEs. It is NOT a demo. Every change must increase reliability, scalability, maintainability, performance, or developer productivity.

- **Stack:** Next.js 16 (App Router) + React 19 + TypeScript 5 + Prisma 6 + SQLite + shadcn/ui + Tailwind CSS 4
- **Constraint:** Single-route SPA at `/` (only user-visible route). All "pages" are client-side view switches via Zustand.
- **Design:** Premium emerald theme. NO indigo or blue.
- **Phase:** 3 (Production Hardening). Feature development is FROZEN unless fixing an incomplete workflow.

## 2. Architecture Summary

```
src/
├── app/
│   ├── api/          # 18 REST route handlers (Next.js Route Handlers)
│   ├── page.tsx      # Single-route SPA entry ('use client')
│   ├── layout.tsx    # Root layout (fonts, theme, query providers)
│   ├── error.tsx     # Global error boundary
│   └── globals.css   # Design tokens (OKLCH colors, shadows, animations)
├── components/
│   ├── app/          # MedBill-specific (sidebar, editors, viewers, error-boundary)
│   ├── views/        # 12 view components (lazy-loaded via next/dynamic)
│   └── ui/           # shadcn/ui primitives (48 files — DO NOT MODIFY)
├── lib/
│   ├── gst.ts        # Pure — GST calculation engine (100% tested)
│   ├── format.ts     # Pure — INR formatters (99% tested)
│   ├── store.ts      # Client — Zustand app store (persisted)
│   ├── api.ts        # Client — fetch wrapper
│   ├── api-error.ts  # Server — ApiError + apiHandler wrapper
│   ├── auth.ts       # Server — getActiveBusiness (Phase 4: real auth)
│   ├── audit.ts      # Server — recordAudit helper
│   ├── db.ts         # Server — Prisma client (dev-only query logging)
│   ├── nav.ts        # Pure — navigation config (100% tested)
│   ├── utils.ts      # Pure — cn() class merge (100% tested)
│   └── schemas/      # Zod validation schemas (shared client/server)
├── hooks/            # React hooks
└── scripts/          # CLI utilities (backup, restore, health check)
```

**Layer rules:**
- **Pure libs** (`gst`, `format`, `nav`, `utils`) — no client/server imports. Fully testable.
- **Client libs** (`store`, `api`) — use hooks. Import only from pure libs.
- **Server libs** (`auth`, `audit`, `db`, `api-error`) — use Prisma/Node. Never imported by client.
- **Schemas** (`lib/schemas`) — shared between client (form validation) and server (API validation).

## 3. Coding Rules

### 3.1 TypeScript
- `strict: true` — never use `any` in new code (76 existing usages being reduced)
- Infer types from Prisma: `db.invoice.findFirst()` returns the right type
- Infer types from zod: `z.infer<typeof createInvoiceSchema>`
- Target: <300 LOC per file, <250 LOC per API route

### 3.2 React
- Default to Server Components; add `'use client'` only when using hooks/event handlers
- Single-route SPA means `page.tsx` and views are client components (ADR-001)
- Never call hooks conditionally (rules-of-hooks) — split components if early return needed
- Use `useQuery` for server state, never `useState + useEffect + fetch`

### 3.3 API Routes
Every route handler must:
1. Be wrapped in `apiHandler()` (error handling + request IDs)
2. Validate input with zod schema (`safeParse` → throw `ApiError.validation`)
3. Call `getActiveBusiness()` (Phase 4: `requireRole(req, [...roles])`)
4. Filter all queries by `businessId` (tenant isolation)
5. Call `recordAudit()` on mutations
6. Return `apiSuccess(data)` or `apiList(items)` envelope

```ts
// Reference implementation pattern:
import { apiHandler, apiSuccess, ApiError } from "@/lib/api-error";
import { createInvoiceSchema } from "@/lib/schemas";

export const POST = apiHandler(async (req) => {
  const biz = await getActiveBusiness();
  if (!biz) throw ApiError.unauthorized();

  const parsed = createInvoiceSchema.safeParse(await req.json());
  if (!parsed.success) throw ApiError.validation("Invalid input", parsed.error.issues);

  // ... business logic ...
  return apiSuccess({ id: inv.id, number: inv.number });
});
```

### 3.4 Database
- Never use `db:push` in production — use `prisma migrate deploy`
- Every model has `businessId` for tenant isolation
- All money fields are Float (P0: migrating to Decimal)
- Soft-delete: set `deletedAt`, never hard-delete entities
- No raw SQL (`$queryRawUnsafe`) — use Prisma's parameterized queries

### 3.5 Styling
- Use shadcn/ui from `src/components/ui/` — don't reinvent
- Use design tokens (`bg-primary`, `text-muted-foreground`) — no raw hex colors
- NO indigo or blue
- `tnum` class on all numeric displays
- Mobile-first responsive (`sm:`, `md:`, `lg:`)
- Animate transform + opacity only (GPU-accelerated)

## 4. Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Files | kebab-case | `invoice-editor.tsx` |
| Components | PascalCase | `InvoiceEditor` |
| Functions | camelCase | `computeLine` |
| Constants | UPPER_SNAKE | `GST_RATES` |
| Types/Interfaces | PascalCase | `LineInput` |
| Hooks | useThing | `useBootstrapBusiness` |
| API routes | plural resource | `/api/invoices` |
| Zod schemas | create/update + resource | `createInvoiceSchema` |

## 5. Feature Workflow (12 steps)

See `docs/18_RELEASE_PROCESS.md` for the full process. Summary:

1. **Update documentation** — relevant spec doc(s) in `/docs/`
2. **Update ADR** if architecture changes — `/docs/architecture_decisions/`
3. **Write tests first** (TDD where practical)
4. **Implement** following coding rules above
5. **Run lint:** `bun run lint` (0 errors)
6. **Run type check:** `bunx tsc --noEmit`
7. **Run unit tests:** `bun run test` (all pass)
8. **Run e2e** (when implemented): `bun run test:e2e`
9. **Run a11y audit** (when implemented)
10. **Run performance audit** (when implemented)
11. **Update changelog:** `docs/20_CHANGELOG.md`
12. **Update worklog:** `worklog.md`

**Never skip any step.**

## 6. Testing Workflow

### 6.1 Run Tests
```bash
bun run test              # All unit tests
bun run test:watch        # Watch mode
bun run test:coverage     # Coverage report
```

### 6.2 Coverage Targets
| Module | Target |
|--------|--------|
| `src/lib/gst.ts` | 100% ✅ |
| `src/lib/format.ts` | 99% ✅ |
| `src/lib/utils.ts` | 100% ✅ |
| `src/lib/nav.ts` | 100% ✅ |
| `src/lib/schemas/` | 95% ✅ (38 tests) |
| API routes | 80% (planned) |
| Components | 75% (planned) |

### 6.3 Test File Naming
- Unit: `src/lib/gst.test.ts` (co-located)
- Component: `src/components/app/x.test.tsx` (planned)
- E2E: `e2e/x.spec.ts` (planned)

### 6.4 Writing Tests
- Test behavior, not implementation
- One assertion per test (ideally)
- Descriptive names: "computes CGST for 18% GST intra-state"
- No shared mutable state
- Use fake timers for time-dependent tests

## 7. Performance Checklist

Before marking a feature complete:

- [ ] No N+1 queries (use `Promise.all` for independent, `groupBy` for aggregations)
- [ ] `select` only needed fields in Prisma
- [ ] Lists use virtualization if >50 rows (planned: `@tanstack/react-virtual`)
- [ ] Code-split via `next/dynamic` for heavy components
- [ ] Animations use transform + opacity only
- [ ] `tnum` on all finance figures
- [ ] Skeleton loading (no spinners)
- [ | No unnecessary re-renders (`useMemo`/`useCallback` where needed)

## 8. Documentation Checklist

Before marking a feature complete:

- [ ] Updated relevant spec doc(s)
- [ ] Created/updated ADR if architecture changed
- [ ] Updated `20_CHANGELOG.md` (Added/Changed/Fixed)
- [ ] Updated `worklog.md`
- [ ] Updated `IMPLEMENTATION_MATRIX.md` if status changed

## 9. Common Pitfalls to Avoid

### 9.1 ❌ Don't
- Add `any` types
- Use `console.log` in committed code
- Use `useState + useEffect + fetch` (use `useQuery`)
- Hardcode user/business identity ("Rahul")
- Use `db:push` in production
- Store money as Float (migrating to Decimal)
- Set `ignoreBuildErrors: true`
- Add indigo/blue colors
- Create new API routes without zod validation
- Skip error handling (use `apiHandler`)

### 9.2 ✅ Do
- Use zod schemas for all input
- Wrap routes in `apiHandler`
- Filter by `businessId` on every query
- Call `recordAudit` on mutations
- Use shadcn/ui components
- Write tests before implementation
- Update docs before claiming complete
- Verify with evidence (test result, screenshot, log)

## 10. Verification Commands

```bash
# Full quality check before committing
bun run lint                    # ESLint (0 errors)
bunx tsc --noEmit               # TypeScript check
bun run test                    # Unit tests (176 pass)
bun run test:coverage           # Coverage report
bun run db:health               # Database integrity
curl -s http://localhost:3000/  # Server health

# Development
bun run dev                     # Start dev server (port 3000)
bun run db:backup               # Backup database
bun run db:health               # Check DB integrity
```

## 11. Current State (Honest Assessment)

| Area | Status | Evidence |
|------|--------|----------|
| Documentation | ✅ Complete | 38 markdown files in /docs/ |
| Unit tests | ✅ 176 passing | gst 100%, format 99%, schemas 38 tests |
| Database migrations | ✅ Baseline | `prisma/migrations/0_init/` |
| Backup/restore/health | ✅ Scripts work | `scripts/*.ts` |
| API error handling | ✅ Framework ready | `src/lib/api-error.ts` |
| Zod schemas | ✅ All resources | `src/lib/schemas/index.ts` |
| CI/CD | 🟡 Workflow written | `.github/workflows/ci.yml` (not yet run) |
| Authentication | ❌ Not implemented | `getActiveBusiness` returns first business |
| RBAC enforcement | ❌ Not implemented | 0/18 routes check role |
| Routes using validation | ❌ 0/18 | Schemas ready, routes not refactored |
| E2E tests | ❌ Not implemented | Playwright not installed |
| Offline mode | ❌ Not implemented | No service worker |
| Virtualization | ❌ Not installed | `@tanstack/react-virtual` missing |

## 12. When You're Done

Before reporting completion:

1. Run all verification commands (§10)
2. Check the IMPLEMENTATION_MATRIX for your changed items
3. Update worklog.md with evidence (test results, screenshots, logs)
4. Update changelog
5. Be honest — if something is incomplete, mark it ❌

**Never claim "production-ready" without evidence.** Every claim must include a test result, benchmark, screenshot, report, log, or generated artifact.

## 13. Key Files to Read First

1. `docs/IMPLEMENTATION_MATRIX.md` — what's done vs missing
2. `docs/02_SYSTEM_ARCHITECTURE.md` — how it fits together
3. `docs/17_CODING_STANDARDS.md` — rules
4. `docs/10_BUSINESS_RULES.md` — domain logic
5. `docs/11_GST_ENGINE.md` — the core differentiator
6. `worklog.md` — recent history
7. This file (`docs/AI_DEVELOPER_GUIDE.md`)

## 14. Getting Help

- Architecture question → read the relevant ADR in `/docs/architecture_decisions/`
- Domain logic question → `docs/10_BUSINESS_RULES.md` + `11_GST_ENGINE.md`
- API contract → `docs/04_API_SPECIFICATION.md`
- Design system → `docs/05_DESIGN_SYSTEM.md`
- Security → `docs/15_SECURITY_GUIDE.md`
- Testing → `docs/16_TESTING_GUIDE.md`
- Backlog priorities → `docs/19_BACKLOG.md`
