import { describe, it, expect } from "vitest";
import { INDUSTRY_PROFILES, INDUSTRY_LIST, getIndustryProfile, getIndustryModules, getIndustryKPIs } from "./industry-profiles";

describe("INDUSTRY_PROFILES", () => {
  it("contains at least 14 industries", () => { expect(Object.keys(INDUSTRY_PROFILES).length).toBeGreaterThanOrEqual(14); });
  it("includes all required industries", () => {
    for (const id of ["retail","wholesale","manufacturer","medical","restaurant","salon","service","electronics","garments","automobile","jewellery","hardware","clinic","fmcg"]) {
      expect(INDUSTRY_PROFILES[id]).toBeDefined();
    }
  });
  it("every profile has required fields", () => {
    for (const p of INDUSTRY_LIST) {
      expect(p.id).toBeTruthy(); expect(p.label).toBeTruthy(); expect(p.icon).toBeDefined();
      expect(p.modules).toBeDefined(); expect(p.dashboardKPIs.length).toBeGreaterThan(0);
      expect(p.quickActions.length).toBeGreaterThan(0); expect(p.reports.length).toBeGreaterThan(0);
    }
  });
  it("every ID is unique", () => { const ids = INDUSTRY_LIST.map(p => p.id); expect(new Set(ids).size).toBe(ids.length); });
});

describe("getIndustryProfile", () => {
  it("returns correct profile", () => { expect(getIndustryProfile("medical").id).toBe("medical"); });
  it("falls back to retail", () => { expect(getIndustryProfile("unknown").id).toBe("retail"); expect(getIndustryProfile(null).id).toBe("retail"); });
});

describe("getIndustryModules", () => {
  it("medical has expiry+batch", () => { const m = getIndustryModules("medical"); expect(m.expiry).toBe(true); expect(m.batch).toBe(true); });
  it("service has no inventory", () => { const m = getIndustryModules("service"); expect(m.inventory).toBeFalsy(); expect(m.gst).toBe(true); });
  it("fills defaults for unset modules", () => { const m = getIndustryModules("retail"); expect(m.payroll).toBe(false); expect(m.manufacturing).toBe(false); });
});

describe("getIndustryKPIs", () => {
  it("retail has sales+inventory_value", () => { const k = getIndustryKPIs("retail"); expect(k).toContain("sales"); expect(k).toContain("inventory_value"); });
  it("service has no inventory_value", () => { const k = getIndustryKPIs("service"); expect(k).not.toContain("inventory_value"); });
  it("every industry has >=4 KPIs", () => { for (const p of INDUSTRY_LIST) expect(p.dashboardKPIs.length).toBeGreaterThanOrEqual(4); });
});

describe("Industry-specific behavior", () => {
  it("medical has expiry+batch", () => { expect(getIndustryProfile("medical").modules.expiry).toBe(true); });
  it("electronics has serial", () => { expect(getIndustryProfile("electronics").modules.serial).toBe(true); });
  it("manufacturer has manufacturing", () => { expect(getIndustryProfile("manufacturer").modules.manufacturing).toBe(true); });
  it("service is no_inventory", () => { expect(getIndustryProfile("service").inventoryMode).toBe("no_inventory"); });
  it("restaurant uses compact template", () => { expect(getIndustryProfile("restaurant").invoiceTemplate).toBe("compact"); });
});
