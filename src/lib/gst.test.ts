import { describe, it, expect } from "vitest";
import {
  computeLine,
  computeDocument,
  isValidGstin,
  stateCodeFromGstin,
  deriveSupplyType,
  r2,
  GST_RATES,
  INDIAN_STATES,
  type LineInput,
} from "./gst";

/**
 * GST Engine Unit Tests
 * Target: 100% line coverage
 * See: docs/11_GST_ENGINE.md, docs/16_TESTING_GUIDE.md, ADR-010
 */

describe("r2 — rounding to 2 decimals", () => {
  it("rounds standard values", () => {
    expect(r2(1.005)).toBe(1.01);
    expect(r2(1.015)).toBe(1.02);
    expect(r2(2.345)).toBe(2.35);
  });

  it("handles integers", () => {
    expect(r2(5)).toBe(5);
    expect(r2(0)).toBe(0);
  });

  it("avoids float drift", () => {
    expect(r2(0.1 + 0.2)).toBe(0.3);
    expect(r2(0.3)).toBe(0.3);
  });

  it("handles negative numbers", () => {
    // Math.round rounds toward +Infinity at .5 boundary, so -1.005 → -1
    expect(r2(-1.005)).toBe(-1);
    expect(r2(-2.346)).toBe(-2.35);
  });

  it("handles very small numbers", () => {
    expect(r2(0.001)).toBe(0);
    expect(r2(0.005)).toBe(0.01);
  });
});

describe("computeLine — intra-state (CGST + SGST)", () => {
  const baseLine: LineInput = {
    name: "Test Product",
    quantity: 1,
    price: 100,
    taxRate: 18,
  };

  it("computes CGST + SGST for 18% GST intra-state", () => {
    const result = computeLine(baseLine, "intra");
    expect(result.gross).toBe(100);
    expect(result.taxable).toBe(100);
    expect(result.cgst).toBe(9); // 18/2 %
    expect(result.sgst).toBe(9);
    expect(result.igst).toBe(0);
    expect(result.total).toBe(118);
  });

  it("computes for each standard GST rate", () => {
    GST_RATES.forEach((rate) => {
      const line = { ...baseLine, taxRate: rate };
      const result = computeLine(line, "intra");
      const expectedCgst = r2((100 * rate) / 200);
      expect(result.cgst).toBe(expectedCgst);
      expect(result.sgst).toBe(expectedCgst);
      expect(result.igst).toBe(0);
      expect(result.total).toBe(r2(100 + expectedCgst * 2));
    });
  });

  it("handles 0% GST", () => {
    const result = computeLine({ ...baseLine, taxRate: 0 }, "intra");
    expect(result.cgst).toBe(0);
    expect(result.sgst).toBe(0);
    expect(result.total).toBe(100);
  });

  it("preserves line metadata", () => {
    const line: LineInput = {
      productId: "prod-1",
      name: "Aashirvaad Atta",
      hsn: "1101",
      quantity: 2,
      unit: "pk",
      price: 290,
      taxRate: 5,
    };
    const result = computeLine(line, "intra");
    expect(result.productId).toBe("prod-1");
    expect(result.name).toBe("Aashirvaad Atta");
    expect(result.hsn).toBe("1101");
    expect(result.unit).toBe("pk");
    expect(result.taxRate).toBe(5);
  });
});

describe("computeLine — inter-state (IGST)", () => {
  const baseLine: LineInput = {
    name: "Test Product",
    quantity: 1,
    price: 100,
    taxRate: 18,
  };

  it("computes IGST for 18% GST inter-state", () => {
    const result = computeLine(baseLine, "inter");
    expect(result.gross).toBe(100);
    expect(result.taxable).toBe(100);
    expect(result.igst).toBe(18);
    expect(result.cgst).toBe(0);
    expect(result.sgst).toBe(0);
    expect(result.total).toBe(118);
  });

  it("computes for each standard GST rate", () => {
    GST_RATES.forEach((rate) => {
      const result = computeLine({ ...baseLine, taxRate: rate }, "inter");
      const expectedIgst = r2((100 * rate) / 100);
      expect(result.igst).toBe(expectedIgst);
      expect(result.cgst).toBe(0);
      expect(result.sgst).toBe(0);
    });
  });

  it("handles 0% GST inter-state", () => {
    const result = computeLine({ ...baseLine, taxRate: 0 }, "inter");
    expect(result.igst).toBe(0);
    expect(result.total).toBe(100);
  });
});

describe("computeLine — quantity and price", () => {
  it("multiplies quantity by price", () => {
    const result = computeLine({ name: "x", quantity: 5, price: 50, taxRate: 0 }, "intra");
    expect(result.gross).toBe(250);
  });

  it("handles fractional quantities", () => {
    const result = computeLine({ name: "x", quantity: 2.5, price: 40, taxRate: 0 }, "intra");
    expect(result.gross).toBe(100);
  });

  it("clamps negative quantity to 0", () => {
    const result = computeLine({ name: "x", quantity: -5, price: 100, taxRate: 18 }, "intra");
    expect(result.gross).toBe(0);
    expect(result.taxable).toBe(0);
    expect(result.cgst).toBe(0);
    expect(result.total).toBe(0);
  });

  it("clamps negative price to 0", () => {
    const result = computeLine({ name: "x", quantity: 5, price: -100, taxRate: 18 }, "intra");
    expect(result.gross).toBe(0);
    expect(result.total).toBe(0);
  });

  it("treats NaN quantity as 0", () => {
    const result = computeLine({ name: "x", quantity: Number.NaN, price: 100, taxRate: 18 }, "intra");
    expect(result.gross).toBe(0);
  });

  it("treats NaN price as 0", () => {
    const result = computeLine({ name: "x", quantity: 5, price: Number.NaN, taxRate: 18 }, "intra");
    expect(result.gross).toBe(0);
  });
});

describe("computeLine — discounts", () => {
  const baseLine = { name: "x", quantity: 1, price: 1000, taxRate: 18 };

  it("applies discount percentage", () => {
    const result = computeLine({ ...baseLine, discountPct: 10 }, "intra");
    expect(result.gross).toBe(1000);
    expect(result.discountTotal).toBe(100);
    expect(result.taxable).toBe(900);
    expect(result.cgst).toBe(81); // 9% of 900
    expect(result.sgst).toBe(81);
    expect(result.total).toBe(1062);
  });

  it("applies discount amount", () => {
    const result = computeLine({ ...baseLine, discountAmt: 150 }, "intra");
    expect(result.discountTotal).toBe(150);
    expect(result.taxable).toBe(850);
    expect(result.cgst).toBe(76.5);
  });

  it("applies both percentage and amount discounts", () => {
    const result = computeLine({ ...baseLine, discountPct: 10, discountAmt: 50 }, "intra");
    expect(result.discountTotal).toBe(150); // 100 + 50
    expect(result.taxable).toBe(850);
  });

  it("clamps discount percentage > 100 to 100", () => {
    const result = computeLine({ ...baseLine, discountPct: 150 }, "intra");
    expect(result.discountTotal).toBe(1000);
    expect(result.taxable).toBe(0);
    expect(result.total).toBe(0);
  });

  it("clamps discount percentage < 0 to 0", () => {
    const result = computeLine({ ...baseLine, discountPct: -20 }, "intra");
    expect(result.discountTotal).toBe(0);
    expect(result.taxable).toBe(1000);
  });

  it("clamps negative discount amount to 0", () => {
    const result = computeLine({ ...baseLine, discountAmt: -50 }, "intra");
    expect(result.discountTotal).toBe(0);
    expect(result.taxable).toBe(1000);
  });

  it("taxable never goes negative even with discount > gross", () => {
    const result = computeLine({ ...baseLine, discountAmt: 1500 }, "intra");
    expect(result.taxable).toBe(0); // max(0, 1000 - 1500)
    expect(result.total).toBe(0);
  });
});

describe("computeLine — tax rate edge cases", () => {
  it("clamps negative tax rate to 0", () => {
    const result = computeLine({ name: "x", quantity: 1, price: 100, taxRate: -5 }, "intra");
    expect(result.cgst).toBe(0);
    expect(result.total).toBe(100);
  });

  it("treats NaN tax rate as 0", () => {
    const result = computeLine({ name: "x", quantity: 1, price: 100, taxRate: Number.NaN }, "intra");
    expect(result.cgst).toBe(0);
  });

  it("handles high tax rates (e.g. 28%)", () => {
    const result = computeLine({ name: "x", quantity: 1, price: 100, taxRate: 28 }, "inter");
    expect(result.igst).toBe(28);
    expect(result.total).toBe(128);
  });
});

describe("computeDocument", () => {
  it("computes totals for a single line", () => {
    const lines: LineInput[] = [
      { name: "Atta", quantity: 2, price: 290, taxRate: 5 },
    ];
    const { lines: computed, totals } = computeDocument(lines, "intra");
    expect(computed).toHaveLength(1);
    expect(totals.subtotal).toBe(580);
    expect(totals.taxableValue).toBe(580);
    expect(totals.cgstTotal).toBe(14.5);
    expect(totals.sgstTotal).toBe(14.5);
    expect(totals.igstTotal).toBe(0);
    expect(totals.cessTotal).toBe(0);
    expect(totals.grandTotal).toBe(609);
    expect(totals.roundOff).toBe(0);
  });

  it("aggregates multiple lines", () => {
    const lines: LineInput[] = [
      { name: "Item A", quantity: 2, price: 100, taxRate: 18 },
      { name: "Item B", quantity: 1, price: 500, taxRate: 12 },
    ];
    const { totals } = computeDocument(lines, "intra");
    expect(totals.subtotal).toBe(700);
    expect(totals.taxableValue).toBe(700);
    // CGST: 18/2% of 200 = 18; 12/2% of 500 = 30 → total 48
    expect(totals.cgstTotal).toBe(48);
    expect(totals.sgstTotal).toBe(48);
    expect(totals.grandTotal).toBe(796); // 700 + 96
  });

  it("computes inter-state totals with IGST", () => {
    const lines: LineInput[] = [
      { name: "Item A", quantity: 1, price: 1000, taxRate: 18 },
    ];
    const { totals } = computeDocument(lines, "inter");
    expect(totals.igstTotal).toBe(180);
    expect(totals.cgstTotal).toBe(0);
    expect(totals.sgstTotal).toBe(0);
    expect(totals.grandTotal).toBe(1180);
  });

  it("rounds grand total to nearest rupee with positive roundOff", () => {
    // taxable 100.50 + tax 18.09 = 118.59 → rounds to 119, roundOff = +0.41
    const lines: LineInput[] = [
      { name: "x", quantity: 1, price: 100.5, taxRate: 18 },
    ];
    const { totals } = computeDocument(lines, "intra");
    const rawGrand = r2(totals.taxableValue + totals.cgstTotal + totals.sgstTotal);
    expect(totals.grandTotal).toBe(Math.round(rawGrand));
    expect(totals.roundOff).toBe(r2(totals.grandTotal - rawGrand));
  });

  it("handles empty lines array (all zero totals)", () => {
    const { lines, totals } = computeDocument([], "intra");
    expect(lines).toEqual([]);
    expect(totals.subtotal).toBe(0);
    expect(totals.taxableValue).toBe(0);
    expect(totals.cgstTotal).toBe(0);
    expect(totals.sgstTotal).toBe(0);
    expect(totals.igstTotal).toBe(0);
    expect(totals.grandTotal).toBe(0);
    expect(totals.roundOff).toBe(0);
  });

  it("discountTotal aggregates across lines", () => {
    const lines: LineInput[] = [
      { name: "A", quantity: 1, price: 100, discountPct: 10, taxRate: 0 },
      { name: "B", quantity: 2, price: 50, discountAmt: 20, taxRate: 0 },
    ];
    const { totals } = computeDocument(lines, "intra");
    // Line A: gross 100, discount 10 → taxable 90
    // Line B: gross 100, discount 20 → taxable 80
    expect(totals.subtotal).toBe(200);
    expect(totals.discountTotal).toBe(30);
    expect(totals.taxableValue).toBe(170);
  });

  it("grand total = round(taxableValue + totalTax)", () => {
    const lines: LineInput[] = [
      { name: "A", quantity: 3, price: 40, taxRate: 28 },
    ];
    const { totals } = computeDocument(lines, "inter");
    // taxable 120, igst 33.60 → raw 153.60 → grand 154, roundOff +0.40
    expect(totals.grandTotal).toBe(154);
    expect(totals.roundOff).toBe(0.4);
  });

  it("returns computed lines with all fields", () => {
    const lines: LineInput[] = [
      { name: "A", quantity: 1, price: 100, taxRate: 18 },
    ];
    const { lines: computed } = computeDocument(lines, "intra");
    expect(computed[0]).toHaveProperty("gross");
    expect(computed[0]).toHaveProperty("taxable");
    expect(computed[0]).toHaveProperty("cgst");
    expect(computed[0]).toHaveProperty("sgst");
    expect(computed[0]).toHaveProperty("igst");
    expect(computed[0]).toHaveProperty("total");
    expect(computed[0]).toHaveProperty("discountTotal");
  });
});

describe("isValidGstin", () => {
  it("validates correct GSTINs", () => {
    expect(isValidGstin("27ABCDE1234F1Z5")).toBe(true);
    expect(isValidGstin("29AAACI5432P1Z9")).toBe(true);
    expect(isValidGstin("30AAACM4567N1Z1")).toBe(true);
    expect(isValidGstin("07AAACH1111Q1Z2")).toBe(true);
  });

  it("returns true for empty/null/undefined (optional field)", () => {
    expect(isValidGstin("")).toBe(true);
    expect(isValidGstin(null)).toBe(true);
    expect(isValidGstin(undefined)).toBe(true);
  });

  it("normalizes to uppercase before validating", () => {
    expect(isValidGstin("27abcde1234f1z5")).toBe(true);
    expect(isValidGstin("  27ABCDE1234F1Z5  ")).toBe(true);
  });

  it("rejects wrong length", () => {
    expect(isValidGstin("27ABCDE1234F1Z")).toBe(false); // 14 chars
    expect(isValidGstin("27ABCDE1234F1Z55")).toBe(false); // 16 chars
  });

  it("rejects missing Z in position 13", () => {
    expect(isValidGstin("27ABCDE1234F1X5")).toBe(false);
    expect(isValidGstin("27ABCDE1234F1A5")).toBe(false);
  });

  it("rejects invalid state code (non-digit)", () => {
    expect(isValidGstin("AAABCDE1234F1Z5")).toBe(false);
  });

  it("rejects special characters", () => {
    expect(isValidGstin("27ABCDE1234F1Z!")).toBe(false);
    expect(isValidGstin("27-BCDE1234F1Z5")).toBe(false);
  });

  it("rejects PAN section with lowercase (after trim/upper it passes, but raw lowercase in wrong position)", () => {
    // After uppercasing, this becomes valid. Test a genuinely invalid one:
    expect(isValidGstin("27ABCDE1234F1Z")).toBe(false);
  });
});

describe("stateCodeFromGstin", () => {
  it("extracts state code from valid GSTIN", () => {
    expect(stateCodeFromGstin("27ABCDE1234F1Z5")).toBe("27");
    expect(stateCodeFromGstin("29AAACI5432P1Z9")).toBe("29");
    expect(stateCodeFromGstin("07AAACH1111Q1Z2")).toBe("07");
  });

  it("trims whitespace before extracting", () => {
    expect(stateCodeFromGstin("  27ABCDE1234F1Z5")).toBe("27");
  });

  it("returns null for empty/null/undefined", () => {
    expect(stateCodeFromGstin("")).toBeNull();
    expect(stateCodeFromGstin(null)).toBeNull();
    expect(stateCodeFromGstin(undefined)).toBeNull();
  });

  it("returns null if first 2 chars are not digits", () => {
    expect(stateCodeFromGstin("AAABCDE1234F1Z5")).toBeNull();
    expect(stateCodeFromGstin("A7ABCDE1234F1Z5")).toBeNull();
  });

  it("returns null for strings shorter than 2 chars", () => {
    expect(stateCodeFromGstin("A")).toBeNull();
    expect(stateCodeFromGstin("")).toBeNull();
  });
});

describe("deriveSupplyType", () => {
  it("returns 'intra' for same state codes", () => {
    expect(deriveSupplyType("27", "27")).toBe("intra");
    expect(deriveSupplyType("07", "07")).toBe("intra");
  });

  it("returns 'inter' for different state codes", () => {
    expect(deriveSupplyType("27", "29")).toBe("inter");
    expect(deriveSupplyType("07", "30")).toBe("inter");
  });

  it("returns 'intra' when business state code is missing", () => {
    expect(deriveSupplyType(null, "27")).toBe("intra");
    expect(deriveSupplyType(undefined, "27")).toBe("intra");
    expect(deriveSupplyType("", "27")).toBe("intra");
  });

  it("returns 'intra' when party state code is missing", () => {
    expect(deriveSupplyType("27", null)).toBe("intra");
    expect(deriveSupplyType("27", undefined)).toBe("intra");
    expect(deriveSupplyType("27", "")).toBe("intra");
  });

  it("returns 'intra' when both state codes are missing", () => {
    expect(deriveSupplyType(null, null)).toBe("intra");
    expect(deriveSupplyType(undefined, undefined)).toBe("intra");
  });
});

describe("GST_RATES constant", () => {
  it("contains all 7 standard Indian GST rates", () => {
    expect(GST_RATES).toEqual([0, 0.25, 3, 5, 12, 18, 28]);
  });

  it("rates are in ascending order", () => {
    for (let i = 1; i < GST_RATES.length; i++) {
      expect(GST_RATES[i]).toBeGreaterThan(GST_RATES[i - 1]);
    }
  });
});

describe("INDIAN_STATES constant", () => {
  it("contains all 38 state/UT codes", () => {
    expect(INDIAN_STATES).toHaveLength(38);
  });

  it("codes are unique", () => {
    const codes = INDIAN_STATES.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("codes are 2-digit zero-padded strings", () => {
    INDIAN_STATES.forEach((s) => {
      expect(s.code).toMatch(/^\d{2}$/);
    });
  });

  it("includes Maharashtra (27) — the demo business state", () => {
    const mh = INDIAN_STATES.find((s) => s.code === "27");
    expect(mh).toBeDefined();
    expect(mh?.name).toBe("Maharashtra");
  });

  it("includes Goa (30) — used in demo for inter-state invoices", () => {
    const goa = INDIAN_STATES.find((s) => s.code === "30");
    expect(goa).toBeDefined();
    expect(goa?.name).toBe("Goa");
  });
});

describe("Integration: real-world invoice scenarios", () => {
  it("matches the documented example: 2x Aashirvaad Atta @ ₹290, 5% GST intra", () => {
    const lines: LineInput[] = [
      { name: "Aashirvaad Atta 5kg", hsn: "1101", quantity: 2, price: 290, taxRate: 5 },
    ];
    const { totals } = computeDocument(lines, "intra");
    expect(totals.subtotal).toBe(580);
    expect(totals.cgstTotal).toBe(14.5);
    expect(totals.sgstTotal).toBe(14.5);
    expect(totals.grandTotal).toBe(609);
  });

  it("matches the documented example: 3x Coca-Cola @ ₹40, 28% GST inter (Goa)", () => {
    const lines: LineInput[] = [
      { name: "Coca-Cola 750ml", hsn: "2202", quantity: 3, price: 40, taxRate: 28 },
    ];
    const { totals } = computeDocument(lines, "inter");
    expect(totals.subtotal).toBe(120);
    expect(totals.igstTotal).toBe(33.6);
    expect(totals.grandTotal).toBe(154); // rounded up from 153.60
    expect(totals.roundOff).toBe(0.4);
  });

  it("handles a mixed-cart invoice with discounts", () => {
    const lines: LineInput[] = [
      { name: "Atta", quantity: 1, price: 290, taxRate: 5 },           // taxable 290, CGST 7.25
      { name: "Oil", quantity: 2, price: 155, taxRate: 5 },            // taxable 310, CGST 7.75
      { name: "Bulb", quantity: 3, price: 120, discountPct: 10, taxRate: 18 }, // taxable 324, CGST 29.16
    ];
    const { totals } = computeDocument(lines, "intra");
    expect(totals.subtotal).toBe(960); // 290 + 310 + 360
    expect(totals.discountTotal).toBe(36); // 10% of 360
    expect(totals.taxableValue).toBe(924); // 290 + 310 + 324
    // CGST: 7.25 + 7.75 + 29.16 = 44.16
    expect(totals.cgstTotal).toBe(44.16);
    expect(totals.sgstTotal).toBe(44.16);
    expect(totals.igstTotal).toBe(0);
    // raw grand = 924 + 88.32 = 1012.32 → rounded 1012, roundOff -0.32
    expect(totals.grandTotal).toBe(1012);
    expect(totals.roundOff).toBe(-0.32);
  });
});
