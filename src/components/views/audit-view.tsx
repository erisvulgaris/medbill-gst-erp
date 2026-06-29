"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDateTime, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import {
  History, Search, Plus, Pencil, Trash2, Wallet, Download, Printer,
  FileText, Package, Users, ShoppingCart, Receipt, Settings as SettingsIcon,
  LogIn, type LucideIcon, Filter, Download as DownloadIcon,
} from "lucide-react";

interface AuditEntry {
  id: string; action: string; entity: string; entityId?: string | null;
  summary?: string | null; metadata?: string | null; ip?: string | null;
  createdAt: string; userName: string;
}

const ENTITY_ICON: Record<string, LucideIcon> = {
  invoice: Receipt,
  party: Users,
  product: Package,
  purchase: ShoppingCart,
  payment: Wallet,
  expense: FileText,
  business: SettingsIcon,
  quotation: FileText,
};
const ACTION_STYLE: Record<string, { cls: string; icon: LucideIcon }> = {
  create: { cls: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300", icon: Plus },
  update: { cls: "bg-blue-500/12 text-blue-700 dark:text-blue-300", icon: Pencil },
  delete: { cls: "bg-red-500/12 text-red-700 dark:text-red-300", icon: Trash2 },
  cancel: { cls: "bg-red-500/12 text-red-700 dark:text-red-300", icon: Trash2 },
  payment: { cls: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300", icon: Wallet },
  export: { cls: "bg-purple-500/12 text-purple-700 dark:text-purple-300", icon: Download },
  print: { cls: "bg-amber-500/12 text-amber-700 dark:text-amber-300", icon: Printer },
  login: { cls: "bg-muted text-muted-foreground", icon: LogIn },
};

const ENTITIES = ["invoice", "party", "product", "purchase", "payment", "expense", "business"];
const ACTIONS = ["create", "update", "delete", "cancel", "payment", "export", "print", "login"];

export function AuditView() {
  const [search, setSearch] = React.useState("");
  const [entity, setEntity] = React.useState("all");
  const [action, setAction] = React.useState("all");

  const { data, isLoading } = useQuery<{ items: AuditEntry[] }>({
    queryKey: ["audit", entity, action],
    queryFn: () => {
      const params = new URLSearchParams();
      if (entity !== "all") params.set("entity", entity);
      if (action !== "all") params.set("action", action);
      params.set("limit", "200");
      return api(`/api/audit?${params}`);
    },
  });

  const items = (data?.items ?? []).filter((i) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (i.summary?.toLowerCase().includes(q) || i.entity.toLowerCase().includes(q) || i.userName.toLowerCase().includes(q) || i.action.toLowerCase().includes(q));
  });

  // Group by day
  const grouped = React.useMemo(() => {
    const map = new Map<string, AuditEntry[]>();
    for (const it of items) {
      const day = new Date(it.createdAt).toDateString();
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(it);
    }
    return [...map.entries()];
  }, [items]);

  const exportCsv = () => {
    if (items.length === 0) return;
    const rows = [["Date", "User", "Action", "Entity", "Summary"]];
    for (const i of items) rows.push([formatDateTime(i.createdAt), i.userName, i.action, i.entity, i.summary ?? ""]);
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1200px] mx-auto space-y-5" data-testid="audit-view">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-[22px] font-bold tracking-tight flex items-center gap-2"><History className="w-5 h-5 text-primary" /> Audit Log</h1>
          <p className="text-[12.5px] text-muted-foreground mt-0.5">Complete activity history — every create, update, payment & delete</p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={items.length === 0} className="gap-1.5 h-9" data-testid="audit-export">
          <DownloadIcon className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Events" value={String(items.length)} accent="primary" />
        <StatCard label="Creates" value={String(items.filter((i) => i.action === "create").length)} accent="emerald" />
        <StatCard label="Payments" value={String(items.filter((i) => i.action === "payment").length)} accent="amber" />
        <StatCard label="Deletions" value={String(items.filter((i) => i.action === "delete" || i.action === "cancel").length)} accent="red" />
      </div>

      {/* Filters */}
      <Card className="p-3 flex flex-wrap items-center gap-2 shadow-card border-border/50">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search summary, user, entity…" className="pl-9 h-9 bg-background" data-testid="audit-search" />
        </div>
        <Select value={entity} onValueChange={setEntity}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Entity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            {ENTITIES.map((e) => <SelectItem key={e} value={e} className="capitalize">{e}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Action" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {ACTIONS.map((a) => <SelectItem key={a} value={a} className="capitalize">{a}</SelectItem>)}
          </SelectContent>
        </Select>
        {items.length > 0 && <span className="text-[11.5px] text-muted-foreground ml-auto">{items.length} event{items.length !== 1 ? "s" : ""}</span>}
      </Card>

      {/* Timeline */}
      {isLoading ? (
        <Card className="p-4 shadow-card border-border/50 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </Card>
      ) : items.length === 0 ? (
        <Card className="p-12 shadow-card border-border/50 text-center">
          <div className="grid place-items-center w-14 h-14 rounded-2xl bg-muted mx-auto mb-4"><History className="w-6 h-6 text-muted-foreground" /></div>
          <p className="text-[14px] font-semibold">No audit events found</p>
          <p className="text-[12.5px] text-muted-foreground mt-1">{search || entity !== "all" || action !== "all" ? "Try adjusting filters" : "Activity will appear here as you use the app"}</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(([day, dayItems]) => (
            <div key={day}>
              <div className="sticky top-[3.6rem] z-10 mb-2">
                <span className="inline-block bg-muted/80 backdrop-blur px-2.5 py-1 rounded-md text-[11px] font-semibold text-muted-foreground">
                  {new Date(day).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              <Card className="shadow-card border-border/50 overflow-hidden">
                {dayItems.map((entry, i) => {
                  const Icon = ENTITY_ICON[entry.entity] || FileText;
                  const actStyle = ACTION_STYLE[entry.action] || { cls: "bg-muted text-muted-foreground", icon: History };
                  const ActIcon = actStyle.icon;
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.015, 0.2) }}
                      className={cn("flex items-start gap-3 p-3.5 hover:bg-muted/30 transition-colors group", i > 0 && "border-t border-border/30")}
                    >
                      {/* Icon cluster */}
                      <div className="relative shrink-0">
                        <div className="grid place-items-center w-9 h-9 rounded-lg bg-primary/10 text-primary">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className={cn("absolute -bottom-1 -right-1 grid place-items-center w-5 h-5 rounded-full border-2 border-card", actStyle.cls)}>
                          <ActIcon className="w-2.5 h-2.5" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] font-semibold">{entry.summary || `${entry.action} ${entry.entity}`}</span>
                          <Badge variant="outline" className={cn("text-[9.5px] font-semibold capitalize", actStyle.cls)}>{entry.action}</Badge>
                          <Badge variant="secondary" className="text-[9.5px] capitalize">{entry.entity}</Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                          <span className="font-medium text-foreground/70">{entry.userName}</span>
                          <span>·</span>
                          <span title={formatDateTime(entry.createdAt)}>{relativeTime(entry.createdAt)}</span>
                          {entry.ip && <><span>·</span><span className="font-mono">{entry.ip}</span></>}
                        </div>
                        {entry.metadata && (
                          <details className="mt-1.5">
                            <summary className="text-[10.5px] text-muted-foreground/70 cursor-pointer hover:text-muted-foreground select-none">Details</summary>
                            <pre className="mt-1 text-[10px] text-muted-foreground bg-muted/40 rounded p-2 overflow-x-auto font-mono">{entry.metadata}</pre>
                          </details>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: "primary" | "emerald" | "amber" | "red" }) {
  const map = { primary: "bg-primary/10 text-primary", emerald: "bg-emerald-500/12 text-emerald-600", amber: "bg-amber-500/12 text-amber-600", red: "bg-red-500/12 text-red-600" }[accent];
  return (
    <Card className="p-4 shadow-card border-border/50">
      <div className={cn("grid place-items-center w-8 h-8 rounded-lg mb-2", map)}><History className="w-4 h-4" /></div>
      <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
      <p className="text-[18px] font-bold tnum tracking-tight mt-0.5">{value}</p>
    </Card>
  );
}
