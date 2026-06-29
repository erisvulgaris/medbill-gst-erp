"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { formatINR, formatDateShort, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Plus, Search, FileText, Send, Check, Clock, X, TrendingUp,
  ArrowRight, MessageCircle, ChevronRight, IndianRupee,
} from "lucide-react";
import { QuotationEditor } from "@/components/app/quotation-editor";
import { QuotationViewer } from "@/components/app/quotation-viewer";

interface Quotation {
  id: string; number: string; status: string; partyName: string; partyPhone: string | null;
  subject: string | null; quotationDate: string; validUntil: string | null;
  grandTotal: number; taxableValue: number;
}

const STATUS_META: Record<string, { icon: any; cls: string; label: string }> = {
  draft: { icon: FileText, cls: "bg-muted text-muted-foreground", label: "Draft" },
  sent: { icon: Send, cls: "bg-blue-500/12 text-blue-700 dark:text-blue-300", label: "Sent" },
  accepted: { icon: Check, cls: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300", label: "Accepted" },
  rejected: { icon: X, cls: "bg-red-500/12 text-red-700 dark:text-red-300", label: "Rejected" },
  converted: { icon: ArrowRight, cls: "bg-purple-500/12 text-purple-700 dark:text-purple-300", label: "Converted" },
  expired: { icon: Clock, cls: "bg-amber-500/12 text-amber-700 dark:text-amber-300", label: "Expired" },
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "draft", label: "Drafts" },
  { id: "sent", label: "Sent" },
  { id: "accepted", label: "Accepted" },
  { id: "converted", label: "Converted" },
];

export function QuotationsView() {
  const { viewParams, openView } = useAppStore();
  const queryClient = useQueryClient();
  const action = viewParams.action as string | undefined;
  const editId = viewParams.id as string | undefined;
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState("all");

  const { data, isLoading } = useQuery<{ items: Quotation[] }>({
    queryKey: ["quotations", search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      return api(`/api/quotations?${params}`);
    },
  });

  const items = (data?.items ?? []).filter((q) => filter === "all" || q.status === filter);

  if (action === "new") {
    return (
      <QuotationEditor
        onSaved={(id) => {
          queryClient.invalidateQueries({ queryKey: ["quotations"] });
          openView("quotations", { action: "view", id });
        }}
        onCancel={() => openView("quotations")}
      />
    );
  }
  if (action === "view" && editId) {
    return (
      <QuotationViewer
        quotationId={editId}
        onBack={() => openView("quotations")}
        onConverted={(invoiceId) => {
          queryClient.invalidateQueries({ queryKey: ["quotations"] });
          queryClient.invalidateQueries({ queryKey: ["invoices"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard"] });
          openView("sales", { action: "view", id: invoiceId });
        }}
      />
    );
  }

  const totalValue = items.reduce((s, q) => s + q.grandTotal, 0);
  const accepted = items.filter((q) => q.status === "accepted");
  const pending = items.filter((q) => q.status === "sent");
  const converted = items.filter((q) => q.status === "converted");

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-5" data-testid="quotations-view">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-[22px] font-bold tracking-tight">Quotations & Estimates</h1>
          <p className="text-[12.5px] text-muted-foreground mt-0.5">Send quotes, track acceptance & convert to invoices</p>
        </div>
        <Button onClick={() => openView("quotations", { action: "new" })} className="gap-1.5 h-9 bg-primary hover:bg-primary/90" data-testid="new-quotation">
          <Plus className="w-4 h-4" /> New Quotation
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={FileText} label="Total Quotations" value={String(items.length)} accent="primary" />
        <StatCard icon={TrendingUp} label="Quoted Value" value={formatINR(totalValue)} accent="emerald" />
        <StatCard icon={Check} label="Accepted" value={String(accepted.length)} accent="amber" />
        <StatCard icon={ArrowRight} label="Converted" value={String(converted.length)} accent="purple" />
      </div>

      <Card className="p-3 flex flex-wrap items-center gap-2 shadow-card border-border/50">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search quotations…" className="pl-9 h-9 bg-background" data-testid="quotation-search" />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/60">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} className={cn("px-3 h-7 rounded-md text-[12px] font-medium transition-colors", filter === f.id ? "bg-background text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground")}>{f.label}</button>
          ))}
        </div>
      </Card>

      <Card className="shadow-card border-border/50 overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center">
            <div className="grid place-items-center w-14 h-14 rounded-2xl bg-muted mx-auto mb-4"><FileText className="w-6 h-6 text-muted-foreground" /></div>
            <p className="text-[14px] font-semibold">No quotations yet</p>
            <p className="text-[12.5px] text-muted-foreground mt-1">Create your first quotation to send to a customer</p>
            <Button onClick={() => openView("quotations", { action: "new" })} className="mt-4 gap-1.5 bg-primary hover:bg-primary/90"><Plus className="w-4 h-4" /> New Quotation</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead><tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border/50 bg-muted/20">
                <th className="text-left font-semibold px-4 py-2.5">Quotation</th>
                <th className="text-left font-semibold px-2 py-2.5">Customer</th>
                <th className="text-left font-semibold px-2 py-2.5 hidden md:table-cell">Subject</th>
                <th className="text-left font-semibold px-2 py-2.5 hidden sm:table-cell">Date</th>
                <th className="text-left font-semibold px-2 py-2.5 hidden lg:table-cell">Valid Until</th>
                <th className="text-right font-semibold px-4 py-2.5">Value</th>
                <th className="text-center font-semibold px-4 py-2.5">Status</th>
              </tr></thead>
              <tbody>
                {items.map((q, i) => {
                  const m = STATUS_META[q.status] || STATUS_META.draft;
                  const Icon = m.icon;
                  const isExpired = q.validUntil && new Date(q.validUntil) < new Date() && q.status === "sent";
                  return (
                    <motion.tr
                      key={q.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}
                      onClick={() => openView("quotations", { action: "view", id: q.id })}
                      className="border-b border-border/30 hover:bg-muted/30 cursor-pointer group"
                      data-testid={`quotation-row-${q.number}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="grid place-items-center w-8 h-8 rounded-lg bg-amber-500/12 text-amber-600 shrink-0"><FileText className="w-4 h-4" /></div>
                          <span className="font-mono font-semibold text-[12.5px] group-hover:text-primary transition-colors">{q.number}</span>
                        </div>
                      </td>
                      <td className="px-2 py-3"><div className="font-medium truncate max-w-[140px]">{q.partyName}</div>{q.partyPhone && <div className="text-[11px] text-muted-foreground">{q.partyPhone}</div>}</td>
                      <td className="px-2 py-3 hidden md:table-cell text-muted-foreground truncate max-w-[160px]">{q.subject || "—"}</td>
                      <td className="px-2 py-3 hidden sm:table-cell text-muted-foreground tnum">{formatDateShort(q.quotationDate)}</td>
                      <td className="px-2 py-3 hidden lg:table-cell tnum">{q.validUntil ? <span className={cn(isExpired && "text-red-600 font-medium")}>{formatDateShort(q.validUntil)}</span> : "—"}</td>
                      <td className="px-4 py-3 text-right font-semibold tnum">{formatINR(q.grandTotal)}</td>
                      <td className="px-4 py-3 text-center"><span className={cn("inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-md", isExpired ? "bg-amber-500/12 text-amber-700" : m.cls)}><Icon className="w-3 h-3" /> {isExpired ? "Expired" : m.label}</span></td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent: "primary" | "emerald" | "amber" | "purple" }) {
  const map = { primary: "bg-primary/10 text-primary", emerald: "bg-emerald-500/12 text-emerald-600", amber: "bg-amber-500/12 text-amber-600", purple: "bg-purple-500/12 text-purple-600" }[accent];
  return (
    <Card className="p-4 shadow-card border-border/50">
      <div className={cn("grid place-items-center w-8 h-8 rounded-lg mb-2", map)}><Icon className="w-4 h-4" /></div>
      <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
      <p className="text-[18px] font-bold tnum tracking-tight mt-0.5">{value}</p>
    </Card>
  );
}
