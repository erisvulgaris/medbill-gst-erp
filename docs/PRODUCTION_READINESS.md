# Production Readiness Audit

> **Audit date:** 2026-06-30
> **Method:** Automated checks + script runs + test execution
> **Principle:** "Never claim production-ready without evidence." Items marked ❌ are explicitly incomplete.

## Executive Summary

MedBill is **NOT production-ready**. The application is a well-documented, functionally complete demo with a premium UI and correct GST engine. However, **every critical production requirement is unimplemented**: no authentication, no input validation on routes, no RBAC enforcement, no offline mode, no e2e tests, no CI verification.

| Category | Readiness | Evidence |
|----------|-----------|----------|
| Architecture | ✅ 90% | 38 docs, 10 ADRs, error boundaries |
| Database | 🟡 60% | Migrations baseline, backup/restore, but Float money |
| Authentication | ❌ 0% | `getActiveBusiness()` returns first business |
| Authorization | ❌ 0% | 0/18 routes check role |
| Validation | 🟡 40% | Schemas created, 0/18 routes use them |
| Performance | 🟡 50% | Code-split, but no virtualization/optimistic |
| Offline | ❌ 0% | No service worker, no IndexedDB |
| Accessibility | 🟡 40% | Radix-based, but no axe-core audit |
| Internationalization | ❌ 0% | INR/en-IN only |
| Printing | ✅ 80% | Print CSS, invoice viewer |
| GST | ✅ 95% | 100% test coverage |
| Inventory | ✅ 80% | CRUD + stock ledger |
| Accounting | ✅ 70% | Single-entry, P&L, ledger |
| Testing | 🟡 30% | 176 unit tests, no e2e/a11y/perf |
| Security | ❌ 10% | No auth, no rate limit, no CSP |
| Documentation | ✅ 95% | 38 markdown files |
| CI/CD | 🟡 20% | Workflow written, not verified |
| Deployment | ❌ 0% | No production deploy config |
| Backup | ✅ 70% | Script works, no schedule |
| Recovery | ✅ 70% | Script works, interactive |
| Monitoring | ❌ 0% | No Sentry, no analytics |
| Logging | 🟡 30% | Console only, no structured logger |

**Overall readiness: ~35%. Do not deploy to production.**

---

## Detailed Checklist

### Architecture ✅ 90%
| Item | Status | Evidence |
|------|--------|----------|
| 21 spec documents | ✅ | `ls docs/0*.md docs/1*.md docs/2*.md` = 21 files |
| 10 ADRs | ✅ | `ls docs/architecture_decisions/` = 10 files |
| 7 audit reports | ✅ | Verified |
| Error boundaries | ✅ | `src/app/error.tsx` + `src/components/app/error-boundary.tsx` |
| Code splitting | ✅ | 12 lazy views via `next/dynamic` |
| Single-route SPA | ✅ | ADR-001 documented |
| Folder structure | ✅ | ADR-007 documented |
| **Gap:** Server Components optimization | ❌ | All views are client (ADR-001 trade-off) |

### Database 🟡 60%
| Item | Status | Evidence |
|------|--------|----------|
| 22 Prisma models | ✅ | `grep -c '^model' schema.prisma` = 22 |
| 38 indexes | ✅ | Verified in DATABASE_AUDIT |
| Migration baseline | ✅ | `prisma/migrations/0_init/migration.sql` (591 lines) |
| Backup utility | ✅ | `bun run db:backup` — tested, creates timestamped copy |
| Restore utility | ✅ | `bun run db:restore` — interactive, pre-restore backup |
| Integrity checker | ✅ | `bun run db:health` — 11 checks, all pass |
| Seed idempotency | ✅ | `POST /api/seed` returns "already seeded" |
| **Gap:** Float → Decimal | ❌ | 78 Float columns store money (P0) |
| **Gap:** Automated backup schedule | ❌ | Manual only |
| **Gap:** Additional composite indexes | ❌ | 4 missing (see DATABASE_HEALTH_REPORT) |
| **Gap:** Litestream continuous backup | ❌ | Phase 5 |

### Authentication ❌ 0%
| Item | Status | Evidence |
|------|--------|----------|
| NextAuth config | ❌ | Not implemented |
| JWT sessions | ❌ | Not implemented |
| Login endpoint | ❌ | Not implemented |
| OTP flow | ❌ | Not implemented |
| Google OAuth | ❌ | Not implemented |
| Email/password login | ❌ | Not implemented |
| Session management | ❌ | Not implemented |
| Device management | ❌ | Not implemented |
| Login history | ❌ | Not implemented |
| Refresh tokens | ❌ | Not implemented |
| **Evidence:** | `grep -rl "next-auth\|getServerSession" src/app/api` = 0 files |

### Authorization ❌ 0%
| Item | Status | Evidence |
|------|--------|----------|
| 13 roles defined | ✅ | `BusinessMember.role` field |
| Permission matrix documented | ✅ | `09_PERMISSION_MATRIX.md` |
| `requireRole` middleware | ❌ | Not implemented |
| RBAC enforced on routes | ❌ | 0/18 routes check role |
| Permission tests | ❌ | None |
| Tenant isolation | 🟡 Partial | All queries filter by `businessId`, but `businessId` comes from `getActiveBusiness()` (first business), not session |

### Validation 🟡 40%
| Item | Status | Evidence |
|------|--------|----------|
| Zod installed | ✅ | `zod@4.0.2` in package.json |
| Schemas for all resources | ✅ | `src/lib/schemas/index.ts` (12 schemas) |
| Schema unit tests | ✅ | 38 tests passing |
| GSTIN validation | ✅ | In schema (server-side ready) |
| PAN/phone/pincode validation | ✅ | In schema |
| **Gap:** Routes use schemas | ❌ | 0/18 routes call `safeParse` |
| **Gap:** Client forms use schemas | ❌ | Forms use manual validation |
| VALIDATION_GUIDE.md | ✅ | Written |

### Performance 🟡 50%
| Item | Status | Evidence |
|------|--------|----------|
| Code splitting (lazy views) | ✅ | 12 `next/dynamic` imports |
| GPU-accelerated animation | ✅ | transform+opacity, `gpu` class |
| TanStack Query caching | ✅ | 25 `useQuery` usages, staleTime 30s |
| Dashboard N+1 fixed | ✅ | 28 queries → 2, 60ms → 25ms |
| **Gap:** List virtualization | ❌ | `@tanstack/react-virtual` not installed |
| **Gap:** Optimistic updates | ❌ | No `useMutation` usage |
| **Gap:** Bundle analyzer | ❌ | Not configured |
| **Gap:** Lighthouse CI | ❌ | Not configured |
| **Gap:** 120 FPS target | ❌ | Unverified (no virtualization) |
| **Gap:** LCP < 1.5s | ❌ | Unmeasured |
| **Gap:** INP < 100ms | ❌ | Unmeasured |

### Offline ❌ 0%
| Item | Status | Evidence |
|------|--------|----------|
| Service worker | ❌ | No `public/sw.js` |
| IndexedDB cache | ❌ | 0 usages |
| Background sync | ❌ | Not implemented |
| Optimistic UI | ❌ | Not implemented |
| Conflict resolution | ❌ | Not implemented |
| Retry queue | ❌ | Not implemented |
| Offline invoice creation | ❌ | Not implemented |
| Offline payments | ❌ | Not implemented |
| Offline inventory | ❌ | Not implemented |
| Sync dashboard | ❌ | Not implemented |
| OFFLINE_ENGINE.md | ❌ | Not written |

### Accessibility 🟡 40%
| Item | Status | Evidence |
|------|--------|----------|
| shadcn/ui (Radix-based) | ✅ | Accessible primitives |
| ARIA labels on icon buttons | ✅ | 23 `aria-label` usages |
| `data-testid` on elements | ✅ | 66 usages |
| Keyboard navigation | ✅ | Radix handles focus trap |
| Dark mode | ✅ | next-themes |
| `prefers-reduced-motion` | ✅ | In globals.css |
| **Gap:** axe-core audit | ❌ | Not run |
| **Gap:** Lighthouse a11y score | ❌ | Unmeasured |
| **Gap:** Skip-to-content link | ❌ | Not added |
| **Gap:** `aria-live` on toasts | ❌ | Not added |
| **Gap:** Color contrast audit | ❌ | Not verified |

### Internationalization ❌ 0%
| Item | Status | Evidence |
|------|--------|----------|
| Multi-language support | ❌ | Hardcoded English |
| Currency switching | ❌ | INR only |
| Date format switching | ❌ | en-IN only |
| Number format switching | ❌ | en-IN only |

### Printing ✅ 80%
| Item | Status | Evidence |
|------|--------|----------|
| Print CSS | ✅ | `@media print` in globals.css |
| Invoice print view | ✅ | `invoice-viewer.tsx` with `print:hidden` |
| Quotation print view | ✅ | `quotation-viewer.tsx` |
| Hide shell on print | ✅ | `aside, header, nav` hidden |
| A4 page size | ✅ | `@page { size: A4 }` |
| **Gap:** PDF generation | ❌ | Browser print only (no server-side PDF) |

### GST ✅ 95%
| Item | Status | Evidence |
|------|--------|----------|
| CGST/SGST (intra) | ✅ | `computeLine`, 100% test coverage |
| IGST (inter) | ✅ | 100% test coverage |
| 7 GST rates | ✅ | `GST_RATES` |
| Per-line discounts | ✅ | Tested |
| Document rounding | ✅ | Tested |
| GSTIN validation | ✅ | `isValidGstin`, tested |
| 38 state codes | ✅ | `INDIAN_STATES`, tested |
| Amount in words | ✅ | `amountInWords`, tested |
| GSTR-1 report | ✅ | `/api/gst` |
| HSN summary | ✅ | `/api/gst` |
| **Gap:** Server-side GSTIN validation | ❌ | Client-side only (routes don't validate) |
| **Gap:** Cess | ❌ | `cessTotal` always 0 |
| **Gap:** Reverse charge | ❌ | Not implemented |
| **Gap:** E-invoicing (IRN/QR) | ❌ | Phase 6 |

### Inventory ✅ 80%
| Item | Status | Evidence |
|------|--------|----------|
| Product CRUD | ✅ | `/api/products` |
| Stock adjustment | ✅ | Dialog in inventory-view |
| StockMovement ledger | ✅ | 6 movement types |
| Low/out stock alerts | ✅ | Dashboard + inventory badges |
| Inventory valuation | ✅ | Report available |
| **Gap:** Batch tracking UI | ❌ | Schema only |
| **Gap:** Expiry tracking UI | ❌ | Schema only |
| **Gap:** Serial tracking UI | ❌ | Schema only |
| **Gap:** Multi-warehouse | ❌ | Single warehouse |
| **Gap:** Reorder automation | ❌ | Not implemented |

### Accounting ✅ 70%
| Item | Status | Evidence |
|------|--------|----------|
| Party ledger (Dr/Cr) | ✅ | `party-statement.tsx` |
| P&L statement | ✅ | `/api/reports?report=profit_loss` |
| Day book | ✅ | Report available |
| Sales/Purchase register | ✅ | Report types |
| Outstanding calculation | ✅ | Party + business level |
| **Gap:** Double-entry | ❌ | Single-entry only |
| **Gap:** Balance sheet | ❌ | Phase 5 |
| **Gap:** Trial balance | ❌ | Phase 5 |
| **Gap:** Cash flow | ❌ | Phase 5 |
| **Gap:** True COGS | ❌ | Uses purchase value, not opening+closing stock |

### Testing 🟡 30%
| Item | Status | Evidence |
|------|--------|----------|
| Vitest installed | ✅ | v4.1.9 |
| Unit tests | ✅ | 176 tests passing |
| gst.ts coverage | ✅ | 100% |
| format.ts coverage | ✅ | 99% |
| Schema tests | ✅ | 38 tests |
| **Gap:** E2E tests | ❌ | Playwright not installed |
| **Gap:** A11y tests | ❌ | axe-core not installed |
| **Gap:** Lighthouse CI | ❌ | Not configured |
| **Gap:** Visual regression | ❌ | Not configured |
| **Gap:** Integration tests | ❌ | Not written |
| **Gap:** 95% overall coverage | ❌ | Only pure libs covered |

### Security ❌ 10%
| Item | Status | Evidence |
|------|--------|----------|
| **Gap:** Authentication | ❌ | 0/18 routes |
| **Gap:** RBAC enforcement | ❌ | 0/18 routes |
| **Gap:** Zod validation on routes | ❌ | 0/18 routes |
| **Gap:** CSRF protection | ❌ | No Origin check |
| **Gap:** Rate limiting | ❌ | No ratelimit |
| **Gap:** CSP header | ❌ | Not in next.config |
| **Gap:** HSTS header | ❌ | Not configured |
| **Gap:** Audit log on all mutations | ❌ | Only 3/18 routes log |
| **Gap:** IP capture in audit | ❌ | Not passed to recordAudit |
| **Gap:** `.env.example` | ❌ | Not created |
| **Gap:** Encryption at rest | ❌ | SQLite unencrypted |
| Prisma parameterizes queries | ✅ | No SQL injection risk |
| No `dangerouslySetInnerHTML` | ✅ | Verified |
| **Gap:** `bun audit` in CI | ❌ | Workflow written, not run |

### Documentation ✅ 95%
| Item | Status | Evidence |
|------|--------|----------|
| 21 spec docs (00-20) | ✅ | All present |
| 7 audit reports | ✅ | All present |
| 10 ADRs | ✅ | All present |
| AI Developer Guide | ✅ | `AI_DEVELOPER_GUIDE.md` |
| Implementation Matrix | ✅ | `IMPLEMENTATION_MATRIX.md` |
| Database Health Report | ✅ | `DATABASE_HEALTH_REPORT.md` |
| Validation Guide | ✅ | `VALIDATION_GUIDE.md` |
| Worklog | ✅ | Updated each phase |
| Changelog | ✅ | Keep a Changelog format |
| **Gap:** OpenAPI spec | ❌ | Not generated |
| **Gap:** Swagger UI | ❌ | Not configured |

### CI/CD 🟡 20%
| Item | Status | Evidence |
|------|--------|----------|
| GitHub Actions workflow | ✅ | `.github/workflows/ci.yml` |
| Jobs: lint, typecheck, unit, build, security, db-health | ✅ | Defined |
| **Gap:** Actually run on GitHub | ❌ | No repo connected |
| **Gap:** E2E job | ❌ | Disabled (no Playwright) |
| **Gap:** Lighthouse job | ❌ | Disabled |
| **Gap:** Bundle size job | ❌ | Placeholder |
| **Gap:** Merge gate enforcement | ❌ | Branch protection not configured |

### Deployment ❌ 0%
| Item | Status | Evidence |
|------|--------|----------|
| **Gap:** Production env config | ❌ | No `.env.production` |
| **Gap:** Dockerfile | ❌ | Not created |
| **Gap:** Docker Compose | ❌ | Not created |
| **Gap:** Deployment guide | ❌ | Not written |
| **Gap:** Production build tested | ❌ | `bun run build` not verified |
| **Gap:** HTTPS/TLS config | ❌ | Not documented |
| **Gap:** Domain setup | ❌ | Not done |

### Backup ✅ 70%
| Item | Status | Evidence |
|------|--------|----------|
| Backup script | ✅ | `scripts/backup-db.ts` — tested |
| Restore script | ✅ | `scripts/restore-db.ts` — tested |
| Pre-restore backup | ✅ | Restore creates one |
| Retention (30 backups) | ✅ | Auto-prune |
| **Gap:** Automated schedule | ❌ | Manual only |
| **Gap:** Offsite backup | ❌ | Local only |
| **Gap:** Litestream | ❌ | Phase 5 |

### Recovery ✅ 70%
| Item | Status | Evidence |
|------|--------|----------|
| Restore utility | ✅ | Interactive confirmation |
| Pre-restore safety | ✅ | Auto-backup before restore |
| **Gap:** Recovery runbook | ❌ | Not documented |
| **Gap:** RTO/RPO defined | ❌ | Not defined |
| **Gap:** Tested restore in prod | ❌ | Not done |

### Monitoring ❌ 0%
| Item | Status | Evidence |
|------|--------|----------|
| **Gap:** Error tracking (Sentry) | ❌ | Not installed |
| **Gap:** Uptime monitoring | ❌ | Not configured |
| **Gap:** Analytics (PostHog) | ❌ | Not installed |
| **Gap:** Web vitals reporting | ❌ | Not implemented |
| **Gap:** Alerting | ❌ | Not configured |

### Logging 🟡 30%
| Item | Status | Evidence |
|------|--------|----------|
| Prisma query log (dev only) | ✅ | `db.ts` fixed in Phase 2 |
| API error logging | ✅ | `apiHandler` logs to console.error |
| Request IDs | ✅ | `apiHandler` generates `x-request-id` |
| **Gap:** Structured logger (pino) | ❌ | Console only |
| **Gap:** Log aggregation | ❌ | Not configured |
| **Gap:** PII scrubbing | ❌ | Not implemented |
| **Gap:** Log retention policy | ❌ | Not defined |

---

## P0 Blockers (Must fix before ANY production deploy)

1. **Authentication** — implement NextAuth (ADR-006)
2. **RBAC enforcement** — `requireRole` on all 18 routes
3. **Input validation** — refactor 18 routes to use zod schemas
4. **Error handling** — wrap 18 routes in `apiHandler`
5. **Float → Decimal** — migrate 78 money columns
6. **Rate limiting** — `@upstash/ratelimit`
7. **CSP + HSTS headers** — in next.config
8. **`.env.example`** — document all required vars
9. **Audit logging** — all 18 mutating routes
10. **CI verification** — run GitHub Actions at least once

## P1 High Priority (Before scale)

11. E2E tests (Playwright)
12. List virtualization
13. Optimistic updates
14. Bundle analyzer + budget
15. Lighthouse CI
16. Structured logger
17. Sentry error tracking
18. Automated backup schedule

## Verified Strengths (What works)

- ✅ GST engine — 100% test coverage, correct calculations
- ✅ Design system — premium, consistent, dark mode
- ✅ Documentation — 38 markdown files, comprehensive
- ✅ Error boundaries — render errors don't whitescreen
- ✅ Database migrations — baseline initialized
- ✅ Backup/restore/health — scripts work
- ✅ API error framework — `apiHandler` + `ApiError` ready
- ✅ Zod schemas — 12 schemas, 38 tests
- ✅ Unit tests — 176 passing
- ✅ Code splitting — 12 lazy views

---

## Conclusion

MedBill has a **solid architectural foundation** with excellent documentation and a correct core (GST engine). The **gap between current state and production is primarily in security and infrastructure** — authentication, validation, and CI are the critical blockers.

**Estimated effort to production-ready:** 4-6 weeks of focused work on P0 items.

**Recommendation:** Do not deploy to production. Continue Phase 3 hardening — prioritize auth, validation, and route refactoring (applying `apiHandler` + zod to all 18 routes).

---

**This audit is evidence-based. Every ✅ was verified by running a command or checking a file. Every ❌ is a tracked work item. No claim is made without supporting evidence.**
