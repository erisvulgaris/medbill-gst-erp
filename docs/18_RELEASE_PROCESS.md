# 18 — Release Process

> **Status:** Mandatory for all features
> **Rule:** Never skip any step

## The 12-Step Development Workflow

Every feature, bug fix, or change must follow this exact process:

### Step 1: Update Documentation
- Update the relevant spec doc(s) in `/docs/`
- If architecture changes, create/update an ADR
- Document the "what" and "why" before the "how"

### Step 2: Update ADR (if architecture changes)
- Create a new ADR in `/docs/architecture_decisions/`
- Format: Context → Problem → Alternatives → Decision → Consequences → Future Review
- Number sequentially (ADR-011, ADR-012, ...)

### Step 3: Write or Update Tests
- Write tests **before** implementation (TDD where practical)
- Unit tests for pure logic (`src/lib/`)
- Integration tests for API routes
- E2E tests for critical user flows
- Target: 95% coverage on business logic

### Step 4: Implement
- Follow `17_CODING_STANDARDS.md`
- Use `data-testid` on interactive elements
- Include loading, error, and empty states
- Ensure dark mode works

### Step 5: Run Lint
```bash
bun run lint
```
Must pass with 0 errors.

### Step 6: Run Type Check
```bash
bunx tsc --noEmit
```
Must pass with 0 errors. (Note: `ignoreBuildErrors` is currently `true` — will be `false` after Phase 3.)

### Step 7: Run Automated Tests
```bash
bun run test:unit    # Vitest
bun run test:e2e     # Playwright
```
All tests must pass. Coverage must meet thresholds.

### Step 8: Run Playwright (E2E)
```bash
bun run test:e2e
```
Critical paths must pass: invoice create→pay→view, POS checkout, quotation→convert.

### Step 9: Run Accessibility Audit
```bash
bun run test:a11y    # axe-core via Playwright
```
0 violations on changed views.

### Step 10: Run Performance Audit
```bash
bun run lhci         # Lighthouse CI
```
Performance >90, Accessibility >95 on changed routes.

### Step 11: Update Changelog
- Add entry to `20_CHANGELOG.md` under `[Unreleased]`
- Follow Keep a Changelog format: Added / Changed / Fixed / Removed

### Step 12: Update Worklog
- Append to `/home/z/my-project/worklog.md`
- Include: what changed, verification evidence, next steps

---

## Definition of Done

A feature is complete ONLY when ALL of the following are true:

- [ ] It compiles (`bunx tsc --noEmit` passes)
- [ ] Tests pass (`bun run test:unit` + `bun run test:e2e`)
- [ ] Documentation is updated (`/docs/`)
- [ ] Migrations succeed (`prisma migrate status` clean)
- [ ] Playwright passes (`bun run test:e2e`)
- [ ] No console errors (verified via agent-browser)
- [ ] No TypeScript errors (`bunx tsc --noEmit`)
- [ ] Lint passes (`bun run lint`)
- [ ] Screenshots confirm correct UI (agent-browser screenshots)
- [ ] Changelog updated
- [ ] Worklog updated

**Never claim a feature is complete without evidence.**

---

## Pre-Release Checklist

Before tagging a release:

### Code Quality
- [ ] `bun run lint` — 0 errors
- [ ] `bunx tsc --noEmit` — 0 errors
- [ ] `bun run test:unit` — all pass, coverage ≥ targets
- [ ] `bun run test:e2e` — all pass
- [ ] `bun run test:a11y` — 0 violations
- [ ] No `console.log` in source
- [ ] No `any` types introduced
- [ ] No hardcoded secrets/identity

### Database
- [ ] `prisma migrate status` — no drift
- [ ] Migration tested on fresh DB (`prisma migrate reset && prisma migrate deploy`)
- [ ] Seed script runs clean

### Performance
- [ ] `bun run lhci` — Performance >90, A11y >95
- [ ] Bundle size within budget (<200KB dashboard, <150KB others)
- [ ] No N+1 queries introduced

### Security
- [ ] All new routes authenticated
- [ ] All new routes validate input (zod)
- [ ] All new routes have try/catch
- [ ] RBAC enforced per permission matrix
- [ ] Audit logging on mutations

### Documentation
- [ ] Relevant spec docs updated
- [ ] ADR created/updated if architecture changed
- [ ] Changelog updated
- [ ] Worklog updated

### Browser Verification
- [ ] Chrome — no console errors, correct UI
- [ ] Mobile viewport — responsive, bottom nav works
- [ ] Dark mode — all views readable
- [ ] Print — invoice/quote layouts correct

---

## Versioning

- **MAJOR:** Breaking changes (new auth, schema migrations with data transform)
- **MINOR:** New features, new views, new endpoints (backward-compatible)
- **PATCH:** Bug fixes, refactoring, docs (backward-compatible)

## Tagging a Release

```bash
# 1. Ensure all checks pass
bun run lint && bunx tsc --noEmit && bun run test:unit

# 2. Update changelog
# Move [Unreleased] entries to [x.y.z] — YYYY-MM-DD

# 3. Commit
git add -A
git commit -m "release: v0.3.0"

# 4. Tag
git tag v0.3.0
git push origin main --tags
```

## Rollback Plan

1. Revert the git tag: `git revert v0.3.0`
2. If schema migration broke DB: restore from backup (`cp backups/{date}.db db/custom.db`)
3. If Prisma client mismatch: `bun run db:generate`
4. Restart server: `pkill -f next; nohup bun run dev &`
5. Document incident in worklog

## Hotfix Process

For critical production bugs:
1. Branch from `main`: `git checkout -b fix/critical-xxx`
2. Fix + test (minimum: lint + tsc + relevant test)
3. Fast-track review (1 reviewer)
4. Tag as patch: `v0.3.1`
5. Update changelog with `[Hotfix]` prefix
