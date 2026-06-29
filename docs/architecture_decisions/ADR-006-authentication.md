# ADR-006: Authentication Strategy

> **Status:** Proposed (not yet implemented)
> **Date:** 2026-06-29

## Context
MedBill currently has no authentication (`getActiveBusiness()` returns the first business). The PRD requires phone OTP, email OTP, Google login, business login, multi-business, session management, and device management.

## Problem
Choose an authentication framework and session strategy.

## Alternatives
1. **Custom JWT** — Roll our own. Maximum control, maximum risk. Easy to get wrong (timing attacks, token rotation, revocation).
2. **NextAuth.js v4 (Auth.js)** — De facto standard for Next.js. Supports Credentials, Google, phone OTP (custom provider), JWT or database sessions. Battle-tested.
3. **NextAuth.js v5 (Auth.js)** — Next gen, but still alpha/beta. Edge-compatible.
4. **Clerk** — Hosted auth. Excellent DX, but adds a dependency on a third-party service and cost.
5. **Supabase Auth** — Bundled with Supabase (Postgres). Would require migrating off SQLite.

## Decision
**NextAuth.js v4 with JWT session strategy.**

Providers:
1. **Credentials** (email + password) — for email login
2. **Google** — OAuth
3. **Custom Phone OTP** — via SMS provider (MSG91/Twilio), implemented as a Credentials provider with OTP verification step

Session: JWT (stateless, stored in httpOnly cookie). Multi-business: after primary auth, user selects active business; stored as `activeBusinessId` claim in JWT.

## Consequences
### Positive
- ✅ Industry standard — well-documented, security-audited
- ✅ JWT strategy is stateless (no session DB lookups)
- ✅ Multi-provider (email, Google, phone) supported
- ✅ Works with Next.js middleware for route protection
- ✅ Free and self-hosted (no third-party dependency)

### Negative
- ❌ JWT can't be easily revoked (mitigation: short expiry + refresh token rotation)
- ❌ Phone OTP requires an SMS provider (cost per SMS)
- ❌ NextAuth v4 is not edge-compatible (v5 is, but unstable)
- ❌ CSRF protection needed for cookie-based auth (NextAuth handles this)

## Implementation Plan (Phase 3)
1. `src/lib/auth.config.ts` — NextAuth config
2. `src/app/api/auth/[...nextauth]/route.ts` — NextAuth handler
3. `src/middleware.ts` — protect `/api/*` routes
4. `src/lib/session.ts` — `getCurrentUser()`, `getCurrentBusiness(req)`, `requireRole(req, roles[])`
5. Replace all `getActiveBusiness()` calls with `getCurrentBusiness(req)`
6. Add `User.passwordHash` (bcrypt), `User.otpCode`, `User.otpExpiresAt`
7. Login page (modals or dedicated view)

## Future Review
Revisit if:
1. NextAuth v5 stabilizes (migrate for edge compatibility)
2. Session revocation becomes a hard requirement (switch to database sessions)
3. Enterprise SSO is requested (SAML provider)

## References
- `SECURITY_AUDIT.md`
- `15_SECURITY_GUIDE.md`
- `09_PERMISSION_MATRIX.md`
