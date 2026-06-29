# MedBill — Security Audit Report

> **Audit date:** 2026-06-29
> **Threat model:** Single-tenant SaaS for Indian MSMEs (planned multi-tenant)
> **Current state:** Demo-grade, not production-hardened

## Executive Summary

MedBill currently has **no authentication, no authorization, no input validation, and no rate limiting**. The application is safe to run as a local demo but **must not be exposed to the internet** in its current state. This audit identifies the security work required before any production deployment.

| Severity | Finding |
|----------|---------|
| 🔴 Critical | **No authentication** — all 18 API routes are publicly callable |
| 🔴 Critical | **No authorization** — any caller can read/modify any business's data |
| 🔴 Critical | **No input validation** — `req.json()` consumed as `any` |
| 🔴 Critical | **No CSRF protection** on state-changing endpoints |
| 🟠 High | **No rate limiting** — brute-force / scraping unprotected |
| 🟠 High | **SQL injection** risk is low (Prisma parameterizes) but raw queries not audited |
| 🟠 High | **Secrets management** — no `.env.example`, no secret rotation plan |
| 🟡 Medium | **XSS** — React escapes by default, but `dangerouslySetInnerHTML` not audited everywhere |
| 🟡 Medium | **Audit log** exists but is not tamper-evident |
| 🟡 Medium | **PWA manifest** exposes business name in page metadata |

---

## 1. Authentication

### 1.1 Current State — None

`src/lib/auth.ts`:
```ts
export async function getActiveBusiness(): Promise<BusinessRow | null> {
  const biz = await db.business.findFirst({ orderBy: { createdAt: "asc" } });
  return biz as unknown as BusinessRow | null;
}
```

There is:
- No `next-auth` configuration (despite being a dependency)
- No session token check
- No JWT verification
- No cookie parsing
- No `Authorization` header read
- No login endpoint
- No logout endpoint

### 1.2 Required Implementation

**Strategy:** NextAuth.js v4 with JWT session strategy (stateless, scales to multi-tenant).

**Providers:**
1. **Credentials** (email + password) — for email login
2. **Phone OTP** — via an SMS provider (Twilio/MSG91)
3. **Google OAuth** — for Google login
4. **Business login** — multi-business switcher after primary auth

**Schema additions:**
- `User.passwordHash` already exists (bcrypt)
- `Session` model exists (for opaque tokens if needed)
- Add `User.otpCode`, `User.otpExpiresAt` for OTP flow
- Add `User.emailVerified`, `User.phoneVerified` booleans

**Configuration:** `src/lib/auth.config.ts`
```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  jwt: { secret: process.env.NEXTAUTH_SECRET },
  providers: [
    Credentials({ /* verify against db.user.passwordHash */ }),
    Google({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }),
  ],
  callbacks: {
    async jwt({ token, user }) { if (user) token.uid = user.id; return token; },
    async session({ session, token }) { session.user.id = token.uid; return session; },
  },
});
```

**Route protection:** Create `src/middleware.ts`:
```ts
export { default } from "next-auth/middleware";
export const config = { matcher: ["/api/((?!seed|health).*)"] };
```

**Per-route:** Replace `getActiveBusiness()` with `getCurrentBusiness(req)` that reads the JWT and resolves the active business from `BusinessMember`.

See **ADR-006** for the full authentication decision.

---

## 2. Authorization (RBAC)

### 2.1 Current State — None

`BusinessMember.role` exists with 13 roles (owner, partner, manager, cashier, sales, purchase, accountant, store_keeper, warehouse_manager, delivery, employee, auditor, ca). **No route checks this.**

### 2.2 Permission Matrix (defined in `09_PERMISSION_MATRIX.md`)

Every API route must enforce:
```ts
import { requireRole } from "@/lib/auth";

export async function POST(req: Request) {
  const { user, business } = await requireRole(req, ["owner", "manager", "sales"]);
  // ...
}
```

`requireRole` should:
1. Verify the JWT
2. Resolve the active business
3. Check `BusinessMember.role` against the allowed list
4. Throw `ApiError(403, "FORBIDDEN")` if not allowed

### 2.3 Field-Level Permissions
- A cashier should not see payroll
- An accountant should not create invoices
- These are enforced at the route level (not field level) for simplicity

---

## 3. Input Validation

### 3.1 Current State — None

All 18 routes consume `req.json()` as `any`. See `API_AUDIT.md` §3 for details.

### 3.2 SQL Injection Risk — Low

Prisma parameterizes all queries by default. **No raw SQL** is used anywhere in the codebase (verified: `grep -rn "$queryRaw\|$executeRaw" src` returns 0). The one place that uses a Prisma field reference incorrectly (`db.product.fields.minStock`) is a bug, not an injection vector.

### 3.3 Required
Add zod validation to every route. See `API_AUDIT.md` §3.3.

---

## 4. CSRF Protection

### 4.1 Current State — None

Next.js App Router route handlers do **not** have built-in CSRF protection. Any cross-origin site can POST to `/api/invoices` if the user has a cookie.

### 4.2 Required

**Strategy:** Double-submit cookie + `Origin`/`Referer` check.

**Implementation:** `src/middleware.ts`:
```ts
const allowedOrigins = [process.env.NEXT_PUBLIC_APP_URL];

export function middleware(req: NextRequest) {
  if (["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) {
    const origin = req.headers.get("origin");
    if (origin && !allowedOrigins.includes(origin)) {
      return new NextResponse("CSRF blocked", { status: 403 });
    }
  }
}
```

For JWT-in-localStorage strategy (no cookies), CSRF risk is lower (custom header required). But if we move to httpOnly cookies, CSRF protection is mandatory.

---

## 5. Rate Limiting

### 5.1 Current State — None

Any endpoint can be called unlimited times. Brute-force on login, scraping on product lists, and DoS on dashboard are all possible.

### 5.2 Required

**Library:** `@upstash/ratelimit` + `@upstash/redis` (or in-memory for single-instance).

**Limits:**
| Endpoint | Limit |
|----------|-------|
| `POST /api/auth/login` | 5/minute per IP |
| `POST /api/auth/otp` | 3/minute per phone |
| `GET /api/*` (list) | 60/minute per user |
| `POST /api/*` (mutation) | 30/minute per user |
| `POST /api/seed` | 1/hour per IP (admin only) |

---

## 6. Secrets Management

### 6.1 Current State
- `.env` contains only `DATABASE_URL=file:/home/z/my-project/db/custom.db` (not a secret)
- No `NEXTAUTH_SECRET`
- No `GOOGLE_CLIENT_ID`/`SECRET`
- No SMS provider keys
- `.env` is not confirmed in `.gitignore`

### 6.2 Required
1. Add `.env.example` with all required keys (no values)
2. Confirm `.env` is in `.gitignore`
3. Generate `NEXTAUTH_SECRET` with `openssl rand -base64 32`
4. Document secret rotation in `15_SECURITY_GUIDE.md`
5. Never commit secrets — use a secret manager in production (Doppler, Vault)

---

## 7. XSS

### 7.1 Current State — Low Risk

React escapes all interpolated values by default. **No `dangerouslySetInnerHTML`** usage found (verified: `grep -rn "dangerouslySetInnerHTML" src` returns 0).

### 7.2 Potential Vectors
- **Invoice notes / terms** — user-entered text rendered in invoice viewer. React escapes ✅
- **Party name** — rendered in lists and statements. React escapes ✅
- **Audit log metadata** — rendered in `<pre>` with `JSON.stringify`. Safe ✅
- **WhatsApp share** — constructs a URL with `encodeURIComponent`. Safe ✅

### 7.3 Content Security Policy
No CSP header is set. **Required:**
```ts
// next.config.ts
const csp = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:;";
```
Add via `headers()` in `next.config.ts`.

---

## 8. Data Exposure

### 8.1 PII Stored
- User: name, email, phone
- Party: name, phone, email, GSTIN, PAN, address
- Business: GSTIN, PAN, address

### 8.2 Encryption at Rest
SQLite file at `db/custom.db` is **unencrypted**. For production:
- Use SQLite SEE (encrypted extension) or
- Migrate to PostgreSQL with `pgcrypto` or
- Use disk encryption (LUKS/EBS) at the infrastructure layer

### 8.3 Encryption in Transit
- Local dev: HTTP (acceptable)
- Production: HTTPS via Caddy/reverse proxy (mandatory)
- HSTS header required

### 8.4 Log Scrubbing
Prisma query logging (`log: ['query']`) can leak PII in logs (e.g., `WHERE phone = '9820011223'`). **Disable in production.**

---

## 9. Audit Log Integrity

### 9.1 Current State
`AuditLog` model exists and records `action`, `entity`, `summary`, `metadata`, `userId`, `ip`. `recordAudit()` is called in 3 places (invoice create, payment, quotation create/convert).

### 9.2 Gaps
- **Not tamper-evident** — any DB write can modify/delete audit logs
- **Not comprehensive** — only 3 of 18 routes log actions
- **No IP capture** — `recordAudit` accepts `ip` but no route passes it
- **No user agent** — not captured

### 9.3 Required
1. Call `recordAudit()` in every mutating route (POST/PATCH/DELETE)
2. Capture `ip` from `req.headers.get("x-forwarded-for")`
3. Capture `userAgent` from `req.headers.get("user-agent")`
4. Append-only enforcement: revoke DELETE/UPDATE permissions on `AuditLog` table at the DB role level
5. Consider a hash chain (`prevHash + currentData → hash`) for tamper-evidence

---

## 10. Dependency Vulnerabilities

**No `bun audit` or `npm audit` run.** Required:
```bash
bun audit
```
Add to CI. Known concerns:
- `next-auth` v4 — ensure latest patch (v5 is alpha; v4 is stable)
- `prisma` — keep current
- Review transitive deps quarterly

---

## 11. PWA & Client Security

- **Manifest** exposes business name (acceptable — public info)
- **Service worker** not yet implemented (planned for offline — must not cache PII)
- **localStorage** stores `business` object (business name, GSTIN) — acceptable, not PII-sensitive
- **IndexedDB** planned for offline cache — must encrypt sensitive fields

---

## 12. Remediation Checklist

| Priority | Item | Effort |
|----------|------|--------|
| P0 | Implement NextAuth (Credentials + Google + OTP) | L |
| P0 | Add `requireRole` middleware + apply to all routes | M |
| P0 | Add zod validation to all routes (closes injection surface) | M |
| P0 | Disable Prisma query logging in production | XS |
| P0 | Add CSRF protection (Origin check) | S |
| P0 | Add `.env.example` + confirm `.gitignore` | XS |
| P1 | Add rate limiting (`@upstash/ratelimit`) | S |
| P1 | Add CSP header in `next.config.ts` | XS |
| P1 | Call `recordAudit()` in all mutating routes | M |
| P1 | Capture IP + user agent in audit log | XS |
| P1 | Add HSTS header | XS |
| P2 | Encrypt SQLite at rest (SEE) or migrate to Postgres | L |
| P2 | Add hash-chain to audit log for tamper-evidence | M |
| P2 | Run `bun audit` in CI | XS |
| P3 | Add service worker with encrypted cache | L |

---

## 13. Compliance Notes (India)

- **GST invoice data** must be retained for 6 years (GST Act). Ensure backup retention matches.
- **PAN/GSTIN** are sensitive — treat as PII.
- **Digital signatures** on invoices are optional for B2C but required for B2B e-invoice (IRN/QR). Not implemented — out of scope for Phase 2.
- **Data localization** — if using cloud DB, ensure data stays in India region.

---

**This audit feeds into `15_SECURITY_GUIDE.md`, `09_PERMISSION_MATRIX.md`, and ADR-006 (Authentication).**
