"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ViewKey =
  | "dashboard"
  | "sales"
  | "pos"
  | "purchases"
  | "quotations"
  | "inventory"
  | "parties"
  | "expenses"
  | "payments"
  | "reports"
  | "gst"
  | "audit"
  | "settings";

export interface ModulesConfig {
  pos: boolean;
  inventory: boolean;
  gst: boolean;
  payroll: boolean;
  crm: boolean;
  manufacturing: boolean;
  expiry: boolean;
  batch: boolean;
  serial: boolean;
  barcode: boolean;
  onlineStore: boolean;
}

export interface BusinessContext {
  id: string;
  name: string;
  legalName?: string | null;
  gstin?: string | null;
  pan?: string | null;
  industry: string;
  businessType: string;
  state?: string | null;
  stateCode?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  addressLine1?: string | null;
  pincode?: string | null;
  logoUrl?: string | null;
  currency: string;
  invoicePrefix: string;
  quotationPrefix: string;
  modules: ModulesConfig;
  inventoryMode: string;
  storeMode: string;
  onboarded: boolean;
}

const DEFAULT_MODULES: ModulesConfig = {
  pos: true,
  inventory: true,
  gst: true,
  payroll: false,
  crm: false,
  manufacturing: false,
  expiry: false,
  batch: false,
  serial: false,
  barcode: true,
  onlineStore: false,
};

interface AppState {
  // Business context — the active business
  business: BusinessContext | null;
  setBusiness: (b: BusinessContext) => void;
  clearBusiness: () => void;

  // Navigation — single-route SPA view switching
  view: ViewKey;
  setView: (v: ViewKey) => void;

  // Nav params for sub-navigation within a view (e.g. open a specific invoice)
  viewParams: Record<string, unknown>;
  openView: (v: ViewKey, params?: Record<string, unknown>) => void;

  // Sidebar collapse (desktop)
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;

  // Command palette
  commandOpen: boolean;
  setCommandOpen: (v: boolean) => void;

  // Onboarding gate
  onboarded: boolean;
  setOnboarded: (v: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      business: null,
      setBusiness: (b) => set({ business: b }),
      clearBusiness: () => set({ business: null }),

      view: "dashboard",
      setView: (view) => set({ view }),

      viewParams: {},
      openView: (view, params = {}) =>
        set({ view, viewParams: params }),

      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

      commandOpen: false,
      setCommandOpen: (commandOpen) => set({ commandOpen }),

      onboarded: false,
      setOnboarded: (onboarded) => set({ onboarded }),
    }),
    {
      name: "medbill-app",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        business: s.business,
        view: s.view,
        sidebarCollapsed: s.sidebarCollapsed,
        onboarded: s.onboarded,
      }),
    }
  )
);

export { DEFAULT_MODULES };
