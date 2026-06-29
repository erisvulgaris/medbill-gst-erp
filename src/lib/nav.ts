import {
  LayoutDashboard, ReceiptText, ShoppingCart, Package, Users, FileText,
  Wallet, BarChart3, Landmark, Settings, ScanLine, History, type LucideIcon,
} from "lucide-react";
import type { ViewKey, ModulesConfig } from "@/lib/store";

export interface NavItem {
  key: ViewKey;
  label: string;
  icon: LucideIcon;
  group: "main" | "transactions" | "insights" | "system";
  desc: string;
  requiredModule?: keyof ModulesConfig;
  mobile?: boolean; // show in mobile bottom nav
}

export const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "main", desc: "Business overview & KPIs", mobile: true },
  { key: "sales", label: "Sales & Invoices", icon: ReceiptText, group: "transactions", desc: "Create GST invoices & track payments", mobile: true },
  { key: "pos", label: "POS Billing", icon: ScanLine, group: "transactions", desc: "Quick counter billing", requiredModule: "pos", mobile: true },
  { key: "purchases", label: "Purchase", icon: ShoppingCart, group: "transactions", desc: "Goods-in & supplier bills", mobile: false },
  { key: "inventory", label: "Inventory", icon: Package, group: "transactions", desc: "Products, stock & godown", requiredModule: "inventory", mobile: true },
  { key: "parties", label: "Parties", icon: Users, group: "transactions", desc: "Customers & suppliers ledger", mobile: true },
  { key: "quotations", label: "Quotations", icon: FileText, group: "transactions", desc: "Estimates & proforma", mobile: false },
  { key: "expenses", label: "Expenses", icon: Wallet, group: "transactions", desc: "Track business spending", mobile: false },
  { key: "reports", label: "Reports", icon: BarChart3, group: "insights", desc: "P&L, registers, day book", mobile: true },
  { key: "gst", label: "GST Returns", icon: Landmark, group: "insights", desc: "GSTR-1 & HSN summary", requiredModule: "gst", mobile: false },
  { key: "audit", label: "Audit Log", icon: History, group: "system", desc: "Activity history & changes", mobile: false },
  { key: "settings", label: "Settings", icon: Settings, group: "system", desc: "Business profile & modules", mobile: false },
];

export function visibleNavItems(modules: ModulesConfig | undefined): NavItem[] {
  if (!modules) return NAV_ITEMS;
  return NAV_ITEMS.filter((item) => !item.requiredModule || modules[item.requiredModule]);
}
