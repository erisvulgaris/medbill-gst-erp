import { describe, it, expect } from "vitest";
import { createInvoiceSchema, createPartySchema, createProductSchema, createPaymentSchema, gstinSchema, listQuerySchema } from "./index";

describe("gstinSchema", () => {
  it("accepts valid GSTIN", () => { expect(gstinSchema.safeParse("27ABCDE1234F1Z5").success).toBe(true); });
  it("normalizes to uppercase", () => { expect(gstinSchema.safeParse("27abcde1234f1z5").success).toBe(true); });
  it("accepts empty (optional)", () => { expect(gstinSchema.safeParse("").success).toBe(true); });
  it("rejects invalid", () => { expect(gstinSchema.safeParse("INVALID").success).toBe(false); });
});

describe("createInvoiceSchema", () => {
  const valid = { invoiceDate: "2026-06-29", items: [{ name: "Test", quantity: 2, price: 100, taxRate: 18 }] };
  it("accepts valid invoice", () => { expect(createInvoiceSchema.safeParse(valid).success).toBe(true); });
  it("rejects empty items", () => { expect(createInvoiceSchema.safeParse({ ...valid, items: [] }).success).toBe(false); });
  it("rejects missing date", () => { expect(createInvoiceSchema.safeParse({ items: valid.items }).success).toBe(false); });
  it("rejects negative price", () => { expect(createInvoiceSchema.safeParse({ ...valid, items: [{ name: "X", quantity: 1, price: -100, taxRate: 18 }] }).success).toBe(false); });
  it("rejects zero quantity", () => { expect(createInvoiceSchema.safeParse({ ...valid, items: [{ name: "X", quantity: 0, price: 100, taxRate: 18 }] }).success).toBe(false); });
});

describe("createPartySchema", () => {
  it("accepts valid party", () => { expect(createPartySchema.safeParse({ type: "customer", name: "Anil", phone: "9876543210" }).success).toBe(true); });
  it("rejects empty name", () => { expect(createPartySchema.safeParse({ name: "" }).success).toBe(false); });
  it("defaults type to customer", () => { const r = createPartySchema.safeParse({ name: "X" }); expect(r.success && r.data.type).toBe("customer"); });
});

describe("listQuerySchema", () => {
  it("defaults limit to 100", () => { const r = listQuerySchema.safeParse({}); expect(r.success && r.data.limit).toBe(100); });
  it("coerces string limit", () => { const r = listQuerySchema.safeParse({ limit: "50" }); expect(r.success && r.data.limit).toBe(50); });
  it("rejects limit > 100", () => { expect(listQuerySchema.safeParse({ limit: 500 }).success).toBe(false); });
});
