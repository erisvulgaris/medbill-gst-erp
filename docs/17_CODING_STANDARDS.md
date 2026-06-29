# 17 — Coding Standards

> **Status:** Mandatory for all new code
> **Enforcement:** ESLint + TypeScript + PR review

## 1. TypeScript

### 1.1 Strict Mode
- `strict: true` in `tsconfig.json` (already set)
- Never use `any` in new code — use `unknown` + type narrowing, or proper types
- Target: reduce existing 76 `any` usages to <20 by Phase 3

### 1.2 Type Definitions
- **Server types:** Infer from Prisma (`db.invoice.findFirst()` returns the right type)
- **API schemas:** Use `z.infer<typeof schema>` from zod schemas (Phase 3)
- **Shared types:** Define in `src/lib/types.ts` (create if needed)
- **Component props:** Always define an `interface Props` or `type Props`

### 1.3 Naming
- **Files:** `kebab-case.tsx` / `kebab-case.ts` (e.g., `invoice-editor.tsx`)
- **Components:** `PascalCase` (e.g., `InvoiceEditor`)
- **Functions:** `camelCase` (e.g., `computeLine`)
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `GST_RATES`)
- **Types/Interfaces:** `PascalCase` (e.g., `LineInput`, `DocumentTotals`)
- **Hooks:** `useThing` (e.g., `useBootstrapBusiness`)

## 2. React & Next.js

### 2.1 Client vs Server Components
- Default to Server Components
- Add `'use client'` only when: using hooks (useState, useEffect, useQuery), event handlers, browser APIs, or framer-motion
- The single-route SPA constraint means `page.tsx` and all views are client (ADR-001)

### 2.2 Hooks Rules
- Never call hooks conditionally or after early returns (rules-of-hooks)
- If a component needs an early return, split into a router + content component (see `parties-view.tsx`)
- Use `useCallback` for functions passed as props to memoized children
- Use `useMemo` for expensive computations (not for trivial ones)

### 2.3 Data Fetching
- **Server state:** Always use TanStack Query (`useQuery` / `useMutation`)
- Never use `useState` + `useEffect` + `fetch` for server data (use `useQuery` instead)
- **Query keys:** `["resource", ...params]` (e.g., `["invoices", search, status]`)
- **Invalidation:** `queryClient.invalidateQueries({ queryKey: ["resource"] })` after mutations

### 2.4 Component Size
- Target: <300 LOC per component file
- If larger, split into sub-components in the same directory
- Extract reusable patterns to `src/components/app/`

## 3. API Routes

### 3.1 Structure
Every route handler must:
1. Authenticate (Phase 3: `getCurrentBusiness(req)`)
2. Validate input (Phase 3: zod `safeParse`)
3. Try/catch with `withErrorHandler` (Phase 3)
4. Return standardized envelope
5. Log mutations via `recordAudit()`

### 3.2 Status Codes
| Code | When |
|------|------|
| 200 | Successful GET, PATCH |
| 201 | Successful POST (create) |
| 204 | Successful DELETE |
| 400 | Bad request (malformed JSON) |
| 401 | Not authenticated |
| 403 | Not authorized (RBAC) |
| 404 | Resource not found |
| 409 | Conflict (duplicate) |
| 422 | Validation error (zod) |
| 429 | Rate limited |
| 500 | Internal error |

### 3.3 Naming
- Route files: `src/app/api/{resource}/route.ts` (list/create) or `src/app/api/{resource}/[id]/route.ts` (get/update/delete)
- Resource names: plural (`invoices`, `products`, `parties`) — not singular

## 4. Database (Prisma)

### 4.1 Schema
- Every model has: `id`, `createdAt`, `updatedAt`, `deletedAt` (for entities)
- Every model has `businessId` (tenant isolation)
- Use `@@index` on frequently queried fields
- Use `@@unique` for natural keys (e.g., `[businessId, number]`)
- Soft-delete: set `deletedAt: new Date()`, never hard-delete entities
- Never use `Float` for money — use `Decimal` (Phase 3 migration)

### 4.2 Queries
- Always filter by `businessId` (tenant isolation)
- Use `Promise.all` for independent queries
- Avoid N+1: use `include` or batch queries
- Never use `db.{model}.fields.{name}` as a value — it's a field reference

## 5. Styling

### 5.1 Design System
- Use shadcn/ui components from `src/components/ui/`
- Use design tokens from `globals.css` (`bg-primary`, `text-muted-foreground`, etc.)
- **No indigo or blue colors** (per project constraint)
- Use `tnum` class on all numeric/finance displays

### 5.2 Tailwind
- Use utility classes, not custom CSS (except in `globals.css`)
- Responsive: mobile-first (`sm:`, `md:`, `lg:`, `xl:`)
- Spacing: `p-4` or `p-6` for cards, `gap-3` or `gap-4` for grids
- Typography: use bracket notation for non-standard sizes (`text-[13px]`)

### 5.3 Animation
- Use framer-motion, not CSS animations (except `globals.css` utilities)
- Animate `transform` + `opacity` only (GPU-accelerated)
- Respect `prefers-reduced-motion` (handled in `globals.css`)

## 6. Testing

### 6.1 What to Test
- **Pure libs (gst, format):** 100% coverage — unit tests
- **API routes:** Integration tests with test DB
- **Critical flows:** E2E with Playwright (invoice create→pay→view, POS checkout)
- **Accessibility:** axe-core on every view

### 6.2 What Not to Test
- shadcn/ui primitives (vendored, tested upstream)
- Trivial components (pure presentational, <20 LOC)

### 6.3 Test Naming
- Unit: `src/lib/gst.test.ts`
- Component: `src/components/app/invoice-editor.test.tsx`
- E2E: `e2e/invoice-create.spec.ts`

## 7. Git & Commits

### 7.1 Branch Naming
- `feat/{description}` — new features
- `fix/{description}` — bug fixes
- `docs/{description}` — documentation only
- `refactor/{description}` — code restructuring

### 7.2 Commit Messages
```
type(scope): subject

body (optional)

footer (optional)
```
Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`
Scope: `gst`, `invoice`, `pos`, `db`, `api`, etc.

Example: `feat(invoice): add collect payment dialog`

## 8. Code Review Checklist

- [ ] No `any` types
- [ ] No `console.log` (use structured logger)
- [ ] ESLint passes
- [ ] TypeScript passes (`tsc --noEmit`)
- [ ] Tests written and passing
- [ ] `data-testid` on interactive elements
- [ ] Loading state (Skeleton)
- [ ] Error state (ErrorBoundary or local catch)
- [ ] Empty state (designed)
- [ ] Responsive (mobile + desktop)
- [ ] Dark mode works
- [ ] No hardcoded business/user identity
- [ ] Documentation updated (if behavior changed)

## 9. File Organization

```
src/
├── app/
│   ├── api/{resource}/route.ts       # REST endpoints
│   ├── page.tsx                      # SPA entry
│   ├── layout.tsx                    # Root layout
│   ├── error.tsx                     # Error boundary
│   └── globals.css                   # Design tokens
├── components/
│   ├── app/                          # App-specific components
│   │   ├── error-boundary.tsx
│   │   ├── invoice-editor.tsx
│   │   └── ...
│   ├── views/                        # One per major view
│   │   ├── dashboard-view.tsx
│   │   └── ...
│   └── ui/                           # shadcn/ui (don't modify)
├── lib/                              # Shared libraries
│   ├── gst.ts                        # Pure
│   ├── format.ts                     # Pure
│   ├── store.ts                      # Client
│   ├── api.ts                        # Client
│   ├── auth.ts                       # Server
│   ├── audit.ts                      # Server
│   ├── db.ts                         # Server
│   ├── nav.ts                        # Pure
│   └── utils.ts                      # Pure
└── hooks/                            # React hooks
```

## 10. Prohibited Patterns

| Pattern | Why | Alternative |
|---------|-----|-------------|
| `any` type | Loses type safety | `unknown` + narrowing |
| `console.log` in committed code | Floods output | Remove or use logger |
| `useState` + `useEffect` + `fetch` | No cache, no dedup | `useQuery` |
| `dangerouslySetInnerHTML` | XSS risk | React escapes by default |
| Inline `style={{}}` for layout | Not responsive | Tailwind classes |
| Hardcoded user/business name | Not multi-tenant | Use auth context |
| `db:push` in production | No migration history | `prisma migrate deploy` |
| `Float` for money | Precision errors | `Decimal` or integer paise |
| `ignoreBuildErrors: true` | Hides bugs | Fix the errors |
