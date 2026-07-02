# Admin Panel Specification

> **Status:** Source of truth for the MedBill Super Admin Panel
> **Last updated:** 2026-07-01
> **Access:** `/admin` route (separate from the main app at `/`)

## 1. Overview

The Admin Panel is a **super-admin control center** for the MedBill SaaS platform. It allows the platform owner to:

- Manage all businesses (tenants) on the platform
- Manage all users across businesses
- Control subscription plans and billing
- View platform-wide analytics (revenue, active users, churn)
- Suspend/activate businesses
- View audit logs across all tenants
- Manage feature flags per business

## 2. Admin Authentication

### 2.1 Admin User
- Separate from regular business users
- Has `role: "super_admin"` in the User model
- Can access `/admin` route and all `/api/admin/*` endpoints
- Cannot be created via the regular registration flow — only via seed script or existing admin

### 2.2 Default Admin Credentials
```
Email: admin@medbill.in
Password: Admin@MedBill2026
```

**⚠️ Change these immediately after first login in production.**

### 2.3 Admin Session
- Uses the same JWT token system as regular users
- Token contains `role: "super_admin"` and `activeBid: ""` (no business)
- Admin middleware checks for `super_admin` role on all `/api/admin/*` routes

## 3. Subscription Plans

### 3.1 Three-Tier Pricing

| Plan | Price (Yearly) | Price (Monthly equiv.) | Target | Limits |
|------|---------------|----------------------|--------|--------|
| **Starter** | ₹599/year | ₹50/mo | Freelancers, single-person | 1 user, 100 invoices/month, 50 products, 1 branch |
| **Professional** | ₹2,999/year | ₹250/mo | Small businesses | 5 users, 1000 invoices/month, 500 products, 2 branches |
| **Enterprise** | ₹9,999/year | ₹833/mo | Mid-market, chains | Unlimited users, unlimited invoices, unlimited products, unlimited branches |

### 3.2 Plan Features

#### Starter (₹599/year)
- ✅ GST Invoicing
- ✅ Inventory Management (up to 50 products)
- ✅ Customer/Supplier Management
- ✅ Basic Reports (P&L, Sales Register)
- ✅ 1 User
- ✅ 1 Branch
- ❌ POS Billing
- ❌ GSTR-1 Filing
- ❌ Multi-branch
- ❌ Custom Roles
- ❌ API Access
- ❌ Priority Support

#### Professional (₹2,999/year)
- ✅ Everything in Starter
- ✅ POS Billing
- ✅ Full GST Reports (GSTR-1, HSN)
- ✅ Inventory (up to 500 products)
- ✅ Up to 5 Users
- ✅ 2 Branches
- ✅ Quotations & Estimates
- ✅ Payment Tracking
- ✅ Audit Log
- ✅ Email Support
- ❌ Custom Roles
- ❌ API Access
- ❌ Priority Support

#### Enterprise (₹9,999/year)
- ✅ Everything in Professional
- ✅ Unlimited Products
- ✅ Unlimited Users
- ✅ Unlimited Branches
- ✅ Custom Roles & Permissions
- ✅ API Access
- ✅ Multi-warehouse
- ✅ Batch/Expiry/Serial Tracking
- ✅ Priority Support (24hr SLA)
- ✅ White-label Option
- ✅ Data Export (Full)

### 3.3 Subscription Lifecycle
```
Trial (14 days free) → Active (paid) → Expired → Grace (7 days) → Suspended
                                                         ↓
                                                    Reactivated (payment)
```

- **Trial:** 14 days free, all Professional features
- **Active:** Plan is paid and valid
- **Expired:** Plan end date passed, no renewal
- **Grace:** 7-day grace period after expiry (full access)
- **Suspended:** No access after grace period (data preserved, read-only)

## 4. Admin Panel Features

### 4.1 Admin Dashboard
- **Platform Revenue:** Total MRR, ARR, revenue this month
- **Active Businesses:** Count by plan (Starter/Professional/Enterprise)
- **User Metrics:** Total users, new signups this month, DAU/MAU
- **Churn Rate:** Businesses that cancelled this month
- **Recent Signups:** Latest 10 businesses
- **Revenue Chart:** Monthly revenue trend (12 months)

### 4.2 Business Management
- List all businesses with search/filter
- View business details (owner, plan, usage, created date)
- Suspend/Activate business
- Change subscription plan
- View business's invoices/users/products count
- Delete business (with confirmation + data backup)

### 4.3 User Management
- List all users across all businesses
- View user details (email, businesses, role, last login)
- Suspend/Activate user
- Reset password (generate temp password)
- View user's audit log

### 4.4 Subscription Management
- List all subscriptions with status filter
- View subscription details (plan, start, end, status, amount)
- Change plan (upgrade/downgrade)
- Extend subscription (add days)
- Cancel subscription
- View payment history

### 4.5 Platform Analytics
- Revenue by plan
- Revenue trend (12 months)
- Conversion rate (trial → paid)
- Churn rate
- Active businesses by industry
- Top businesses by invoice volume

### 4.6 Audit Log
- Platform-wide audit log (all businesses)
- Filter by business, user, action, date
- Export to CSV

### 4.7 Feature Flags
- Enable/disable features per business
- Override plan limits (e.g., give a business extra users)
- Beta feature access control

## 5. Admin API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/login` | Admin login |
| GET | `/api/admin/dashboard` | Platform metrics |
| GET | `/api/admin/businesses` | List all businesses |
| GET | `/api/admin/businesses/:id` | Business details |
| PATCH | `/api/admin/businesses/:id` | Update business (suspend/activate) |
| DELETE | `/api/admin/businesses/:id` | Delete business |
| GET | `/api/admin/users` | List all users |
| GET | `/api/admin/users/:id` | User details |
| PATCH | `/api/admin/users/:id` | Update user (suspend/activate) |
| GET | `/api/admin/subscriptions` | List all subscriptions |
| PATCH | `/api/admin/subscriptions/:id` | Update subscription (change plan) |
| GET | `/api/admin/analytics` | Platform analytics |
| GET | `/api/admin/audit` | Platform-wide audit log |

## 6. Data Model

### 6.1 SubscriptionPlan
```prisma
model SubscriptionPlan {
  id          String   @id @default(cuid())
  name        String   // "starter" | "professional" | "enterprise"
  displayName String   // "Starter" | "Professional" | "Enterprise"
  priceYearly Int      // 599 | 2999 | 9999
  priceMonthly Int     // 50 | 250 | 833
  maxUsers    Int      // 1 | 5 | -1 (unlimited)
  maxProducts Int      // 50 | 500 | -1
  maxBranches Int      // 1 | 2 | -1
  maxInvoices Int      // 100 | 1000 | -1
  features    String   // JSON array of feature keys
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 6.2 Subscription
```prisma
model Subscription {
  id          String   @id @default(cuid())
  businessId  String   @unique
  planId      String
  status      String   @default("trial") // trial | active | expired | grace | suspended
  startDate   DateTime
  endDate     DateTime
  trialEndsAt DateTime?
  amount      Int      // in paise
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  business    Business @relation(fields: [businessId], references: [id])
  plan        SubscriptionPlan @relation(fields: [planId], references: [id])
}
```

### 6.3 Admin User
- Regular `User` model with `role: "super_admin"` (stored in `authProvider` field as `"super_admin"`)
- No business membership required
- Identified by `authProvider = "super_admin"`

## 7. Access Control

| Route | Regular User | Admin User |
|-------|-------------|------------|
| `/` (main app) | ✅ | ❌ (redirects to /admin) |
| `/admin` | ❌ (redirects to /) | ✅ |
| `/api/*` (business routes) | ✅ (with business context) | ✅ (can impersonate) |
| `/api/admin/*` | ❌ (403) | ✅ |

## 8. Security

- Admin password hashed with bcrypt (12 rounds)
- Admin sessions expire in 7 days (shorter than regular 30 days)
- All admin actions logged to audit trail
- Admin cannot delete own account
- Rate limited: 5 login attempts per minute
- IP whitelist (optional, configurable via env)
