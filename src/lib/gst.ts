/**
 * Indian GST calculation engine — production-grade.
 * Handles CGST/SGST (intra-state) and IGST (inter-state), per-line discounts,
 * rounding, and document totals.
 */

export type SupplyType = "intra" | "inter";

export interface LineInput {
  productId?: string;
  name: string;
  hsn?: string | null;
  quantity: number;
  unit?: string | null;
  price: number; // per-unit rate (pre-tax)
  discountPct?: number;
  discountAmt?: number; // absolute, applied after pct
  taxRate: number; // %, e.g. 18
}

export interface ComputedLine extends LineInput {
  gross: number; // qty * price
  discountTotal: number; // pct + amt
  taxable: number; // after discount
  cgst: number;
  sgst: number;
  igst: number;
  total: number; // taxable + tax
}

export interface DocumentTotals {
  subtotal: number; // sum of gross
  discountTotal: number;
  taxableValue: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  cessTotal: number;
  roundOff: number;
  grandTotal: number;
}

export const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28];

/** Round to 2 decimals avoiding float drift. */
export function r2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function computeLine(line: LineInput, supplyType: SupplyType): ComputedLine {
  const qty = Math.max(0, Number(line.quantity) || 0);
  const price = Math.max(0, Number(line.price) || 0);
  const gross = r2(qty * price);

  const pct = Math.max(0, Math.min(100, Number(line.discountPct) || 0));
  const pctDiscount = r2((gross * pct) / 100);
  const amtDiscount = Math.max(0, Number(line.discountAmt) || 0);
  const discountTotal = r2(pctDiscount + amtDiscount);

  const taxable = r2(Math.max(0, gross - discountTotal));
  const rate = Math.max(0, Number(line.taxRate) || 0);

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (supplyType === "intra") {
    cgst = r2((taxable * rate) / 200); // half of rate%
    sgst = cgst;
  } else {
    igst = r2((taxable * rate) / 100);
  }

  const total = r2(taxable + cgst + sgst + igst);

  return {
    ...line,
    gross,
    discountTotal,
    taxable,
    cgst,
    sgst,
    igst,
    total,
  };
}

export function computeDocument(lines: LineInput[], supplyType: SupplyType): {
  lines: ComputedLine[];
  totals: DocumentTotals;
} {
  const computed = lines.map((l) => computeLine(l, supplyType));

  const subtotal = r2(computed.reduce((s, l) => s + l.gross, 0));
  const discountTotal = r2(computed.reduce((s, l) => s + l.discountTotal, 0));
  const taxableValue = r2(computed.reduce((s, l) => s + l.taxable, 0));
  const cgstTotal = r2(computed.reduce((s, l) => s + l.cgst, 0));
  const sgstTotal = r2(computed.reduce((s, l) => s + l.sgst, 0));
  const igstTotal = r2(computed.reduce((s, l) => s + l.igst, 0));
  const taxTotal = r2(cgstTotal + sgstTotal + igstTotal);
  const rawGrand = r2(taxableValue + taxTotal);
  const grandTotal = Math.round(rawGrand);
  const roundOff = r2(grandTotal - rawGrand);

  return {
    lines: computed,
    totals: {
      subtotal,
      discountTotal,
      taxableValue,
      cgstTotal,
      sgstTotal,
      igstTotal,
      cessTotal: 0,
      roundOff,
      grandTotal,
    },
  };
}

/** Validate GSTIN format: 2 digit state + 10 char PAN + 1 entity + 1 Z + 1 checksum. */
export function isValidGstin(gstin?: string | null): boolean {
  if (!gstin) return true;
  const pattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return pattern.test(gstin.trim().toUpperCase());
}

export function stateCodeFromGstin(gstin?: string | null): string | null {
  if (!gstin) return null;
  const code = gstin.trim().substring(0, 2);
  return /^\d{2}$/.test(code) ? code : null;
}

/** Determine supply type from two state codes. */
export function deriveSupplyType(
  businessStateCode?: string | null,
  partyStateCode?: string | null
): SupplyType {
  if (!businessStateCode || !partyStateCode) return "intra";
  return businessStateCode === partyStateCode ? "intra" : "inter";
}

export const INDIAN_STATES: { code: string; name: string }[] = [
  { code: "01", name: "Jammu & Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "25", name: "Daman & Diu" },
  { code: "26", name: "Dadra & Nagar Haveli" },
  { code: "27", name: "Maharashtra" },
  { code: "28", name: "Andhra Pradesh (Old)" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman & Nicobar" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "38", name: "Ladakh" },
];
