"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { visibleNavItems } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { ChevronLeft, Sparkles, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/format";

export function Sidebar() {
  const { view, openView, sidebarCollapsed, toggleSidebar, business } = useAppStore();
  const modules = business?.modules;
  const items = visibleNavItems(modules);
  const collapsed = sidebarCollapsed;

  const groups = React.useMemo(() => {
    const g: Record<string, typeof items> = { main: [], transactions: [], insights: [], system: [] };
    for (const it of items) g[it.group].push(it);
    return g;
  }, [items]);

  const groupLabels: Record<string, string> = {
    main: "",
    transactions: "Transactions",
    insights: "Insights",
    system: "System",
  };

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col h-screen sticky top-0 glass-sidebar border-r border-border/60 z-30 transition-[width] duration-200 ease-out gpu",
        collapsed ? "w-[76px]" : "w-[248px]"
      )}
      data-testid="sidebar"
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 h-16 px-4 border-b border-border/40 shrink-0">
        <div className="relative grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-glow-emerald shrink-0">
          <span className="font-bold text-base leading-none">M</span>
        </div>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="flex flex-col leading-tight whitespace-nowrap">
                <span className="font-semibold text-[15px] tracking-tight">MedBill</span>
                <span className="text-[10.5px] text-muted-foreground font-medium">GST Billing ERP</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className={cn("ml-auto h-8 w-8 text-muted-foreground hover:text-foreground transition-transform", collapsed && "rotate-180")}
          aria-label="Toggle sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto no-scrollbar px-2.5 py-3 space-y-5">
        {Object.entries(groups).map(([groupKey, groupItems]) => {
          if (groupItems.length === 0) return null;
          return (
            <div key={groupKey} className="space-y-1">
              {!collapsed && groupLabels[groupKey] && (
                <p className="px-2.5 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {groupLabels[groupKey]}
                </p>
              )}
              {groupItems.map((item) => {
                const Icon = item.icon;
                const active = view === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => openView(item.key)}
                    data-testid={`nav-${item.key}`}
                    className={cn(
                      "group relative flex items-center gap-3 w-full rounded-xl px-2.5 h-9 text-[13.5px] font-medium transition-colors gpu",
                      active ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/60",
                      collapsed && "justify-center"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    {active && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute inset-0 rounded-xl bg-sidebar-accent"
                        transition={{ type: "spring", stiffness: 500, damping: 38 }}
                      />
                    )}
                    {active && (
                      <motion.div
                        layoutId="sidebar-active-bar"
                        className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-primary"
                      />
                    )}
                    <Icon className={cn("w-[18px] h-[18px] shrink-0 relative z-10", active && "text-primary")} strokeWidth={2} />
                    {!collapsed && (
                      <span className="relative z-10 truncate">{item.label}</span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Business card */}
      <div className="p-2.5 border-t border-border/40 shrink-0">
        <button
          onClick={() => openView("settings")}
          className={cn(
            "flex items-center gap-2.5 w-full rounded-xl p-2 hover:bg-sidebar-accent/60 transition-colors",
            collapsed && "justify-center"
          )}
        >
          <Avatar className="w-8 h-8 rounded-lg border border-border/60">
            <AvatarFallback className="rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-white text-xs font-semibold">
              {business ? initials(business.name) : <Building2 className="w-4 h-4" />}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex flex-col leading-tight min-w-0 flex-1 text-left">
              <span className="text-[12.5px] font-semibold truncate">{business?.name ?? "No business"}</span>
              <span className="text-[10.5px] text-muted-foreground truncate">{business?.gstin ?? "No GSTIN"}</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
