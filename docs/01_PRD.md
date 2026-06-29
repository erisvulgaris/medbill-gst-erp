# 01 — Product Requirements Document (PRD)

> **Status:** Source of truth for product scope and acceptance criteria
> **Version:** Phase 2 (Architecture Stabilization)
> **Last updated:** 2026-06-29

## 1. Vision

**MedBill** is India's fastest, most beautiful, and easiest-to-use GST billing and business management software for MSMEs (Micro, Small & Medium Enterprises). It adapts its dashboard, navigation, and modules to the selected industry during onboarding — no unnecessary features for service businesses, full inventory for retail.

## 2. Target Market

### 2.1 User Personas

| Persona | Business | Tech Comfort | Key Need |
|---------|----------|--------------|----------|
| Rahul (Owner) | Retail kirana, ₹50L/yr | Low | Fast billing + GST |
| Priya (Owner) | Medical store | Medium | Expiry tracking + GST |
| Amit (Manager) | Wholesale FMCG | Medium | Credit + party ledger |
| Suresh (Owner) | Restaurant | Low | POS + quick billing |
| Kavya (Freelancer) | Service | High | Simple invoicing + GST |

### 2.2 Industries (24+)
Retail, Wholesale, Distributor, Manufacturer, Medical/Pharmacy, Restaurant/Café, Salon/Spa, Service, Electronics, Grocery, Garments, Automobile Parts, Jewellery, FMCG, Stationery, Furniture, Hardware, Chemical, Clinic, Repair Center, Mobile Shop, Freelancer.

## 3. Goals

### 3.1 Business Goals
- **G1:** Onboard a new business in <2 minutes
- **G2:** Create an invoice in <30 seconds
- **G3:** File GSTR-1 with one click (data export)
- **G4:** Zero GST calculation errors

### 3.2 Performance Goals
- **P1:** 120 FPS scrolling on lists
- **P2:** <100ms interaction latency
- **P3:** <2.5s LCP
- **P4:** Works offline (Phase 4)

### 3.3 Quality Goals
- **Q1:** 95%+ test coverage on business logic
- **Q2:** 0 console errors in production
- **Q3:** Lighthouse Performance >90, A11y >95

## 4. Functional Requirements

### 4.1 Authentication
| Req | Description | Priority | Status |
|-----|-------------|----------|--------|
| AUTH-01 | Phone OTP login | Must | Phase 3 |
| AUTH-02 | Email OTP login | Must | Phase 3 |
| AUTH-03 | Google login | Should | Phase 3 |
| AUTH-04 | Business login (multi-business) | Should | Phase 5 |
| AUTH-05 | Session management | Must | Phase 3 |
| AUTH-06 | Device management | Could | Phase 5 |

### 4.2 Onboarding
| Req | Description | Priority | Status |
|-----|-------------|----------|--------|
| ONB-01 | Business name, GSTIN, PAN | Must | ✅ |
| ONB-02 | Business type selection | Must | ✅ |
| ONB-03 | Industry selection (12 options) | Must | ✅ |
| ONB-04 | Module toggles with industry presets | Must | ✅ |
| ONB-05 | Auto-customize dashboard/nav/reports | Must | ✅ |
| ONB-06 | Employee count, store mode | Should | ✅ |

### 4.3 Dashboard
| Req | Description | Priority | Status |
|-----|-------------|----------|--------|
| DASH-01 | KPI cards (sales, collected, outstanding, profit) | Must | ✅ |
| DASH-02 | Sales/collections area chart (14 days) | Must | ✅ |
| DASH-03 | GST collected pie chart | Must | ✅ |
| DASH-04 | Recent invoices list | Must | ✅ |
| DASH-05 | Low-stock alerts | Must | ✅ |
| DASH-06 | Top products bar chart | Should | ✅ |
| DASH-07 | Activity feed (notifications) | Must | ✅ |
| DASH-08 | Hero gradient with quick actions | Should | ✅ |

### 4.4 Sales & Invoices
| Req | Description | Priority | Status |
|-----|-------------|----------|--------|
| INV-01 | Create GST tax invoice (CGST/SGST/IGST) | Must | ✅ |
| INV-02 | Invoice list with search/filter | Must | ✅ |
| INV-03 | Live GST calculation in editor | Must | ✅ |
| INV-04 | Product picker with stock display | Must | ✅ |
| INV-05 | Party picker with GSTIN | Must | ✅ |
| INV-06 | Discount (% and amount) | Must | ✅ |
| INV-07 | Amount in words (Indian numbering) | Must | ✅ |
| INV-08 | Printable invoice view | Must | ✅ |
| INV-09 | WhatsApp share | Should | ✅ |
| INV-10 | Collect payment dialog | Must | ✅ |
| INV-11 | Payment history | Must | ✅ |
| INV-12 | Cancel invoice (restore stock) | Must | ✅ |
| INV-13 | Overdue tracking | Should | Phase 5 |
| INV-14 | Recurring invoices | Could | Phase 5 |

### 4.5 POS Billing
| Req | Description | Priority | Status |
|-----|-------------|----------|--------|
| POS-01 | Product grid with search | Must | ✅ |
| POS-02 | Cart with quantity controls | Must | ✅ |
| POS-03 | Payment mode (cash/upi/card) | Must | ✅ |
| POS-04 | Instant checkout (invoice + payment) | Must | ✅ |
| POS-05 | Barcode scanner | Should | Phase 5 |
| POS-06 | Hold/recall bill | Could | Phase 5 |

### 4.6 Inventory
| Req | Description | Priority | Status |
|-----|-------------|----------|--------|
| INV-01 | Product CRUD | Must | ✅ |
| INV-02 | Stock adjustment (in/out) | Must | ✅ |
| INV-03 | Low-stock alerts | Must | ✅ |
| INV-04 | Category/unit/tax management | Must | ✅ |
| INV-05 | Barcode display | Must | ✅ |
| INV-06 | Batch tracking UI | Should | Phase 5 |
| INV-07 | Expiry tracking UI | Should | Phase 5 |
| INV-08 | Serial tracking UI | Should | Phase 5 |
| INV-09 | Stock transfer between branches | Could | Phase 5 |
| INV-10 | Reorder suggestions | Could | Phase 5 |

### 4.7 Parties
| Req | Description | Priority | Status |
|-----|-------------|----------|--------|
| PTY-01 | Customer/supplier CRUD | Must | ✅ |
| PTY-02 | Outstanding balance (live) | Must | ✅ |
| PTY-03 | Credit limit/days | Must | ✅ |
| PTY-04 | Party statement (ledger) | Must | ✅ |
| PTY-05 | GSTIN validation | Must | ✅ |
| PTY-06 | Outstanding reminders (WhatsApp) | Should | Phase 5 |

### 4.8 Purchases
| Req | Description | Priority | Status |
|-----|-------------|----------|--------|
| PUR-01 | Record purchase with GST | Must | ✅ |
| PUR-02 | Auto stock-in | Must | ✅ |
| PUR-03 | Supplier bill number | Must | ✅ |
| PUR-04 | Purchase return | Should | Phase 5 |

### 4.9 Quotations
| Req | Description | Priority | Status |
|-----|-------------|----------|--------|
| QT-01 | Create quotation with GST | Must | ✅ |
| QT-02 | Status workflow (draft→sent→accepted) | Must | ✅ |
| QT-03 | Convert to invoice | Must | ✅ |
| QT-04 | WhatsApp share | Should | ✅ |
| QT-05 | Expiry tracking | Should | ✅ |

### 4.10 Expenses
| Req | Description | Priority | Status |
|-----|-------------|----------|--------|
| EXP-01 | Record expense with category | Must | ✅ |
| EXP-02 | Category pie chart | Must | ✅ |
| EXP-03 | Date range filter | Must | ✅ |
| EXP-04 | Payment mode | Must | ✅ |

### 4.11 Reports
| Req | Description | Priority | Status |
|-----|-------------|----------|--------|
| RPT-01 | Profit & Loss | Must | ✅ |
| RPT-02 | Sales Register | Must | ✅ |
| RPT-03 | Purchase Register | Must | ✅ |
| RPT-04 | Party Report | Must | ✅ |
| RPT-05 | Inventory Valuation | Must | ✅ |
| RPT-06 | Day Book | Must | ✅ |
| RPT-07 | CSV export | Must | ✅ |
| RPT-08 | Balance Sheet | Should | Phase 5 |
| RPT-09 | Trial Balance | Should | Phase 5 |
| RPT-10 | Cash Flow | Should | Phase 5 |

### 4.12 GST Returns
| Req | Description | Priority | Status |
|-----|-------------|----------|--------|
| GST-01 | GSTR-1 outward supplies | Must | ✅ |
| GST-02 | HSN summary | Must | ✅ |
| GST-03 | Rate-wise breakdown | Must | ✅ |
| GST-04 | Export JSON | Should | ✅ |
| GST-05 | GSTR-2B reconciliation | Could | Phase 6 |
| GST-06 | GSTR-3B auto-generation | Could | Phase 6 |
| GST-07 | E-invoicing (IRN/QR) | Could | Phase 6 |

### 4.13 Audit Log
| Req | Description | Priority | Status |
|-----|-------------|----------|--------|
| AUD-01 | Log all mutations | Must | Partial (3 routes) |
| AUD-02 | Audit log viewer | Must | ✅ |
| AUD-03 | Filter by entity/action | Must | ✅ |
| AUD-04 | CSV export | Must | ✅ |
| AUD-05 | IP + user agent capture | Should | Phase 3 |
| AUD-06 | Tamper-evidence (hash chain) | Could | Phase 5 |

### 4.14 Settings
| Req | Description | Priority | Status |
|-----|-------------|----------|--------|
| SET-01 | Business profile edit | Must | ✅ |
| SET-02 | Module toggles | Must | ✅ |
| SET-03 | Roles overview | Must | ✅ |
| SET-04 | Security overview | Must | ✅ |
| SET-05 | Data backup/restore | Should | UI only |
| SET-06 | Import (Excel/CSV) | Should | Phase 5 |

## 5. Non-Functional Requirements

### 5.1 Performance
- 120 FPS scrolling (virtualized lists)
- <100ms interaction latency (optimistic updates)
- <2.5s LCP
- <150 KB critical JS (target)

### 5.2 Security
- All routes authenticated (Phase 3)
- All input validated (zod, Phase 3)
- RBAC enforced (Phase 3)
- Audit log on all mutations

### 5.3 Usability
- Onboarding <2 minutes
- Invoice creation <30 seconds
- Mobile-first responsive
- Dark mode

### 5.4 Reliability
- Error boundaries on all views
- No whitescreen on render error
- Graceful API error handling
- Offline-capable (Phase 4)

### 5.5 Maintainability
- 95%+ test coverage on business logic
- TypeScript strict mode
- Documentation as source of truth
- <300 LOC per component file

## 6. User Flows

See `08_USER_FLOWS.md` for detailed step-by-step flows.

### 6.1 Critical Flows
1. **Onboarding:** Landing → Business info → Industry → Modules → Review → Launch
2. **Create Invoice:** Dashboard → New Invoice → Select party → Add products → Save → View/Print
3. **Collect Payment:** Open invoice → Collect Payment → Enter amount → Record → Status = PAID
4. **POS Sale:** POS → Add products to cart → Select payment mode → Checkout → Success
5. **Quotation → Invoice:** New Quotation → Save → Mark sent → Accept → Convert to invoice

## 7. Acceptance Criteria

### 7.1 Invoice Creation
- [ ] User can select a party from searchable dropdown
- [ ] User can add products via searchable picker
- [ ] GST calculates live (CGST+SGST for intra, IGST for inter)
- [ ] Discount % and amount both supported
- [ ] Grand total rounds to nearest rupee
- [ ] Amount in words displays correctly
- [ ] Invoice number auto-generates (INV-0001)
- [ ] Stock decrements on save
- [ ] Printable view shows all GST details
- [ ] WhatsApp share works

### 7.2 GST Calculation
- [ ] 0%, 0.25%, 3%, 5%, 12%, 18%, 28% rates supported
- [ ] Intra-state: CGST = SGST = rate/2
- [ ] Inter-state: IGST = rate
- [ ] Supply type auto-derived from state codes
- [ ] 100% unit test coverage on `gst.ts`

## 8. Out of Scope (Phase 2)

- Payroll module
- Manufacturing module (BOM, production orders)
- CRM module (leads, pipeline)
- E-invoicing (IRN/QR)
- Multi-branch switcher UI
- Mobile app (React Native)
- Multi-currency
- Recurring invoices
- Custom report builder

## 9. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Onboarding completion | >90% | Analytics |
| Invoice creation time | <30s | Time tracking |
| GST accuracy | 100% | Audit |
| User retention (30-day) | >60% | Analytics |
| Lighthouse Performance | >90 | CI |
| Test coverage (business logic) | 95% | CI |
| Console errors | 0 | QA |

## 10. Release Milestones

| Version | Focus | Status |
|---------|-------|--------|
| 0.1.0 | Phase 1: Foundation (12 views, 18 APIs, 22 models) | ✅ |
| 0.2.0 | Phase 1.5: Feature expansion (payments, quotations, audit, party statements) | ✅ |
| 0.3.0 | Phase 2: Documentation, audits, ADRs, testing infra | ✅ (in progress) |
| 0.4.0 | Phase 3: Auth, validation, error handling, migrations | Planned |
| 0.5.0 | Phase 4: Virtualization, optimistic updates, offline | Planned |
| 0.6.0 | Phase 5: Real auth providers, RBAC, advanced modules | Planned |
| 1.0.0 | Phase 6: E-invoicing, production launch | Planned |
