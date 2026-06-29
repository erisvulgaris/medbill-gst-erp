# 15 — Security Guide

> **Status:** Source of truth for security practices
> **Related:** `SECURITY_AUDIT.md`, ADR-006 (Authentication), `09_PERMISSION_MATRIX.md`, `17_CODING_STANDARDS.md`

## 1. Security Principles

1. **Never trust client input** — validate everything server-side with zod
2. **Authenticate before authorize** — every API route checks JWT first, then role
3. **Tenant isolation** — every query filters by `businessId` from session, never from client
4. **Least privilege** — roles grant minimum permissions needed
5. **Defense in depth** — client hides UI, server enforces, DB constrains
6. **Audit everything** — every mutation is logged
7. **Fail secure** — on error, deny access, not grant it

## 2. Authentication (Phase 3 — implementation pending)

### 2.1 Architecture
- **Framework:** NextAuth.js v4 (Auth.js)
- **Strategy:** JWT (stateless, httpOnly cookie)
- **Providers:** Credentials (email+password), Google OAuth, Phone OTP
- **Session lifetime:** 30 days
- **Token rotation:** Refresh token on each request (Phase 5)

### 2.2 Password Storage
- **Hash:** bcrypt with cost factor 12
- **Never** store plaintext passwords
- **Never** log password hashes
- Field: `User.passwordHash`

### 2.3 OTP Flow (Phone)
1. User enters phone → `POST /api/auth/otp/send` → generate 6-digit code, store `User.otpCode` + `User.otpExpiresAt` (5 min), send via SMS (MSG91/Twilio)
2. User enters code → `POST /api/auth/otp/verify` → compare, issue JWT
3. Rate limit: 3 OTP requests per phone per 10 minutes

### 2.4 JWT Claims
```json
{
  "uid": "user_cuid",
  "email": "user@example.com",
  "activeBusinessId": "biz_cuid",
  "role": "owner",
  "iat": 1234567890,
  "exp": 1237189890
}
```

### 2.5 Session Management
- **Cookie:** `next-auth.session-token`, httpOnly, secure, sameSite=lax
- **Device management:** `Session` table records deviceInfo, IP, expiresAt
- **Logout:** Revoke session (set `revokedAt`), clear cookie
- **Force logout:** Admin can revoke all sessions for a user

## 3. Authorization (RBAC)

### 3.1 Enforcement Point
Every API route:
```ts
import { requireRole } from "@/lib/auth";

export async function POST(req: Request) {
  const { user, business } = await requireRole(req, ["owner", "manager", "sales"]);
  // ... business logic using `business.id` for tenant isolation
}
```

### 3.2 `requireRole` Contract
1. Extract JWT from `Authorization: Bearer` header or cookie
2. Verify signature + expiry
3. Load `User` + active `BusinessMember`
4. Check `role` against allowed list
5. Throw `ApiError(403, "FORBIDDEN")` if denied
6. Return `{ user, business }` — **always use `business.id` from here, never from request body**
7. Log access attempt to audit log

### 3.3 Permission Matrix
See `09_PERMISSION_MATRIX.md` for the full 13-role × 9-action × 13-module matrix.

### 3.4 Tenant Isolation
**Every** Prisma query MUST filter by `businessId`:
```ts
// ✅ Correct — businessId from session
db.invoice.findMany({ where: { businessId: business.id, ... } });

// ❌ NEVER — businessId from client
db.invoice.findMany({ where: { businessId: req.body.businessId } });

// ❌ NEVER — no filter at all
db.invoice.findMany({});
```

## 4. Input Validation

### 4.1 Rule
Every `req.json()` call must be validated with a zod schema:
```ts
import { createInvoiceSchema } from "@/lib/schemas/invoice";

const parsed = createInvoiceSchema.safeParse(await req.json());
if (!parsed.success) {
  return NextResponse.json(
    { error: { code: "VALIDATION_ERROR", issues: parsed.error.issues } },
    { status: 422 }
  );
}
const data = parsed.data;
```

### 4.2 Schema Location
`src/lib/schemas/{resource}.ts` — one schema file per API resource.

### 4.3 Validation Rules
| Field | Rule |
|-------|------|
| GSTIN | `/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/` |
| PAN | `/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/` |
| Phone | `/^(\+91)?[6-9]\d{9}$/` |
| Pincode | `/^\d{6}$/` |
| Email | zod `.email()` |
| Money | `z.number().nonnegative().max(9999999999.99)` |
| Quantity | `z.number().positive()` |
| IDs | `z.string().cuid()` |

## 5. SQL Injection

### 5.1 Risk: Low
Prisma parameterizes all queries. **No raw SQL** in the codebase.

### 5.2 Rule
Never use `$queryRawUnsafe` or string-interpolated SQL. If raw SQL is needed, use `$queryRaw` with tagged template literals:
```ts
// ✅ Safe — parameterized
await db.$queryRaw`SELECT * FROM Invoice WHERE id = ${id}`;

// ❌ NEVER — SQL injection
await db.$queryRawUnsafe(`SELECT * FROM Invoice WHERE id = '${id}'`);
```

## 6. XSS

### 6.1 Risk: Low
React escapes all interpolated values by default. No `dangerouslySetInnerHTML` usage.

### 6.2 Rule
- Never use `dangerouslySetInnerHTML` without sanitization (DOMPurify)
- User-entered text (notes, terms, party names) is always rendered via React text interpolation
- Audit log metadata rendered in `<pre>` with `JSON.stringify` — safe

## 7. CSRF

### 7.1 Strategy
- **JWT in Authorization header:** CSRF-immune (cross-origin can't set custom headers)
- **JWT in httpOnly cookie:** Requires CSRF protection

### 7.2 Implementation (if cookie-based)
```ts
// src/middleware.ts
const allowedOrigins = [process.env.NEXT_PUBLIC_APP_URL];

if (["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) {
  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins.includes(origin)) {
    return new NextResponse("CSRF blocked", { status: 403 });
  }
}
```

## 8. Rate Limiting (Phase 3)

### 8.1 Library
`@upstash/ratelimit` + `@upstash/redis` (or in-memory for single instance).

### 8.2 Limits
| Endpoint | Limit | Key |
|----------|-------|-----|
| `POST /api/auth/login` | 5/min | IP |
| `POST /api/auth/otp` | 3/min | phone |
| `GET /api/*` (list) | 60/min | user ID |
| `POST /api/*` (mutation) | 30/min | user ID |
| `POST /api/seed` | 1/hour | IP |

### 8.3 Response Headers
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1625000000
```

## 9. Content Security Policy

### 9.1 Implementation
In `next.config.ts`:
```ts
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "connect-src 'self' https:",
  "font-src 'self'",
].join("; ");

const nextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: [{ key: "Content-Security-Policy", value: csp }] }];
  },
};
```

## 10. Secrets Management

### 10.1 Environment Variables
| Variable | Purpose | Required |
|----------|---------|----------|
| `DATABASE_URL` | SQLite path | ✅ |
| `NEXTAUTH_SECRET` | JWT signing | ✅ (Phase 3) |
| `NEXTAUTH_URL` | App URL | ✅ (Phase 3) |
| `GOOGLE_CLIENT_ID` | Google OAuth | Phase 3 |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | Phase 3 |
| `MSG91_AUTH_KEY` | SMS provider | Phase 3 |
| `UPSTASH_REDIS_URL` | Rate limiting | Phase 3 |
| `UPSTASH_REDIS_TOKEN` | Rate limiting | Phase 3 |

### 10.2 Rules
- `.env` is in `.gitignore` (verify!)
- `.env.example` documents all required vars (no values)
- Generate secrets: `openssl rand -base64 32`
- Never commit secrets to git
- Production: use a secret manager (Doppler, Vault, AWS Secrets Manager)
- Rotate secrets quarterly

## 11. Data Encryption

### 11.1 At Rest
- SQLite file is unencrypted by default
- **Phase 5:** SQLite SEE (encrypted extension) or disk encryption (LUKS/EBS)
- PII (phone, email, GSTIN) stored in plaintext — acceptable for MSME scale

### 11.2 In Transit
- Local dev: HTTP (acceptable)
- Production: HTTPS mandatory (via Caddy/reverse proxy)
- HSTS header: `Strict-Transport-Security: max-age=31536000; includeSubDomains`

## 12. Audit Logging

### 12.1 What to Log
Every mutating API call (POST/PATCH/DELETE) must call `recordAudit()`:
```ts
await recordAudit({
  businessId: business.id,
  userId: user.id,
  action: "create",
  entity: "invoice",
  entityId: inv.id,
  summary: `Created ${inv.number} for ${party.name}`,
  metadata: { number, grandTotal },
  ip: req.headers.get("x-forwarded-for"),
});
```

### 12.2 Immutability
- `AuditLog` has no `updatedAt` / `deletedAt` — append-only
- Phase 5: hash chain (`prevHash + data → hash`) for tamper-evidence
- Phase 5: revoke DB-level UPDATE/DELETE permissions on `AuditLog` table

## 13. Dependency Security

### 13.1 Audit
```bash
bun audit  # Check for known vulnerabilities
```
Run in CI. Fix critical/high immediately.

### 13.2 Supply Chain
- Lock file (`bun.lock`) committed
- Review transitive deps quarterly
- Prefer packages with >1000 GitHub stars and active maintenance

## 14. Compliance (India)

### 14.1 GST Data Retention
- GST invoices must be retained for **6 years** (GST Act Section 36)
- Backup retention must match
- MedBill never auto-deletes invoices (only soft-cancel)

### 14.2 PII
- PAN and GSTIN are sensitive — treat as PII
- Phone/email: collect only what's needed
- Data export: user can export all their data (Settings → Data → Export)

### 14.3 Data Localization
- If using cloud DB, ensure data stays in **India region** (Mumbai: ap-south-1)
- SQLite is local by definition

## 15. Incident Response

### 15.1 Detection
- Monitor audit logs for anomalies (mass deletions, off-hours access)
- Monitor rate-limit hits (brute force attempts)
- Sentry for error spikes

### 15.2 Response
1. **Contain:** Revoke user sessions, disable account
2. **Investigate:** Query audit log for the user's actions
3. **Recover:** Restore from backup if data corrupted
4. **Report:** Document incident in worklog, notify affected users
5. **Improve:** Add preventive controls

## 16. Security Checklist (Pre-Deploy)

- [ ] NextAuth configured with JWT
- [ ] All 18 routes call `requireRole`
- [ ] All 18 routes validate input with zod
- [ ] All 18 routes have try/catch
- [ ] Prisma query logging disabled in production
- [ ] `.env.example` created, `.env` in `.gitignore`
- [ ] `NEXTAUTH_SECRET` generated (32+ chars)
- [ ] HTTPS enforced (Caddy)
- [ ] HSTS header set
- [ ] CSP header set
- [ ] Rate limiting active
- [ ] CSRF protection (if cookie-based auth)
- [ ] `bun audit` passes
- [ ] Audit logging on all mutations
- [ ] IP captured in audit log
- [ ] Backup script tested
- [ ] 6-year retention policy documented
