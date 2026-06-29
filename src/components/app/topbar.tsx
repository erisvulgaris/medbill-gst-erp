"use client";

import * as React from "react";
import { useAppStore } from "@/lib/store";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Search, Bell, Plus, Moon, Sun, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { relativeTime } from "@/lib/format";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { visibleNavItems } from "@/lib/nav";

const kindColor: Record<string, string> = {
  stock: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
  payment: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  warning: "bg-red-500/12 text-red-700 dark:text-red-300",
  gst: "bg-purple-500/12 text-purple-700 dark:text-purple-300",
  info: "bg-blue-500/12 text-blue-700 dark:text-blue-300",
  success: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
};

export function Topbar() {
  const { view, setCommandOpen, business, openView } = useAppStore();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [notifs, setNotifs] = React.useState<any[]>([]);
  const [unread, setUnread] = React.useState(0);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const loadNotifs = React.useCallback(async () => {
    try {
      const data = await api<{ items: any[] }>("/api/notifications");
      setNotifs(data.items);
      setUnread(data.items.filter((n: any) => !n.read).length);
    } catch {}
  }, []);

  React.useEffect(() => {
    loadNotifs();
    const t = setInterval(loadNotifs, 60000);
    return () => clearInterval(t);
  }, [loadNotifs]);

  const currentLabel = NAV_ITEMS.find((i) => i.key === view)?.label ?? "Dashboard";

  const markAllRead = async () => {
    await api("/api/notifications", { method: "PATCH", body: JSON.stringify({ markAllRead: true }) });
    loadNotifs();
  };

  return (
    <header className="sticky top-0 z-20 h-16 glass border-b border-border/50 flex items-center gap-2 px-3 sm:px-5" data-testid="topbar">
      {/* Mobile menu */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9" aria-label="Menu">
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[260px] p-0 glass-sidebar">
          <SheetHeader className="px-4 h-16 border-b border-border/40 flex flex-row items-center gap-2.5 space-y-0">
            <div className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white">
              <span className="font-bold">M</span>
            </div>
            <SheetTitle className="text-[15px] font-semibold">MedBill</SheetTitle>
          </SheetHeader>
          <MobileNavList onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-col leading-tight min-w-0">
        <h1 className="text-[15px] sm:text-base font-semibold tracking-tight truncate">{currentLabel}</h1>
        <p className="hidden sm:block text-[11px] text-muted-foreground truncate">
          {business?.name} · {business?.city ?? "India"}
        </p>
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        {/* Search */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCommandOpen(true)}
          className="h-9 gap-2 px-3 bg-background/60 hidden sm:flex text-muted-foreground hover:text-foreground"
          data-testid="command-trigger"
        >
          <Search className="w-4 h-4" />
          <span className="text-[12.5px]">Search…</span>
          <kbd className="ml-2 hidden md:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono">⌘K</kbd>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden h-9 w-9"
          onClick={() => setCommandOpen(true)}
          aria-label="Search"
        >
          <Search className="w-[18px] h-[18px]" />
        </Button>

        {/* New invoice shortcut */}
        <Button
          size="sm"
          className="h-9 gap-1.5 shadow-soft bg-primary hover:bg-primary/90"
          onClick={() => openView("sales", { action: "new" })}
          data-testid="new-invoice-btn"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline text-[12.5px] font-medium">New Invoice</span>
        </Button>

        {/* Notifications */}
        <Sheet open={notifOpen} onOpenChange={setNotifOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 relative" aria-label="Notifications" data-testid="notif-btn">
              <Bell className="w-[18px] h-[18px]" />
              {unread > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold grid place-items-center">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:w-[400px] p-0">
            <SheetHeader className="px-4 h-16 border-b border-border/40 flex flex-row items-center justify-between space-y-0">
              <SheetTitle className="text-[15px] font-semibold">Notifications</SheetTitle>
              <Button variant="ghost" size="sm" className="h-7 text-[11.5px] text-muted-foreground" onClick={markAllRead}>
                Mark all read
              </Button>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-4rem)]">
              <div className="p-2 space-y-1">
                <AnimatePresence>
                  {notifs.length === 0 ? (
                    <div className="p-10 text-center text-sm text-muted-foreground">No notifications</div>
                  ) : (
                    notifs.map((n) => (
                      <motion.div
                        key={n.id}
                        layout
                        className={cn(
                          "flex gap-3 rounded-xl p-3 hover:bg-muted/50 transition-colors cursor-pointer",
                          !n.read && "bg-primary/5"
                        )}
                      >
                        <div className={cn("grid place-items-center w-8 h-8 rounded-lg shrink-0 text-[13px]", kindColor[n.kind] || kindColor.info)}>
                          <Bell className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold leading-tight">{n.title}</p>
                          <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">{n.body}</p>
                          <p className="text-[10.5px] text-muted-foreground/70 mt-1">{relativeTime(n.createdAt)}</p>
                        </div>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>

        {/* Theme toggle */}
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          </Button>
        )}
      </div>
    </header>
  );
}

function MobileNavList({ onNavigate }: { onNavigate: () => void }) {
  const { view, openView, business } = useAppStore();
  const items = visibleNavItems(business?.modules);
  const groups: Record<string, typeof items> = { main: [], transactions: [], insights: [], system: [] };
  for (const it of items) groups[it.group].push(it);
  const groupLabels: Record<string, string> = { main: "", transactions: "Transactions", insights: "Insights", system: "System" };

  return (
    <ScrollArea className="h-[calc(100vh-4rem)]">
      <nav className="p-3 space-y-5">
        {Object.entries(groups).map(([gk, gitems]) => {
          if (!gitems.length) return null;
          return (
            <div key={gk} className="space-y-1">
              {groupLabels[gk] && (
                <p className="px-2.5 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/70">{groupLabels[gk]}</p>
              )}
              {gitems.map((item) => {
                const Icon = item.icon;
                const active = view === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => { openView(item.key); onNavigate(); }}
                    className={cn(
                      "flex items-center gap-3 w-full rounded-xl px-2.5 h-10 text-[14px] font-medium transition-colors",
                      active ? "bg-sidebar-accent text-primary" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
                    )}
                  >
                    <Icon className="w-[18px] h-[18px]" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>
    </ScrollArea>
  );
}
