# Feature Gap Analysis

> **Audit date:** 2026-06-30
> **Method:** Competitor feature comparison vs MedBill current implementation
> **Related:** `COMPETITOR_ANALYSIS.md`, `01_PRD.md`, `19_BACKLOG.md`

## Classification

- **Critical** — must-have for commercial viability (block launch)
- **Important** — expected by target users (ship within 3 months)
- **Optional** — nice-to-have differentiators (6 months)
- **Future** — long-term roadmap (12 months)
- **Reject** — explicitly not building (out of scope)

---

## Critical (Block Launch)

| # | Feature | MedBill | Competitors | Gap |
|---|---------|---------|-------------|-----|
| C1 | Authentication (login, multi-user) | ❌ | All have | Full gap |
| C2 | Input validation (all endpoints) | ❌ (schemas ready, 0/18 routes) | All have | Full gap |
| C3 | Error handling (all endpoints) | ❌ (framework ready, 0/18 routes) | All have | Full gap |
| C4 | GST e-invoicing (IRN/QR) | ❌ | Tally, Vyapar, Zoho have | Full gap |
| C5 | E-way bill generation | ❌ | Tally, Vyapar, Busy have | Full gap |
| C6 | Backup & restore | ✅ Scripts | All have | Minimal |
| C7 | Data export (Excel/CSV) | 🟡 CSV only | All have Excel | Partial |
| C8 | Multi-user with roles | ❌ (schema only) | All have | Full gap |
| C9 | Payment reminders | ❌ | myBillBook, Vyapar have | Full gap |
| C10 | Mobile responsive | ✅ | All have | Minimal |

## Important (Ship Within 3 Months)

| # | Feature | MedBill | Competitors | Gap |
|---|---------|---------|-------------|-----|
| I1 | Offline mode (PWA) | ❌ | Vyapar, Tally, Busy have | Full gap |
| I2 | Barcode scanning (camera) | ❌ | Vyapar, Marg, Zoho Inv have | Full gap |
| I3 | Barcode label printing | ❌ | Vyapar, Marg have | Full gap |
| I4 | Recurring invoices | ❌ | Zoho Books, myBillBook have | Full gap |
| I5 | Quotation → Invoice conversion | ✅ | Most have | Minimal |
| I6 | Credit/Debit notes | ❌ (schema only) | Tally, Vyapar, Busy have | Full gap |
| I7 | Purchase returns | ❌ | Tally, Vyapar, Busy have | Full gap |
| I8 | Sales returns | ❌ (schema only) | All have | Full gap |
| I9 | Batch tracking UI | ❌ (schema only) | Vyapar, Marg, Busy have | Full gap |
| I10 | Expiry tracking UI | ❌ (schema only) | Marg, Busy have | Full gap |
| I11 | Serial number tracking UI | ❌ (schema only) | Vyapar, Busy have | Full gap |
| I12 | Multi-warehouse | ❌ (schema only) | Vyapar, Marg, Busy have | Full gap |
| I13 | Stock transfer | ❌ | Vyapar, Marg, Busy have | Full gap |
| I14 | Bank book / Cash book | ❌ | Tally, Busy, Vyapar have | Full gap |
| I15 | Trial balance | ❌ | Tally, Busy, Zoho have | Full gap |
| I16 | Balance sheet | ❌ | Tally, Busy, Zoho have | Full gap |
| I17 | Cash flow statement | ❌ | Tally, Zoho have | Full gap |
| I18 | GSTR-2B reconciliation | ❌ | Tally, Zoho have | Full gap |
| I19 | GSTR-3B generation | ❌ | Tally, Vyapar, Zoho have | Full gap |
| I20 | Payroll module | ❌ (toggle only) | Tally, Busy have | Full gap |
| I21 | Attendance/leave | ❌ | Tally, Busy have | Full gap |
| I22 | Employee targets/commission | ❌ | Vyapar, Marg have | Full gap |
| I23 | WhatsApp invoice sharing | ✅ (basic) | myBillBook, Swipe have | Minimal |
| I24 | Payment links (UPI) | ❌ | Zoho, Swipe have | Full gap |
| I25 | Outstanding reminders (auto) | ❌ | myBillBook, Vyapar have | Full gap |

## Optional (6 Months)

| # | Feature | MedBill | Competitors | Gap |
|---|---------|---------|-------------|-----|
| O1 | CRM module (leads, pipeline) | ❌ (toggle only) | None have natively | Differentiator |
| O2 | Manufacturing (BOM, production) | ❌ (toggle only) | Tally, Busy, Vyapar have | Full gap |
| O3 | Job costing | ❌ | Tally, Busy have | Full gap |
| O4 | Multi-currency | ❌ | Zoho Books has | Full gap |
| O5 | Multi-language | ❌ | Tally, Zoho have | Full gap |
| O6 | Custom report builder | ❌ | Tally has | Full gap |
| O7 | Email notifications | ❌ | Zoho, myBillBook have | Full gap |
| O8 | SMS notifications | ❌ | myBillBook, Vyapar have | Full gap |
| O9 | API for integrations | ❌ | Zoho Books has | Full gap |
| O10 | Online store integration | ❌ (toggle only) | Zoho Inventory has | Full gap |
| O11 | Delivery challan workflow | ❌ (type exists) | Vyapar, Marg have | Partial |
| O12 | Proforma invoice | ❌ (type exists) | Most have | Partial |
| O13 | ABC analysis (inventory) | ❌ | Marg, Busy have | Full gap |
| O14 | Fast/slow/dead stock report | ❌ | Marg, Busy have | Full gap |
| O15 | Branch management UI | ❌ (schema only) | Vyapar, Marg, Busy have | Full gap |

## Future (12 Months)

| # | Feature | MedBill | Competitors | Gap |
|---|---------|---------|-------------|-----|
| F1 | AI-powered insights | ❌ | None have | Differentiator |
| F2 | AI invoice data extraction (OCR) | ❌ | None have | Differentiator |
| F3 | Voice billing | ❌ | None have | Differentiator |
| F4 | Mobile app (native) | ❌ | Most have | Full gap |
| F5 | Multi-tenant SaaS | ❌ (single-tenant demo) | All SaaS have | Full gap |
| F6 | White-label / reseller | ❌ | Vyapar, Marg have | Full gap |
| F7 | Tally data import | ❌ | None have | Differentiator |
| F8 | Bank statement import | ❌ | Tally, Zoho have | Full gap |
| F9 | TDS management | ❌ | Tally, Busy have | Full gap |
| F10 | Fixed asset management | ❌ | Tally, Busy have | Full gap |

## Reject (Out of Scope)

| # | Feature | Reason |
|---|---------|--------|
| R1 | Cryptocurrency invoicing | Not relevant for Indian MSMEs |
| R2 | International tax (VAT/Sales Tax) | India-only focus |
| R3 | POS hardware integration (printers, cash drawers) | Too hardware-specific; use browser print |
| R4 | Desktop native app (Electron) | PWA covers offline; web is the future |
| R5 | Real-time collaboration (Google Docs style) | Overkill for single-user billing |

---

## Gap Summary

| Classification | Total | Have | Gap | % Complete |
|---------------|-------|------|-----|-----------|
| Critical | 10 | 2 | 8 | 20% |
| Important | 25 | 2 | 23 | 8% |
| Optional | 15 | 0 | 15 | 0% |
| Future | 10 | 0 | 10 | 0% |
| **Total** | **60** | **4** | **56** | **7%** |

## Strategic Recommendations

### Launch Blockers (Critical)
MedBill cannot launch commercially without:
1. Authentication (C1)
2. Validation + error handling on all routes (C2, C3)
3. Multi-user roles (C8)
4. E-invoicing + e-way bill (C4, C5)

### Differentiation Opportunity
MedBill can win on:
1. **Speed** — sub-5s invoice creation (competitors average 15-30s)
2. **UX** — modern web design (competitors are dated/desktop)
3. **Onboarding** — 2-minute wizard (Tally takes 1hr+)
4. **Price** — free tier with full features

### Realistic 6-Month Roadmap
1. **Month 1-2:** Auth, validation, error handling (Critical C1-C3, C8)
2. **Month 3:** E-invoicing, e-way bill (C4-C5), offline PWA (I1)
3. **Month 4:** Barcode (I2-I3), returns (I6-I8), batch/expiry/serial (I9-I11)
4. **Month 5:** Accounting depth (I14-I17), GST returns (I18-I19)
5. **Month 6:** Payroll (I20), CRM (O1), mobile PWA polish
