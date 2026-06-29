"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatINR, formatDateShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FileText, Plus, Send, Check, Clock, X, TrendingUp } from "lucide-react";
import { toast } from "sonner";

const SAMPLE = [
  { id: "1", number: "QT-0004", partyName: "Maharaja Hotel", subject: "Monthly grocery supply", date: new Date(Date.now() - 2 * 86400000), validUntil: new Date(Date.now() + 12 * 86400000), grandTotal: 42500, status: "sent" },
  { id: "2", number: "QT-0003", partyName: "Sai Enterprises", subject: "Festival bulk order", date: new Date(Date.now() - 5 * 86400000), validUntil: new Date(Date.now() - 1 * 86400000), grandTotal: 18750, status: "accepted" },
  { id: "3", number: "QT-0002", partyName: "Anil Kumar", subject: "Office stationery", date: new Date(Date.now() - 9 * 86400000), validUntil: new Date(Date.now() - 2 * 86400000), grandTotal: 3200, status: "expired" },
  { id: "4", number: "QT-0001", partyName: "Maharaja Hotel", subject: "Kitchen equipment", date: new Date(Date.now() - 15 * 86400000), validUntil: new Date(Date.now() - 8 * 86400000), grandTotal: 12800, status: "rejected" },
];

const STATUS_META: Record<string, { icon: any; cls: string; label: string }> = {
  sent: { icon: Send, cls: "bg-blue-500/12 text-blue-700", label: "Sent" },
  accepted: { icon: Check, cls: "bg-emerald-500/12 text-emerald-700", label: "Accepted" },
  rejected: { icon: X, cls: "bg-red-500/12 text-red-700", label: "Rejected" },
  expired: { icon: Clock, cls: "bg-muted text-muted-foreground", label: "Expired" },
  draft: { icon: FileText, cls: "bg-muted text-muted-foreground", label: "Draft" },
};

export function QuotationsView() {
  const totalValue = SAMPLE.reduce((s, q) => s + q.grandTotal, 0);
  const accepted = SAMPLE.filter((q) => q.status === "accepted");

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-5" data-testid="quotations-view">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-xl sm:text-[22px] font-bold tracking-tight">Quotations & Estimates</h1><p className="text-[12.5px] text-muted-foreground mt-0.5">Send quotes, track acceptance & convert to invoices</p></div>
        <Button onClick={() => toast.info("Quotation builder coming soon — use Sales to create invoices")} className="gap-1.5 h-9 bg-primary hover:bg-primary/90"><Plus className="w-4 h-4" /> New Quotation</Button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={FileText} label="Total Quotations" value={String(SAMPLE.length)} accent="primary" />
        <StatCard icon={TrendingUp} label="Quoted Value" value={formatINR(totalValue)} accent="emerald" />
        <StatCard icon={Check} label="Accepted" value={String(accepted.length)} accent="amber" />
        <StatCard icon={Clock} label="Pending" value={String(SAMPLE.filter((q) => q.status === "sent").length)} accent="purple" />
      </div>
      <Card className="shadow-card border-border/50 overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-[13px]">
          <thead><tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border/50 bg-muted/20"><th className="text-left font-semibold px-4 py-2.5">Quotation</th><th className="text-left font-semibold px-2 py-2.5">Party</th><th className="text-left font-semibold px-2 py-2.5 hidden md:table-cell">Subject</th><th className="text-left font-semibold px-2 py-2.5 hidden sm:table-cell">Date</th><th className="text-left font-semibold px-2 py-2.5 hidden lg:table-cell">Valid Until</th><th className="text-right font-semibold px-2 py-2.5">Value</th><th className="text-center font-semibold px-4 py-2.5">Status</th></tr></thead>
          <tbody>{SAMPLE.map((q) => { const m = STATUS_META[q.status]; const Icon = m.icon; return (
            <tr key={q.id} className="border-b border-border/30 hover:bg-muted/20">
              <td className="px-4 py-3"><div className="flex items-center gap-2.5"><div className="grid place-items-center w-8 h-8 rounded-lg bg-primary/10 text-primary shrink-0"><FileText className="w-4 h-4" /></div><span className="font-mono font-semibold text-[12.5px]">{q.number}</span></div></td>
              <td className="px-2 py-3 font-medium">{q.partyName}</td>
              <td className="px-2 py-3 hidden md:table-cell text-muted-foreground truncate max-w-[160px]">{q.subject}</td>
              <td className="px-2 py-3 hidden sm:table-cell text-muted-foreground tnum">{formatDateShort(q.date)}</td>
              <td className="px-2 py-3 hidden lg:table-cell text-muted-foreground tnum">{formatDateShort(q.validUntil)}</td>
              <td className="px-2 py-3 text-right font-semibold tnum">{formatINR(q.grandTotal)}</td>
              <td className="px-4 py-3 text-center"><span className={cn("inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-md", m.cls)}><Icon className="w-3 h-3" /> {m.label}</span></td>
            </tr>); })}</tbody>
        </table></div>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent: "primary" | "emerald" | "amber" | "purple" }) {
  const map = { primary: "bg-primary/10 text-primary", emerald: "bg-emerald-500/12 text-emerald-600", amber: "bg-amber-500/12 text-amber-600", purple: "bg-purple-500/12 text-purple-600" }[accent];
  return <Card className="p-4 shadow-card border-border/50"><div className={cn("grid place-items-center w-8 h-8 rounded-lg mb-2", map)}><Icon className="w-4 h-4" /></div><p className="text-[11px] text-muted-foreground font-medium">{label}</p><p className="text-[18px] font-bold tnum tracking-tight mt-0.5">{value}</p></Card>;
}
