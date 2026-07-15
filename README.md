# MedBill — India's Fastest GST Billing ERP

> Production-grade GST billing & business management software for Indian MSMEs. Built with Next.js 16, Prisma, SQLite, and shadcn/ui.

[![Tests](https://img.shields.io/badge/tests-214%20passing-brightgreen)](#testing)
[![Lint](https://img.shields.io/badge/lint-0%20errors-brightgreen)](#code-quality)
[![License](https://img.shields.io/badge/license-MIT-blue)](#license)

## 🚀 Quick Start

```bash
# Install dependencies
bun install

# Set up the database
bun run db:push

# Start the dev server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Default Admin Credentials
```
URL: http://localhost:3000/admin
Email: admin@medbill.in
Password: Admin@MedBill2026
```

> ⚠️ **Change these immediately in production.**

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Database](#database)
- [API](#api)
- [Authentication & RBAC](#authentication--rbac)
- [Admin Panel](#admin-panel)
- [Subscription Plans](#subscription-plans)
- [Testing](#testing)
- [Code Quality](#code-quality)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Development](#development)
- [License](#license)

## Features

### Core Modules
- **Dashboard** — KPIs, sales charts, GST breakdown, recent invoices, low-stock alerts
- **Sales & Invoices** — GST-compliant invoicing with live CGST/SGST/IGST calculation
- **POS Billing** — Fast counter billing with product grid, cart, and instant checkout
- **Inventory** — Product CRUD, stock adjustment, low/out stock alerts, barcode support
- **Parties** — Unified customers & suppliers with live outstanding balances and ledger
- **Purchases** — Record supplier bills with auto stock-in
- **Quotations** — Create quotes with convert-to-invoice workflow
- **Expenses** — Category-based expense tracking with pie chart
- **Reports** — P&L, Sales/Purchase Register, Party Report, Inventory Valuation, Day Book
- **GST Returns** — GSTR-1 with HSN summary and rate-wise breakdown
- **Audit Log** — Complete activity history with entity/action filtering
- **Settings** — Business profile, module toggles, roles, security, data management

### Key Capabilities
- ✅ **Create customers, suppliers, products on-the-fly** while making invoices/quotations/purchases
- ✅ **Live GST calculation** — CGST/SGST (intra-state) + IGST (inter-state) with rounding
- ✅ **Amount in words** — Indian numbering (crore/lakh/thousand)
- ✅ **Printable invoices** — A4 format with full GST breakdown
- ✅ **WhatsApp share** — Pre-formatted invoice message
- ✅ **Payment collection** — Record partial/full payments with quick-amount buttons
- ✅ **CSV export** — Export invoices, products, parties, reports
- ✅ **Industry Profile Engine** — 14 industries with adaptive dashboard, KPIs, quick actions
- ✅ **Dark mode** — Full dark mode support
- ✅ **Mobile responsive** — Bottom navigation, responsive tables, safe-area aware
- ✅ **Keyboard shortcuts** — ⌘K (search), ⌘N (new invoice), ⌘P (POS), ⌘B (sidebar)
- ✅ **Subscription system** — 3-tier pricing with admin management
- ✅ **Admin panel** — 8 tabs: Dashboard, Businesses, Users, Subscriptions, Plans, Analytics, Audit, System

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 (strict) |
| Database | SQLite via Prisma 6 |
| UI | shadcn/ui (New York) + Tailwind CSS 4 |
| State | Zustand (client) + TanStack Query (server) |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Animation | Framer Motion |
| Auth | JWT (HMAC-signed) + bcrypt |
| Icons | Lucide React |

## Architecture

```
Browser (single route /)
  ├── App Shell: Sidebar + Topbar + MobileBottomNav + CommandPalette
  ├── Subscription Banner (trial/expired/suspended warnings)
  ├── Views (12, lazy-loaded): Dashboard, Sales, POS, Inventory, Parties, etc.
  └── Libs: gst.ts, format.ts, store.ts, api.ts, auth.ts, schemas/

Next.js API (33 routes, 32 using apiHandler)
  ├── Business routes: /api/invoices, /api/products, /api/parties, etc.
  ├── Auth routes: /api/auth/login, /api/auth/register, /api/auth/me, etc.
  ├── Admin routes: /api/admin/dashboard, /api/admin/businesses, etc.
  └── Prisma → SQLite (24 models)
```

### Key Design Decisions
- **Single-route SPA** — Only `/` is user-visible; views switch via Zustand state
- **Standardized API envelope** — All routes return `{ success, data, error, meta }`
- **Demo mode** — Development falls back to first business; production requires auth
- **Industry Profile Engine** — Open-closed principle: add industries without code changes

## Database

24 Prisma models including: User, Business, BusinessMember, Branch, Party, Product, Category, Unit, TaxRate, Invoice, InvoiceItem, Purchase, PurchaseItem, Quotation, QuotationItem, Payment, Expense, StockMovement, Notification, AuditLog, SubscriptionPlan, Subscription, and more.

```bash
# Push schema to database
bun run db:push

# Backup database
bun run db:backup

# Restore from backup
bun run db:restore db/backups/<timestamp>.db

# Health check
bun run db:health
```

## API

33 REST endpoints under `/api/`:

| Category | Endpoints |
|----------|-----------|
| Auth | login, register, logout, me, switch-business, otp/send, otp/verify |
| Business | GET/PATCH /api/business |
| Dashboard | GET /api/dashboard |
| Invoices | GET/POST /api/invoices, GET/DELETE /api/invoices/:id |
| Products | GET/POST/PATCH/DELETE /api/products |
| Parties | GET/POST/PATCH /api/parties, GET /api/parties/:id |
| Purchases | GET/POST /api/purchases |
| Quotations | GET/POST /api/quotations, GET/PATCH /api/quotations/:id |
| Payments | GET/POST /api/payments |
| Expenses | GET/POST /api/expenses |
| Reports | GET /api/reports?report=X (6 types) |
| GST | GET /api/gst |
| Audit | GET /api/audit |
| Notifications | GET/PATCH /api/notifications |
| Subscription | GET /api/subscription |
| Admin | login, dashboard, businesses, businesses/:id, users, subscriptions, plans, audit |

### Response Envelope
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": { "requestId": "uuid", "count": 10 }
}
```

## Authentication & RBAC

- **Password hashing:** bcrypt (12 rounds)
- **Session tokens:** HMAC-signed JWT (30-day expiry, 7-day for admin)
- **Cookies:** httpOnly, secure, sameSite=lax
- **RBAC:** 13 roles (owner, partner, manager, cashier, sales, purchase, store_keeper, warehouse_manager, delivery, employee, auditor, ca, accountant)
- **Subscription enforcement:** Mutations blocked if business is suspended
- **Security middleware:** CSP, HSTS, X-Frame-Options, CSRF protection, request IDs

## Admin Panel

Access at `/admin` with super admin credentials.

### 8 Tabs
1. **Dashboard** — Platform metrics, plan distribution, recent signups
2. **Businesses** — Search, view, change plan, suspend/activate
3. **Users** — All users across all businesses
4. **Subscriptions** — All subscriptions with status/amount
5. **Plans** — 3 tier cards with pricing and features
6. **Analytics** — MRR, ARR, conversion rate, revenue by plan
7. **Audit Log** — Platform-wide activity log
8. **System** — Server status, subscription distribution

## Subscription Plans

| Plan | Price (Yearly) | Users | Products | Branches | Invoices/mo |
|------|---------------|-------|----------|----------|-------------|
| Starter | ₹599/year | 1 | 50 | 1 | 100 |
| Professional | ₹2,999/year | 5 | 500 | 2 | 1,000 |
| Enterprise | ₹9,999/year | Unlimited | Unlimited | Unlimited | Unlimited |

## Testing

```bash
# Run all tests
bun run test

# Run with coverage
bun run test:coverage

# Watch mode
bun run test:watch
```

### Test Coverage
- **214 tests** across 9 test files
- **gst.ts:** 100% coverage (64 tests)
- **format.ts:** 99% coverage (55 tests)
- **schemas:** 15 tests (Zod validation)
- **permissions:** 16 tests (RBAC matrix)
- **api-integration:** 20 tests (API envelope, auth, validation, security headers)
- **industry-profiles:** 17 tests (14 industries)
- **auth:** 8 tests (password hashing, token management)
- **utils:** 6 tests, **nav:** 13 tests

## Code Quality

```bash
# Lint
bun run lint

# Type check
bunx tsc --noEmit
```

- **0 ESLint errors**
- **0 TypeScript errors** (strict mode)
- **22/22 API routes** use `apiHandler` (standardized error handling)
- **Zod validation** on all POST/PATCH routes

## Project Structure

```
medbill-gst-erp/
├── src/
│   ├── app/
│   │   ├── admin/           # Admin panel page
│   │   ├── api/             # 33 REST endpoints
│   │   ├── page.tsx         # Single-route SPA entry
│   │   ├── layout.tsx       # Root layout
│   │   ├── error.tsx        # Global error boundary
│   │   ├── globals.css      # Design tokens
│   │   └── middleware.ts    # Security headers + CSRF
│   ├── components/
│   │   ├── app/             # App shell + feature components
│   │   ├── views/           # 12 view components
│   │   └── ui/              # shadcn/ui primitives
│   └── lib/
│       ├── gst.ts           # GST calculation engine
│       ├── format.ts        # INR formatters
│       ├── store.ts         # Zustand app store
│       ├── api.ts           # Fetch wrapper (envelope unwrapping)
│       ├── auth.ts          # JWT auth + RBAC
│       ├── api-error.ts     # Standardized error handling
│       ├── business-context.ts # Tenant isolation + subscription
│       ├── schemas/         # Zod validation schemas
│       ├── industry-profiles.ts # 14 industry profiles
│       └── admin-auth.ts    # Admin authentication
├── prisma/
│   └── schema.prisma        # 24 models
├── docs/                    # 56+ documentation files
├── reports/                 # Improvement reports
├── scripts/                 # Backup, restore, health check
└── PROJECT_STATE.md         # Living project state document
```

## Documentation

56+ markdown files in `/docs/`:

| Document | Description |
|----------|-------------|
| `00_PROJECT_OVERVIEW.md` | Project overview and architecture |
| `01_PRD.md` | Product requirements document |
| `ADMIN_PANEL.md` | Admin panel specification |
| `AI_DEVELOPER_GUIDE.md` | Guide for AI agents |
| `AI_CONTEXT.md` | 5-minute project primer |
| `11_GST_ENGINE.md` | GST calculation specification |
| `15_SECURITY_GUIDE.md` | Security practices |
| `16_TESTING_GUIDE.md` | Testing strategy |
| `17_CODING_STANDARDS.md` | Coding rules |
| `19_BACKLOG.md` | Prioritized backlog |
| `20_CHANGELOG.md` | Changelog |
| `PRODUCTION_SCORECARD.md` | Production readiness scores |
| `IMPLEMENTATION_MATRIX.md` | Spec vs implementation audit |
| `DATABASE_HEALTH_REPORT.md` | Database health report |
| `VALIDATION_GUIDE.md` | Validation layer guide |
| `COMPETITOR_ANALYSIS.md` | 8 competitor analysis |
| `FEATURE_GAP.md` | Feature gap classification |
| `PERFORMANCE_BASELINE.md` | Performance measurements |
| `SCALABILITY_REPORT.md` | Scale simulation results |
| `NEXT_100_TASKS.md` | ROI-sorted roadmap |
| ...and 30+ more |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| ⌘K / Ctrl+K | Open command palette (global search) |
| ⌘N / Ctrl+N | Create new invoice |
| ⌘P / Ctrl+P | Open POS billing |
| ⌘B / Ctrl+B | Toggle sidebar |
| Esc | Close dialog/popover |

## Development

```bash
# Start dev server
bun run dev

# Build for production
bun run build

# Database operations
bun run db:push      # Push schema
bun run db:backup    # Backup database
bun run db:restore   # Restore from backup
bun run db:health    # Health check

# Testing
bun run test         # Run tests
bun run test:coverage # Coverage report

# Code quality
bun run lint         # ESLint
```

### Environment Variables
Copy `.env.example` to `.env` and fill in:
```env
DATABASE_URL="file:./db/custom.db"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
```

## License

MIT — Free for commercial and personal use.

---

Built with ❤️ for Indian MSMEs.
