/**
 * Zod validation schemas for all API resources.
 * See: docs/VALIDATION_GUIDE.md
 */
import { z } from "zod";

export const gstinSchema = z.string().toUpperCase().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN").optional().or(z.literal(""));
export const panSchema = z.string().toUpperCase().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN").optional().or(z.literal(""));
export const phoneSchema = z.string().regex(/^(\+91)?[6-9]\d{9}$/, "Invalid phone").optional().or(z.literal(""));
export const pincodeSchema = z.string().regex(/^\d{6}$/, "Pincode must be 6 digits").optional().or(z.literal(""));
export const emailSchema = z.string().email("Invalid email").optional().or(z.literal(""));
export const moneySchema = z.number().nonnegative().max(9999999999.99);
export const quantitySchema = z.number().positive("Quantity must be positive");
export const taxRateSchema = z.number().min(0).max(100);
export const dateSchema = z.string().refine((s) => !isNaN(Date.parse(s)), "Invalid date");

export const lineItemSchema = z.object({
  productId: z.string().cuid().optional(),
  name: z.string().min(1, "Item name required"),
  hsn: z.string().optional().nullable(),
  quantity: quantitySchema,
  unit: z.string().optional().nullable(),
  price: moneySchema,
  discountPct: z.number().min(0).max(100).optional().default(0),
  discountAmt: z.number().nonnegative().optional().default(0),
  taxRate: taxRateSchema,
});

export const createInvoiceSchema = z.object({
  partyId: z.string().cuid().optional(),
  partyName: z.string().optional(),
  partyGstin: gstinSchema,
  partyStateCode: z.string().optional(),
  invoiceDate: dateSchema,
  dueDate: dateSchema.optional(),
  supplyType: z.enum(["intra", "inter"]).optional(),
  items: z.array(lineItemSchema).min(1, "At least one item required"),
  notes: z.string().optional(),
  terms: z.string().optional(),
  placeOfSupply: z.string().optional(),
});

export const createPartySchema = z.object({
  type: z.enum(["customer", "supplier", "both"]).default("customer"),
  name: z.string().min(1, "Name required"),
  companyName: z.string().optional(),
  gstin: gstinSchema,
  pan: panSchema,
  phone: phoneSchema,
  email: emailSchema,
  whatsapp: z.string().optional(),
  addressLine1: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  stateCode: z.string().optional(),
  pincode: pincodeSchema,
  openingBalance: z.number().optional().default(0),
  creditLimit: z.number().nonnegative().optional().default(0),
  creditDays: z.number().int().nonnegative().optional().default(0),
  tags: z.string().optional(),
});

export const createProductSchema = z.object({
  name: z.string().min(1, "Product name required"),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  hsn: z.string().optional(),
  categoryId: z.string().cuid().optional(),
  unitId: z.string().cuid().optional(),
  taxId: z.string().cuid().optional(),
  taxRate: taxRateSchema.default(0),
  purchasePrice: moneySchema.default(0),
  salePrice: moneySchema.default(0),
  mrp: moneySchema.default(0),
  wholesalePrice: moneySchema.default(0),
  minStock: z.number().nonnegative().default(0),
  reorderLevel: z.number().nonnegative().default(0),
  openingStock: z.number().nonnegative().default(0),
  batchTracked: z.boolean().default(false),
  expiryTracked: z.boolean().default(false),
  serialTracked: z.boolean().default(false),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const createExpenseSchema = z.object({
  category: z.enum(["rent", "salary", "utilities", "travel", "marketing", "misc"]).default("misc"),
  amount: moneySchema,
  date: dateSchema,
  mode: z.enum(["cash", "upi", "card", "bank", "cheque"]).default("cash"),
  vendor: z.string().optional(),
  reference: z.string().optional(),
  note: z.string().optional(),
});

export const createPaymentSchema = z.object({
  type: z.enum(["receipt", "payment"]).default("receipt"),
  mode: z.enum(["cash", "upi", "card", "bank", "cheque", "rtgs"]).default("cash"),
  amount: moneySchema,
  date: dateSchema,
  invoiceId: z.string().cuid().optional(),
  purchaseId: z.string().cuid().optional(),
  partyId: z.string().cuid().optional(),
  reference: z.string().optional(),
  note: z.string().optional(),
});

export const updateBusinessSchema = z.object({
  name: z.string().min(1).optional(),
  legalName: z.string().optional(),
  gstin: gstinSchema,
  pan: panSchema,
  industry: z.string().optional(),
  businessType: z.string().optional(),
  email: emailSchema,
  phone: phoneSchema,
  addressLine1: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  stateCode: z.string().optional(),
  pincode: pincodeSchema,
  invoicePrefix: z.string().optional(),
  quotationPrefix: z.string().optional(),
  modules: z.record(z.boolean()).optional(),
});

export const listQuerySchema = z.object({
  q: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  cursor: z.string().optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type CreatePartyInput = z.infer<typeof createPartySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
