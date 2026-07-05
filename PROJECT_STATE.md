# MedBill — Project State

> **Last updated:** 2026-07-05
> **Status:** Production-hardening in progress
> **Phase:** Sprint 1 (Production Foundation) + Autonomous Improvement

## Architecture Summary
- **Framework:** Next.js 16 (App Router, single-route SPA at `/`)
- **Database:** SQLite via Prisma 6 (24 models)
- **Auth:** JWT-based with bcrypt password hashing (login, register, logout, me, switch-business, OTP stubs)
- **Admin:** Super admin panel at `/admin` with subscription management (3 tiers: ₹599/₹2,999/₹9,999)
- **API:** 33 routes, 32 using `apiHandler` (standardized envelope, error handling, request IDs)
- **Validation:** Zod schemas on all POST/PATCH routes
- **Security:** CSP, HSTS, CSRF, X-Frame-Options, request IDs, rate limiting (framework)
- **Tests:** 214 passing (9 files: gst, format, utils, nav, auth, schemas, industry-profiles, permissions, api-integration)
- **Docs:** 56 markdown files + 8 screenshots
- **UI:** 12 views + admin panel, emerald design system, dark mode, responsive

## Completed Improvements
1. ✅ Authentication system (password, JWT, cookies, 5 auth routes)
2. ✅ RBAC framework (13 roles, permission matrix, requireRole)
3. ✅ Validation layer (8 zod schemas, all routes validate)
4. ✅ Error handling (apiHandler on 32/33 routes, standardized envelope)
5. ✅ Security middleware (CSP, HSTS, CSRF, request IDs, .env.example)
6. ✅ Industry Profile Engine (14 industries, wired into onboarding + dashboard)
7. ✅ Admin panel (login, dashboard, businesses, users, subscriptions, plans)
8. ✅ Subscription system (3 tiers, ₹599/₹2,999/₹9,999, plan change, trial)
9. ✅ Frontend API envelope compatibility (api.ts unwraps json.data)
10. ✅ Keyboard shortcuts (Cmd+K, Cmd+N, Cmd+P, Cmd+B)
11. ✅ Sidebar plan badge (Enterprise ₹9,999/yr with crown icon)
12. ✅ Admin panel dark mode toggle
13. ✅ All 11 main app views verified with real data
14. ✅ All 18+ API endpoints return HTTP 200 with standardized envelope
15. ✅ VLM rating: 8/10 for dashboard visual quality

## Pending Work
1. ❌ Subscription enforcement (block operations if suspended)
2. ❌ Export CSV on sales/invoices view
3. ❌ Pagination on list views
4. ❌ List virtualization (@tanstack/react-virtual)
5. ❌ Playwright e2e tests
6. ❌ Lighthouse CI
7. ❌ Bundle analyzer
8. ❌ OpenAPI spec generation
9. ❌ Mobile-responsive admin panel
10. ❌ Float → Decimal migration (78 columns)
11. ❌ Real OTP/Google OAuth (stubs exist)
12. ❌ Offline mode (service worker, IndexedDB)

## Known Issues
1. Server instability in sandbox (dies after ~30s, needs keepalive)
2. ChunkLoadError on lazy-loaded views (caught by ErrorBoundary)
3. Previous cron jobs failed (exec limits exceeded, empty payloads)
4. `ignoreBuildErrors: true` in next.config (hides TS errors)
5. 80 `any` types in codebase (target: <20)

## Architecture Decisions
- Single-route SPA (ADR-001) — only `/` is user-visible, views switch via Zustand
- SQLite (ADR-003) — sufficient for MSME scale (~500k invoices)
- Zustand + TanStack Query (ADR-004) — clear separation of UI vs server state
- JWT auth (ADR-006) — stateless, HMAC-signed tokens, httpOnly cookies
- Demo fallback in dev mode — getBusinessContext falls back to first business

## Admin Credentials
```
URL: http://localhost:3000/admin
Email: admin@medbill.in
Password: Admin@MedBill2026
```

## Subscription Plans
| Plan | Price | Users | Products | Branches |
|------|-------|-------|----------|----------|
| Starter | ₹599/yr | 1 | 50 | 1 |
| Professional | ₹2,999/yr | 5 | 500 | 2 |
| Enterprise | ₹9,999/yr | Unlimited | Unlimited | Unlimited |
