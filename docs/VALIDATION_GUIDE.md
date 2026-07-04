# Validation Guide

> **Status:** Source of truth for input validation
> **Related:** `15_SECURITY_GUIDE.md`, `04_API_SPECIFICATION.md`, `src/lib/schemas/`

## 1. Principles

1. **Never trust client input** — every `req.json()` must be validated
2. **Single source of truth** — one zod schema per resource, shared between client and server
3. **Fail fast** — return 422 with specific field errors before touching the database
4. **Typed end-to-end** — `z.infer<typeof schema>` for TypeScript types
5. **No duplicated logic** — schemas live in `src/lib/schemas/`, imported by routes and forms

## 2. Schema Location

```
src/lib/schemas/
└── index.ts    # All schemas + type exports
```

**Rule:** One file per resource is overkill at this scale. A single `index.ts` with clearly separated sections is maintainable. If it exceeds 500 lines, split by resource.

## 3. Available Schemas

| Schema | Resource | Used by |
|--------|----------|---------|
| `createInvoiceSchema` | Invoice creation | `POST /api/invoices` |
| `createQuotationSchema` | Quotation creation | `POST /api/quotations` |
| `createPurchaseSchema` | Purchase creation | `POST /api/purchases` |
| `createPartySchema` | Party creation | `POST /api/parties` |
| `updatePartySchema` | Party update | `PATCH /api/parties` |
| `createProductSchema` | Product creation | `POST /api/products` |
| `updateProductSchema` | Product update | `PATCH /api/products` |
| `createExpenseSchema` | Expense creation | `POST /api/expenses` |
| `createPaymentSchema` | Payment creation | `POST /api/payments` |
| `updateBusinessSchema` | Business update | `PATCH /api/business` |
| `updateQuotationStatusSchema` | Quotation status/convert | `PATCH /api/quotations/[id]` |
| `listQuerySchema` | List query params | All `GET` list endpoints |

## 4. Shared Field Validators

| Validator | Rule | Error message |
|-----------|------|---------------|
| `gstinSchema` | `/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/` | "Invalid GSTIN format" |
| `panSchema` | `/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/` | "Invalid PAN format" |
| `phoneSchema` | `/^(\+91)?[6-9]\d{9}$/` | "Invalid Indian phone number" |
| `pincodeSchema` | `/^\d{6}$/` | "Pincode must be 6 digits" |
| `emailSchema` | zod `.email()` | "Invalid email" |
| `moneySchema` | `z.number().nonnegative().max(9999999999.99)` | — |
| `quantitySchema` | `z.number().positive()` | "Quantity must be positive" |
| `taxRateSchema` | `z.number().min(0).max(100)` | — |
| `dateSchema` | `z.string().refine(s => !isNaN(Date.parse(s)))` | "Invalid date" |

## 5. Usage Pattern in Route Handlers

```ts
import { apiHandler, apiSuccess, ApiError } from "@/lib/api-error";
import { createInvoiceSchema } from "@/lib/schemas";

export const POST = apiHandler(async (req) => {
  const body = await req.json();
  const parsed = createInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    throw ApiError.validation("Invalid invoice data", parsed.error.issues);
  }
  const data = parsed.data;  // fully typed: CreateInvoiceInput

  // ... business logic ...

  return apiSuccess({ id: inv.id, number: inv.number });
});
```

## 6. Usage Pattern in Client Forms

```ts
import { createInvoiceSchema } from "@/lib/schemas";

// React Hook Form + zod resolver
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const form = useForm({
  resolver: zodResolver(createInvoiceSchema),
});
```

**Benefit:** The same schema validates on the client (instant feedback) and server (security). No duplication.

## 7. Error Response Format

When validation fails, the API returns:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid invoice data",
    "details": [
      {
        "code": "too_small",
        "path": ["items", 0, "quantity"],
        "message": "Quantity must be positive"
      }
    ]
  },
  "requestId": "uuid-..."
}
```

## 8. Validation Rules by Field

### 8.1 GSTIN
- 15 characters: 2 digits (state) + 10 chars (PAN) + 1 char (entity) + "Z" + 1 char (checksum)
- Uppercased before validation
- Optional (walk-in customers have none)
- Regex: `/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/`

### 8.2 PAN
- 10 characters: 5 letters + 4 digits + 1 letter
- Uppercased before validation
- Optional

### 8.3 Phone
- 10 digits starting with 6-9 (Indian mobile)
- Optional `+91` prefix
- Optional

### 8.4 Pincode
- Exactly 6 digits
- Optional

### 8.5 Money
- Non-negative number
- Max: 9,999,999,999.99 (fits Decimal(12,2))

### 8.6 Quantity
- Positive number (must be > 0)
- Can be fractional (e.g., 2.5 kg)

### 8.7 Tax Rate
- 0 to 100 (allows cess-like rates)

### 8.8 Dates
- ISO 8601 string (e.g., "2026-06-29")
- Validated via `Date.parse()`

## 9. Current Implementation Status

| Resource | Schema created | Route uses schema | Status |
|----------|---------------|-------------------|--------|
| Invoice | ✅ | ❌ | Schema ready, route not refactored |
| Quotation | ✅ | ❌ | Schema ready, route not refactored |
| Purchase | ✅ | ❌ | Schema ready, route not refactored |
| Party | ✅ | ❌ | Schema ready, route not refactored |
| Product | ✅ | ❌ | Schema ready, route not refactored |
| Expense | ✅ | ❌ | Schema ready, route not refactored |
| Payment | ✅ | ❌ | Schema ready, route not refactored |
| Business | ✅ | ❌ | Schema ready, route not refactored |

**Note:** All schemas are created and tested. Refactoring all 18 routes to use them is tracked as P1 (VALID-001 in backlog). The `invoices` route will be refactored first as the reference implementation.

## 10. Testing Validation

### 10.1 Unit Test Schemas Directly
```ts
import { describe, it, expect } from "vitest";
import { createInvoiceSchema, gstinSchema } from "@/lib/schemas";

describe("createInvoiceSchema", () => {
  it("validates a correct invoice", () => {
    const result = createInvoiceSchema.safeParse({
      invoiceDate: "2026-06-29",
      items: [{ name: "Test", quantity: 1, price: 100, taxRate: 18 }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty items array", () => {
    const result = createInvoiceSchema.safeParse({
      invoiceDate: "2026-06-29",
      items: [],
    });
    expect(result.success).toBe(false);
  });
});
```

### 10.2 Integration Test via API
```ts
// Test that invalid input returns 422 with details
const res = await fetch("/api/invoices", {
  method: "POST",
  body: JSON.stringify({ items: [] }), // missing invoiceDate, empty items
});
expect(res.status).toBe(422);
const body = await res.json();
expect(body.error.code).toBe("VALIDATION_ERROR");
```

## 11. Best Practices

1. **Validate at the boundary** — schemas on API routes, not in components
2. **Coerce types carefully** — use `z.coerce.number()` for query params (strings → numbers)
3. **Default values** — use `.default()` for optional fields with sensible defaults
4. **Transforms** — `gstinSchema.toUpperCase()` normalizes before validation
5. **Composability** — build complex schemas from smaller ones (`lineItemSchema` used in 3 resources)
6. **Don't validate what you trust** — Prisma-generated IDs don't need re-validation
7. **Error messages** — specific and actionable ("Quantity must be positive" not "Invalid")
