# 09 — Permission Matrix

> **Status:** Specification (RBAC enforcement is Phase 3 — see `19_BACKLOG.md` RBAC-001)
> **Related:** `SECURITY_AUDIT.md` §2, ADR-006, `10_BUSINESS_RULES.md`

## 1. Roles

MedBill defines 13 roles. Each role has a set of permissions across modules and actions.

| Role | Description | Typical User |
|------|-------------|--------------|
| Owner | Full access, can manage business & billing | Business owner |
| Partner | Full access except deleting business | Co-owner |
| Manager | Sales, purchase, inventory, reports | Store manager |
| Cashier | POS & sales only | Counter staff |
| Sales | Create invoices, receive payments | Salesperson |
| Purchase | Create purchases, manage suppliers | Purchase manager |
| Accountant | Reports, GST, ledger, no mutations | CA / accountant |
| Store Keeper | Inventory, stock adjustment | Godown keeper |
| Warehouse Manager | Stock transfer, warehouses | Warehouse lead |
| Delivery Staff | View invoices, update delivery | Delivery person |
| Employee | View-only dashboard | General staff |
| Auditor | View-only all modules | External auditor |
| CA | View reports, GST, ledger | Chartered Accountant |

## 2. Actions

Every permission is a combination of **module × action**.

**Actions:**
- `create` — create new records
- `read` — view records
- `update` — edit existing records
- `delete` — delete/cancel records
- `export` — export data (CSV, PDF, JSON)
- `approve` — approve workflows (e.g., stock adjustment, large discount)
- `reject` — reject workflows
- `print` — print invoices/quotes/reports
- `settings` — modify business settings

## 3. Permission Matrix

### 3.1 Dashboard
| Role | Read |
|------|------|
| Owner, Partner, Manager, Accountant, Auditor, CA, Employee | ✅ |
| Cashier, Sales, Purchase, Store Keeper, Warehouse Manager, Delivery | ✅ (limited KPIs) |

### 3.2 Sales & Invoices
| Role | Create | Read | Update | Delete | Export | Print |
|------|--------|------|--------|--------|--------|-------|
| Owner | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Partner | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manager | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Cashier | ✅ (POS) | ✅ | ❌ | ❌ | ❌ | ✅ |
| Sales | ✅ | ✅ | ✅ (own) | ❌ | ❌ | ✅ |
| Accountant | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Store Keeper | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Auditor | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| CA | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Employee | ❌ | ✅ (own) | ❌ | ❌ | ❌ | ❌ |
| Delivery | ❌ | ✅ (assigned) | ❌ | ❌ | ❌ | ✅ |

### 3.3 POS Billing
| Role | Access |
|------|--------|
| Owner, Partner, Manager, Cashier | ✅ |
| Sales | ✅ |
| All others | ❌ |

### 3.4 Purchases
| Role | Create | Read | Update | Delete |
|------|--------|------|--------|--------|
| Owner, Partner | ✅ | ✅ | ✅ | ✅ |
| Manager, Purchase | ✅ | ✅ | ✅ | ❌ |
| Accountant, CA | ❌ | ✅ | ❌ | ❌ |
| Cashier, Sales, Store Keeper | ❌ | ❌ | ❌ | ❌ |

### 3.5 Inventory
| Role | Create | Read | Update | Adjust Stock | Delete |
|------|--------|------|--------|--------------|--------|
| Owner, Partner, Manager | ✅ | ✅ | ✅ | ✅ | ✅ |
| Store Keeper, Warehouse Manager | ❌ | ✅ | ✅ | ✅ | ❌ |
| Cashier, Sales | ❌ | ✅ | ❌ | ❌ | ❌ |
| Accountant, CA, Auditor | ❌ | ✅ | ❌ | ❌ | ❌ |

### 3.6 Parties (Customers & Suppliers)
| Role | Create | Read | Update | Delete |
|------|--------|------|--------|--------|
| Owner, Partner, Manager | ✅ | ✅ | ✅ | ✅ |
| Sales, Purchase | ✅ | ✅ | ✅ | ❌ |
| Cashier | ❌ | ✅ (customers) | ❌ | ❌ |
| Accountant, CA, Auditor | ❌ | ✅ | ❌ | ❌ |

### 3.7 Quotations
| Role | Create | Read | Update | Convert | Delete |
|------|--------|------|--------|---------|--------|
| Owner, Partner, Manager, Sales | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cashier | ❌ | ✅ | ❌ | ❌ | ❌ |
| Accountant, CA | ❌ | ✅ | ❌ | ❌ | ❌ |

### 3.8 Expenses
| Role | Create | Read | Update | Delete |
|------|--------|------|--------|--------|
| Owner, Partner | ✅ | ✅ | ✅ | ✅ |
| Manager | ✅ | ✅ | ✅ | ❌ |
| Accountant | ❌ | ✅ | ❌ | ❌ |
| Cashier, Sales | ❌ | ❌ | ❌ | ❌ |

### 3.9 Payments
| Role | Create | Read | Delete |
|------|--------|------|--------|
| Owner, Partner, Manager | ✅ | ✅ | ✅ |
| Cashier, Sales | ✅ (receipts) | ✅ | ❌ |
| Accountant | ❌ | ✅ | ❌ |

### 3.10 Reports
| Role | Read | Export |
|------|------|--------|
| Owner, Partner, Manager, Accountant, CA, Auditor | ✅ | ✅ |
| Sales, Purchase | ✅ (limited) | ❌ |
| Cashier, Store Keeper, Employee | ❌ | ❌ |

### 3.11 GST Returns
| Role | Read | Export | File |
|------|------|--------|------|
| Owner, Partner | ✅ | ✅ | ✅ |
| Manager, Accountant, CA | ✅ | ✅ | ❌ |
| All others | ❌ | ❌ | ❌ |

### 3.12 Audit Log
| Role | Read | Export |
|------|------|--------|
| Owner, Partner, Auditor | ✅ | ✅ |
| Manager | ✅ | ❌ |
| All others | ❌ | ❌ |

### 3.13 Settings
| Role | Read | Update |
|------|------|--------|
| Owner | ✅ | ✅ |
| Partner | ✅ | ✅ (except delete business) |
| Manager | ✅ | ❌ |
| All others | ❌ | ❌ |

## 4. Implementation (Phase 3)

### 4.1 Enforcement Point

Every API route must call `requireRole`:

```ts
import { requireRole } from "@/lib/auth";

export async function POST(req: Request) {
  const { user, business } = await requireRole(req, ["owner", "manager", "sales"]);
  // ... route logic
}
```

### 4.2 `requireRole` Behavior
1. Verify JWT from `Authorization` header or cookie
2. Resolve user → `BusinessMember` → role
3. Check role against allowed list
4. Throw `ApiError(403, "FORBIDDEN")` if not allowed
5. Return `{ user, business }` on success
6. Log access attempt to audit log

### 4.3 Client-Side Hiding
The frontend should hide UI elements the user can't access, but **the server is the source of truth**. Client-side hiding is for UX, not security.

## 5. Custom Roles (Phase 5+)

The `BusinessMember.role` field is a string, allowing custom roles. A future `Role` model will define custom permissions:

```prisma
model Role {
  id          String   @id @default(cuid())
  businessId  String
  name        String
  permissions String   // JSON: { "invoice": ["create","read"], ... }
}
```

## 6. Multi-Business

A user can be a member of multiple businesses with different roles in each. The `BusinessMember` junction table captures this. The active business is selected via a switcher (planned) and stored as `activeBusinessId` in the JWT.
