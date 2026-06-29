"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { formatINR, formatDateShort, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, Search, Receipt, Filter, Download, ArrowLeft, TrendingUp,
  Wallet, Clock, CheckCircle2, X,
} from "lucide-react";
import { InvoiceEditor } from "@/components/app/invoice-editor";
import { InvoiceViewer } from "@/components/app/invoice-viewer";

interface InvoiceRow {
  id: string; number: string; status: string; partyName: string; partyPhone: string | null;
  partyGstin: string | null; invoiceDate: string; dueDate: string | null; supplyType: string;
  grandTotal: number; paidAmount: number; balance: number;
}

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "paid", label: "Paid" },
  { id: "unpaid", label: "Unpaid" },
  { id: "partial", label: "Partial" },
];

export function SalesView() {
  const { viewParams, openView } = useAppStore();
  const queryClient = useQueryClient();
  const action = viewParams.action as string | undefined;
  const editId = viewParams.id as string | undefined;

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");

  const { data, isLoading } = useQuery<{ items: InvoiceRow[] }>({
    queryKey: ["invoices", search, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      return api(`/api/invoices?${params}`);
    },
  });

  // Edit / view mode
  if (action === "new") {
    return (
      <InvoiceEditor
        onSaved={(id) => {
          queryClient.invalidateQueries({ queryKey: ["invoices"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard"] });
          openView("sales", { action: "view", id });
        }}
        onCancel={() => openView("sales")}
      />
    );
  }
  if (action === "view" && editId) {
    return (
      <InvoiceViewer
        invoiceId={editId}
        onBack={() => openView("sales")}
        onDeleted={() => {
          queryClient.invalidateQueries({ queryKey: ["invoices"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard"] });
          openView("sales");
        }}
      />
    );
  }

  const items = data?.items ?? [];
  const totalAmt = items.reduce((s, i) => s + i.grandTotal, 0);
  const paidAmt = items.reduce((s, i) => s + i.paidAmount, 0);
  const balanceAmt = items.reduce((s, i) => s + i.balance, 0);

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-5" data-testid="sales-view">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-[22px] font-bold tracking-tight">Sales & Invoices</h1>
          <p className="text-[12.5px] text-muted-foreground mt-0.5">Create GST invoices, track payments & outstanding</p>
        </div>
        <Button onClick={() => openView("sales", { action: "new" })} className="gap-1.5 h-9 bg-primary hover:bg-primary/90" data-testid="create-invoice">
          <Plus className="w-4 h-4" /> New Invoice
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Receipt} label="Total Invoiced" value={formatINR(totalAmt)} accent="primary" />
        <StatCard icon={CheckCircle2} label="Collected" value={formatINR(paidAmt)} accent="emerald" />
        <StatCard icon={Clock} label="Outstanding" value={formatINR(balanceAmt)} accent="amber" />
        <StatCard icon={TrendingUp} label="Invoice Count" value={String(items.length)} accent="purple" />
      </div>

      {/* Filters + search */}
      <Card className="p-3 flex flex-wrap items-center gap-2 shadow-card border-border/50">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by invoice number or customer…"
            className="pl-9 h-9 bg-background"
            data-testid="invoice-search"
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/60">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={cn(
                "px-3 h-7 rounded-md text-[12px] font-medium transition-colors",
                statusFilter === f.id ? "bg-background text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" className="h-9 gap-1.5">
          <Download className="w-4 h-4" /> <span className="hidden sm:inline">Export</span>
        </Button>
      </Card>

      {/* List */}
      <Card className="shadow-card border-border/50 overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center">
            <div className="grid place-items-center w-14 h-14 rounded-2xl bg-muted mx-auto mb-4">
              <Receipt className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-[14px] font-semibold">No invoices found</p>
            <p className="text-[12.5px] text-muted-foreground mt-1">Create your first GST invoice to get started</p>
            <Button onClick={() => openView("sales", { action: "new" })} className="mt-4 gap-1.5 bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4" /> New Invoice
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border/50 bg-muted/20">
                  <th className="text-left font-semibold px-4 py-2.5">Invoice</th>
                  <th className="text-left font-semibold px-2 py-2.5">Customer</th>
                  <th className="text-left font-semibold px-2 py-2.5 hidden md:table-cell">Date</th>
                  <th className="text-left font-semibold px-2 py-2.5 hidden lg:table-cell">Due</th>
                  <th className="text-right font-semibold px-2 py-2.5">Total</th>
                  <th className="text-right font-semibold px-2 py-2.5 hidden sm:table-cell">Balance</th>
                  <th className="text-center font-semibold px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => openView("sales", { action: "view", id: inv.id })}
                    className="border-b border-border/30 hover:bg-muted/30 cursor-pointer transition-colors group"
                    data-testid={`invoice-row-${inv.number}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="grid place-items-center w-8 h-8 rounded-lg bg-primary/10 text-primary shrink-0">
                          <Receipt className="w-4 h-4" />
                        </div>
                        <span className="font-mono font-semibold text-[12.5px] group-hover:text-primary transition-colors">{inv.number}</span>
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <div className="font-medium truncate max-w-[180px]">{inv.partyName}</div>
                      {inv.partyPhone && <div className="text-[11px] text-muted-foreground">{inv.partyPhone}</div>}
                    </td>
                    <td className="px-2 py-3 text-muted-foreground tnum hidden md:table-cell">{formatDateShort(inv.invoiceDate)}</td>
                    <td className="px-2 py-3 text-muted-foreground tnum hidden lg:table-cell">{inv.dueDate ? formatDateShort(inv.dueDate) : "—"}</td>
                    <td className="px-2 py-3 text-right font-semibold tnum">{formatINR(inv.grandTotal)}</td>
                    <td className="px-2 py-3 text-right tnum hidden sm:table-cell">
                      {inv.balance > 0 ? <span className="text-amber-600 font-medium">{formatINR(inv.balance)}</span> : <span className="text-emerald-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={inv.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent: "primary" | "emerald" | "amber" | "purple" }) {
  const map = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/12 text-emerald-600",
    amber: "bg-amber-500/12 text-amber-600",
    purple: "bg-purple-500/12 text-purple-600",
  }[accent];
  return (
    <Card className="p-4 shadow-card border-border/50">
      <div className={cn("grid place-items-center w-8 h-8 rounded-lg mb-2", map)}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
      <p className="text-[18px] font-bold tnum tracking-tight mt-0.5">{value}</p>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    unpaid: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
    partial: "bg-blue-500/12 text-blue-700 dark:text-blue-300",
    overdue: "bg-red-500/12 text-red-700 dark:text-red-300",
    draft: "bg-muted text-muted-foreground",
    cancelled: "bg-muted text-muted-foreground line-through",
  };
  return <span className={cn("inline-block text-[10.5px] font-semibold px-2 py-0.5 rounded-md capitalize", map[status] || map.draft)}>{status}</span>;
}
