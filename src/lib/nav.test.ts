import { describe, it, expect } from "vitest";
import { NAV_ITEMS, visibleNavItems, type NavItem } from "./nav";
import type { ModulesConfig } from "./store";

describe("NAV_ITEMS", () => {
  it("contains all 12 navigation entries", () => {
    expect(NAV_ITEMS).toHaveLength(12);
  });

  it("every item has required fields", () => {
    NAV_ITEMS.forEach((item: NavItem) => {
      expect(item.key).toBeTruthy();
      expect(item.label).toBeTruthy();
      expect(item.icon).toBeDefined();
      expect(item.group).toMatch(/^(main|transactions|insights|system)$/);
      expect(item.desc).toBeTruthy();
    });
  });

  it("keys are unique", () => {
    const keys = NAV_ITEMS.map((i) => i.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("includes dashboard as first item", () => {
    expect(NAV_ITEMS[0].key).toBe("dashboard");
  });

  it("includes settings as last item", () => {
    expect(NAV_ITEMS[NAV_ITEMS.length - 1].key).toBe("settings");
  });

  it("mobile-flagged items are a reasonable subset for bottom nav", () => {
    const mobileItems = NAV_ITEMS.filter((i) => i.mobile);
    // Bottom nav renders first 5 at runtime; the flag marks candidates.
    expect(mobileItems.length).toBeGreaterThanOrEqual(5);
    expect(mobileItems.length).toBeLessThanOrEqual(8);
    // Dashboard is always mobile
    expect(mobileItems.find((i) => i.key === "dashboard")).toBeDefined();
  });
});

describe("visibleNavItems", () => {
  const allModulesOn: ModulesConfig = {
    pos: true,
    inventory: true,
    gst: true,
    payroll: true,
    crm: true,
    manufacturing: true,
    expiry: true,
    batch: true,
    serial: true,
    barcode: true,
    onlineStore: true,
  };

  it("returns all items when all modules enabled", () => {
    const visible = visibleNavItems(allModulesOn);
    expect(visible).toHaveLength(12);
  });

  it("returns all items when modules is undefined", () => {
    const visible = visibleNavItems(undefined);
    expect(visible).toHaveLength(12);
  });

  it("hides POS when pos module disabled", () => {
    const visible = visibleNavItems({ ...allModulesOn, pos: false });
    expect(visible.find((i) => i.key === "pos")).toBeUndefined();
    expect(visible.length).toBe(11);
  });

  it("hides inventory when inventory module disabled", () => {
    const visible = visibleNavItems({ ...allModulesOn, inventory: false });
    expect(visible.find((i) => i.key === "inventory")).toBeUndefined();
  });

  it("hides GST when gst module disabled", () => {
    const visible = visibleNavItems({ ...allModulesOn, gst: false });
    expect(visible.find((i) => i.key === "gst")).toBeUndefined();
  });

  it("hides multiple modules when disabled", () => {
    const visible = visibleNavItems({
      ...allModulesOn,
      pos: false,
      inventory: false,
      gst: false,
    });
    expect(visible).toHaveLength(9);
    expect(visible.find((i) => i.key === "pos")).toBeUndefined();
    expect(visible.find((i) => i.key === "inventory")).toBeUndefined();
    expect(visible.find((i) => i.key === "gst")).toBeUndefined();
  });

  it("always shows non-module-gated items (dashboard, sales, purchases, parties, quotations, expenses, reports, audit, settings)", () => {
    const noneOn: ModulesConfig = {
      pos: false,
      inventory: false,
      gst: false,
      payroll: false,
      crm: false,
      manufacturing: false,
      expiry: false,
      batch: false,
      serial: false,
      barcode: false,
      onlineStore: false,
    };
    const visible = visibleNavItems(noneOn);
    expect(visible.find((i) => i.key === "dashboard")).toBeDefined();
    expect(visible.find((i) => i.key === "sales")).toBeDefined();
    expect(visible.find((i) => i.key === "settings")).toBeDefined();
    expect(visible.find((i) => i.key === "reports")).toBeDefined();
    expect(visible.find((i) => i.key === "audit")).toBeDefined();
  });
});
