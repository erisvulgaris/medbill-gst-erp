"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useAppStore } from "@/lib/store";
import { useBootstrapBusiness } from "@/lib/api";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { MobileBottomNav } from "@/components/app/mobile-bottom-nav";
import { CommandPalette } from "@/components/app/command-palette";
import { Onboarding } from "@/components/app/onboarding";
import { ErrorBoundary } from "@/components/app/error-boundary";
import { SubscriptionBanner } from "@/components/app/subscription-banner";
import { motion, AnimatePresence } from "framer-motion";

// Lazy-load views for code splitting & near-instant first paint
const DashboardView = dynamic(() => import("@/components/views/dashboard-view").then(m => m.DashboardView), { ssr: false });
const SalesView = dynamic(() => import("@/components/views/sales-view").then(m => m.SalesView), { ssr: false, loading: () => <ViewSkeleton /> });
const PosView = dynamic(() => import("@/components/views/pos-view").then(m => m.PosView), { ssr: false, loading: () => <ViewSkeleton /> });
const PurchasesView = dynamic(() => import("@/components/views/purchases-view").then(m => m.PurchasesView), { ssr: false, loading: () => <ViewSkeleton /> });
const InventoryView = dynamic(() => import("@/components/views/inventory-view").then(m => m.InventoryView), { ssr: false, loading: () => <ViewSkeleton /> });
const PartiesView = dynamic(() => import("@/components/views/parties-view").then(m => m.PartiesView), { ssr: false, loading: () => <ViewSkeleton /> });
const QuotationsView = dynamic(() => import("@/components/views/quotations-view").then(m => m.QuotationsView), { ssr: false, loading: () => <ViewSkeleton /> });
const ExpensesView = dynamic(() => import("@/components/views/expenses-view").then(m => m.ExpensesView), { ssr: false, loading: () => <ViewSkeleton /> });
const ReportsView = dynamic(() => import("@/components/views/reports-view").then(m => m.ReportsView), { ssr: false, loading: () => <ViewSkeleton /> });
const GstView = dynamic(() => import("@/components/views/gst-view").then(m => m.GstView), { ssr: false, loading: () => <ViewSkeleton /> });
const AuditView = dynamic(() => import("@/components/views/audit-view").then(m => m.AuditView), { ssr: false, loading: () => <ViewSkeleton /> });
const SettingsView = dynamic(() => import("@/components/views/settings-view").then(m => m.SettingsView), { ssr: false, loading: () => <ViewSkeleton /> });

const VIEWS: Record<string, React.ComponentType> = {
  dashboard: DashboardView,
  sales: SalesView,
  pos: PosView,
  purchases: PurchasesView,
  inventory: InventoryView,
  parties: PartiesView,
  quotations: QuotationsView,
  expenses: ExpensesView,
  reports: ReportsView,
  gst: GstView,
  audit: AuditView,
  settings: SettingsView,
};

export default function Home() {
  const { loading } = useBootstrapBusiness();
  const { onboarded, view } = useAppStore();

  // Keyboard shortcuts: ⌘K (command palette), ⌘N (new invoice), ⌘P (POS), ⌘B (toggle sidebar)
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        useAppStore.getState().setCommandOpen(true);
      }
      if (mod && e.key.toLowerCase() === "n") {
        e.preventDefault();
        useAppStore.getState().openView("sales", { action: "new" });
      }
      if (mod && e.key.toLowerCase() === "p") {
        e.preventDefault();
        useAppStore.getState().openView("pos");
      }
      if (mod && e.key.toLowerCase() === "b") {
        e.preventDefault();
        useAppStore.getState().toggleSidebar();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <div className="relative grid place-items-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-glow-emerald">
          <span className="font-bold text-2xl">M</span>
          <motion.div
            className="absolute inset-0 rounded-2xl border-2 border-primary/30 border-t-primary"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
          />
        </div>
        <div className="text-center">
          <p className="text-[14px] font-semibold tracking-tight">MedBill</p>
          <p className="text-[12px] text-muted-foreground">Loading your workspace…</p>
        </div>
      </div>
    );
  }

  if (!onboarded) {
    return <Onboarding />;
  }

  const ViewComponent = VIEWS[view] ?? DashboardView;

  return (
    <div className="min-h-screen flex bg-background" data-testid="app-shell">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <SubscriptionBanner />
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-8" data-testid="main-content">
          <ErrorBoundary key={view}>
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="min-h-full"
              >
                <ViewComponent />
              </motion.div>
            </AnimatePresence>
          </ErrorBoundary>
        </main>
      </div>
      <MobileBottomNav />
      <CommandPalette />
    </div>
  );
}

function ViewSkeleton() {
  return (
    <div className="p-5 sm:p-7 space-y-4">
      <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-muted/60 animate-pulse" />
        ))}
      </div>
      <div className="h-72 rounded-xl bg-muted/40 animate-pulse" />
    </div>
  );
}
