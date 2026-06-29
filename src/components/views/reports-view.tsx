"use client";

import * as React from "react";
import { api } from "@/lib/api";
import { formatINR, formatINRCompact, formatDate, formatDateShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell } from "recharts";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  BarChart3, FileText, ShoppingCart, Scale, Users, Boxes, CalendarDays,
  Download, TrendingUp, TrendingDown, Wallet, PieChart as PieIcon, Loader2, ChevronRight,
} from "lucide-react";

type ReportType = "sales_register" | "purchase_register" | "profit_loss" | "party_summary" | "inventory_valuation" | "day_book";

const REPORTS: { id: ReportType; label: string; icon: any; desc: string; color: string }[] = [
  { id: "profit_loss", label: "Profit & Loss", icon: Scale, desc: "Revenue, COGS & net profit", color: "emerald" },
  { id: "sales_register", label: "Sales Register", icon: FileText, desc: "All outward GST invoices", color: "primary" },
  { id: "purchase_register", label: "Purchase Register", icon: ShoppingCart, desc: "All inward purchases", color: "amber" },
  { id: "party_summary", label: "Party Report", icon: Users, desc: "Customer & supplier ledger", color: "purple" },
  { id: "inventory_valuation", label: "Inventory Valuation", icon: Boxes, desc: "Stock at cost & sale value", color: "primary" },
  { id: "day_book", label: "Day Book", icon: CalendarDays, desc: "Chronological transactions", color: "emerald" },
];

function firstOfMonth() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); }
function today() { return new Date().toISOString().slice(0, 10); }

export function ReportsView() {
  const [active, setActive] = React.useState<ReportType>("profit_loss");
  const [from, setFrom] = React.useState(firstOfMonth());
  const [to, setTo] = React.useState(today());
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const d = await api(`/api/reports?report=${active}&from=${from}&to=${to}`);
      setData(d);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [active, from, to]);

  React.useEffect(() => { load(); }, [active, from, to]);

  const exportCsv = () => {
    if (!data) return;
    let csv = "";
    if (active === "profit_loss") {
      csv = "Particulars,Amount (₹)\n";
      csv += `Revenue,${data.revenue}\nCost of Goods Sold,${data.cogs}\nGross Profit,${data.grossProfit}\n`;
      for (const [k, v] of Object.entries(data.expenses)) csv += `Expense: ${k},${v}\n`;
      csv += `Total Expenses,${data.expTotal}\nNet Profit,${data.netProfit}\n`;
    } else if (data.rows) {
      csv = data.rows.map((r: any) => Object.values(r).join(",")).join("\n");
      const header = Object.keys(data.rows[0] || {}).join(",") + "\n";
      csv = header + csv;
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${active}_${from}_${to}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported CSV");
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-5" data-testid="reports-view">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-[22px] font-bold tracking-tight">Business Reports</h1>
          <p className="text-[12.5px] text-muted-foreground mt-0.5">Financial statements, registers & analytics</p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!data} className="gap-1.5 h-9"><Download className="w-4 h-4" /> Export CSV</Button>
      </div>

      {/* Report picker */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          const isActive = active === r.id;
          return (
            <button key={r.id} onClick={() => setActive(r.id)} className={cn("flex flex-col items-start gap-2 p-3 rounded-xl border text-left transition-all gpu", isActive ? "border-primary bg-primary/5 shadow-soft" : "border-border hover:bg-muted/40")} data-testid={`report-${r.id}`}>
              <div className={cn("grid place-items-center w-8 h-8 rounded-lg", isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}><Icon className="w-4 h-4" /></div>
              <div><div className="text-[12.5px] font-semibold leading-tight">{r.label}</div><div className="text-[10.5px] text-muted-foreground leading-snug mt-0.5">{r.desc}</div></div>
            </button>
          );
        })}
      </div>

      {/* Date range */}
      <Card className="p-3 flex flex-wrap items-end gap-3 shadow-card border-border/50">
        <div className="space-y-1.5"><Label className="text-[11.5px]">From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-[160px]" /></div>
        <div className="space-y-1.5"><Label className="text-[11.5px]">To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-[160px]" /></div>
        <div className="ml-auto flex items-center gap-2 text-[12px] text-muted-foreground">
          <CalendarDays className="w-4 h-4" />
          <span>{formatDateShort(from)} → {formatDateShort(to)}</span>
        </div>
      </Card>

      {/* Report body */}
      <Card className="shadow-card border-border/50 p-5 min-h-[300px]">
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full rounded" />)}</div>
        ) : active === "profit_loss" ? (
          <PLReport data={data} />
        ) : active === "party_summary" ? (
          <PartyReport data={data} />
        ) : active === "inventory_valuation" ? (
          <InventoryReport data={data} />
        ) : active === "day_book" ? (
          <DayBookReport data={data} />
        ) : (
          <RegisterReport data={data} type={active} />
        )}
      </Card>
    </div>
  );
}

function PLReport({ data }: { data: any }) {
  if (!data) return null;
  const expRows = Object.entries(data.expenses || {}) as [string, number][];
  return (
    <div className="space-y-5" data-testid="pl-report">
      <div className="flex items-center gap-2"><Scale className="w-5 h-5 text-primary" /><h2 className="text-[16px] font-semibold">{data.title}</h2><span className="text-[11.5px] text-muted-foreground ml-auto">{formatDate(data.period?.from)} – {formatDate(data.period?.to)}</span></div>
      <div className="grid sm:grid-cols-3 gap-3">
        <Metric label="Revenue" value={formatINR(data.revenue)} icon={TrendingUp} tone="emerald" />
        <Metric label="COGS" value={formatINR(data.cogs)} icon={TrendingDown} tone="amber" />
        <Metric label="Net Profit" value={formatINR(data.netProfit)} icon={Wallet} tone={data.netProfit >= 0 ? "emerald" : "red"} />
      </div>
      <div className="rounded-xl border border-border/50 overflow-hidden">
        <table className="w-full text-[13px]">
          <tbody>
            <PLRow label="Revenue (Taxable)" value={data.revenue} bold />
            <PLRow label="Less: Cost of Goods Sold" value={-data.cogs} muted />
            <PLRow label="Gross Profit" value={data.grossProfit} bold divider />
            {expRows.map(([k, v]) => <PLRow key={k} label={`Expense: ${k}`} value={-v} muted />)}
            <PLRow label="Total Expenses" value={-data.expTotal} muted />
            <PLRow label="Net Profit" value={data.netProfit} bold divider highlight={data.netProfit >= 0 ? "emerald" : "red"} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RegisterReport({ data, type }: { data: any; type: ReportType }) {
  if (!data) return null;
  const isPurchase = type === "purchase_register";
  return (
    <div className="space-y-4" data-testid="register-report">
      <div className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /><h2 className="text-[16px] font-semibold">{data.title}</h2><span className="text-[11.5px] text-muted-foreground ml-auto">{formatDate(data.period?.from)} – {formatDate(data.period?.to)} · {data.totals?.count || 0} entries</span></div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Metric label="Total Taxable" value={formatINR(data.totals?.taxable || 0)} icon={FileText} tone="primary" />
        {data.totals?.cgst !== undefined && <Metric label="CGST" value={formatINR(data.totals.cgst)} icon={Wallet} tone="muted" />}
        {data.totals?.cgst !== undefined && <Metric label="SGST" value={formatINR(data.totals.sgst)} icon={Wallet} tone="muted" />}
        {data.totals?.igst !== undefined && data.totals.igst > 0 && <Metric label="IGST" value={formatINR(data.totals.igst)} icon={Wallet} tone="muted" />}
        <Metric label="Grand Total" value={formatINR(data.totals?.total || 0)} icon={TrendingUp} tone="emerald" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-border/50">
        <table className="w-full text-[12.5px]">
          <thead><tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground bg-muted/30 border-b border-border/50">
            <th className="text-left font-semibold px-3 py-2.5">Date</th>
            <th className="text-left font-semibold px-2 py-2.5">Number</th>
            <th className="text-left font-semibold px-2 py-2.5">Party</th>
            {isPurchase && <th className="text-left font-semibold px-2 py-2.5 hidden lg:table-cell">Bill No</th>}
            <th className="text-left font-semibold px-2 py-2.5 hidden md:table-cell">GSTIN</th>
            <th className="text-right font-semibold px-2 py-2.5">Taxable</th>
            <th className="text-right font-semibold px-2 py-2.5 hidden sm:table-cell">CGST</th>
            <th className="text-right font-semibold px-2 py-2.5 hidden sm:table-cell">SGST</th>
            <th className="text-right font-semibold px-3 py-2.5">Total</th>
          </tr></thead>
          <tbody>
            {(data.rows || []).map((r: any, i: number) => (
              <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
                <td className="px-3 py-2 text-muted-foreground tnum">{formatDateShort(r.date)}</td>
                <td className="px-2 py-2 font-mono font-medium">{r.number}</td>
                <td className="px-2 py-2 font-medium truncate max-w-[160px]">{r.partyName}</td>
                {isPurchase && <td className="px-2 py-2 hidden lg:table-cell text-muted-foreground">{r.invoiceNumber || "—"}</td>}
                <td className="px-2 py-2 hidden md:table-cell font-mono text-[11px] text-muted-foreground">{r.partyGstin || "—"}</td>
                <td className="px-2 py-2 text-right tnum">{formatINR(r.taxable)}</td>
                <td className="px-2 py-2 text-right tnum text-muted-foreground hidden sm:table-cell">{formatINR(r.cgst || 0)}</td>
                <td className="px-2 py-2 text-right tnum text-muted-foreground hidden sm:table-cell">{formatINR(r.sgst || 0)}</td>
                <td className="px-3 py-2 text-right tnum font-semibold">{formatINR(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PartyReport({ data }: { data: any }) {
  if (!data) return null;
  return (
    <div className="space-y-4" data-testid="party-report">
      <div className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" /><h2 className="text-[16px] font-semibold">{data.title}</h2><span className="text-[11.5px] text-muted-foreground ml-auto">{formatDate(data.period?.from)} – {formatDate(data.period?.to)}</span></div>
      <div className="overflow-x-auto rounded-xl border border-border/50">
        <table className="w-full text-[12.5px]">
          <thead><tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground bg-muted/30 border-b border-border/50">
            <th className="text-left font-semibold px-3 py-2.5">Party</th>
            <th className="text-left font-semibold px-2 py-2.5 hidden sm:table-cell">Type</th>
            <th className="text-right font-semibold px-2 py-2.5">Sales</th>
            <th className="text-right font-semibold px-2 py-2.5 hidden md:table-cell">Purchases</th>
            <th className="text-right font-semibold px-2 py-2.5">Balance</th>
          </tr></thead>
          <tbody>
            {(data.rows || []).map((r: any) => (
              <tr key={r.id} className="border-b border-border/30 hover:bg-muted/20">
                <td className="px-3 py-2"><div className="font-medium">{r.name}</div>{r.phone && <div className="text-[10.5px] text-muted-foreground">{r.phone}</div>}</td>
                <td className="px-2 py-2 hidden sm:table-cell"><Badge variant="outline" className="text-[10px] capitalize">{r.type}</Badge></td>
                <td className="px-2 py-2 text-right tnum">{formatINR(r.salesTotal)}</td>
                <td className="px-2 py-2 text-right tnum hidden md:table-cell">{formatINR(r.purchaseTotal)}</td>
                <td className="px-2 py-2 text-right tnum font-semibold">{r.balance > 0 ? <span className="text-amber-600">{formatINR(r.balance)}</span> : <span className="text-emerald-600">Settled</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InventoryReport({ data }: { data: any }) {
  if (!data) return null;
  return (
    <div className="space-y-4" data-testid="inventory-report">
      <div className="flex items-center gap-2"><Boxes className="w-5 h-5 text-primary" /><h2 className="text-[16px] font-semibold">{data.title}</h2></div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Metric label="Stock at Cost" value={formatINR(data.totals?.totalCost || 0)} icon={Wallet} tone="amber" />
        <Metric label="Stock at Sale Value" value={formatINR(data.totals?.totalSale || 0)} icon={TrendingUp} tone="emerald" />
        <Metric label="Potential Profit" value={formatINR(data.totals?.potentialProfit || 0)} icon={Scale} tone="primary" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-border/50">
        <table className="w-full text-[12.5px]">
          <thead><tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground bg-muted/30 border-b border-border/50">
            <th className="text-left font-semibold px-3 py-2.5">Product</th>
            <th className="text-right font-semibold px-2 py-2.5">Stock</th>
            <th className="text-right font-semibold px-2 py-2.5 hidden sm:table-cell">Purchase</th>
            <th className="text-right font-semibold px-2 py-2.5 hidden sm:table-cell">Sale</th>
            <th className="text-right font-semibold px-3 py-2.5">Cost Value</th>
          </tr></thead>
          <tbody>
            {(data.rows || []).map((r: any, i: number) => (
              <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
                <td className="px-3 py-2"><div className="font-medium">{r.name}</div><div className="text-[10.5px] text-muted-foreground font-mono">{r.sku} · {r.hsn || "—"}</div></td>
                <td className="px-2 py-2 text-right tnum">{r.stock} {r.unit || ""}</td>
                <td className="px-2 py-2 text-right tnum text-muted-foreground hidden sm:table-cell">{formatINR(r.purchasePrice)}</td>
                <td className="px-2 py-2 text-right tnum text-muted-foreground hidden sm:table-cell">{formatINR(r.salePrice)}</td>
                <td className="px-3 py-2 text-right tnum font-semibold">{formatINR(r.costValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DayBookReport({ data }: { data: any }) {
  if (!data) return null;
  const totalIn = (data.payments || []).filter((p: any) => p.type === "receipt").reduce((s: number, p: any) => s + p.amount, 0);
  const totalOut = (data.expenses || []).reduce((s: number, e: any) => s + e.amount, 0) + (data.payments || []).filter((p: any) => p.type === "payment").reduce((s: number, p: any) => s + p.amount, 0);
  return (
    <div className="space-y-4" data-testid="daybook-report">
      <div className="flex items-center gap-2"><CalendarDays className="w-5 h-5 text-primary" /><h2 className="text-[16px] font-semibold">{data.title}</h2><span className="text-[11.5px] text-muted-foreground ml-auto">{formatDate(data.period?.from)} – {formatDate(data.period?.to)}</span></div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Metric label="Sales" value={formatINR((data.sales || []).reduce((s: number, x: any) => s + x.grandTotal, 0))} icon={TrendingUp} tone="emerald" />
        <Metric label="Purchases" value={formatINR((data.purchases || []).reduce((s: number, x: any) => s + x.grandTotal, 0))} icon={ShoppingCart} tone="amber" />
        <Metric label="Receipts" value={formatINR(totalIn)} icon={Wallet} tone="primary" />
        <Metric label="Payments Out" value={formatINR(totalOut)} icon={TrendingDown} tone="red" />
      </div>
      <div className="space-y-4">
        {data.sales?.length > 0 && <DayBookSection title="Sales Invoices" rows={data.sales.map((s: any) => ({ date: s.invoiceDate, desc: `${s.number} · ${s.partyName}`, amount: s.grandTotal }))} tone="emerald" />}
        {data.purchases?.length > 0 && <DayBookSection title="Purchases" rows={data.purchases.map((s: any) => ({ date: s.invoiceDate, desc: `${s.number} · ${s.partyName}`, amount: s.grandTotal }))} tone="amber" />}
        {data.expenses?.length > 0 && <DayBookSection title="Expenses" rows={data.expenses.map((s: any) => ({ date: s.date, desc: `${s.category} · ${s.note || ""}`, amount: s.amount }))} tone="red" />}
        {data.payments?.length > 0 && <DayBookSection title="Payments" rows={data.payments.map((s: any) => ({ date: s.date, desc: `${s.type} · ${s.mode} ${s.reference || ""}`, amount: s.amount }))} tone="primary" />}
      </div>
    </div>
  );
}

function DayBookSection({ title, rows, tone }: { title: string; rows: { date: string; desc: string; amount: number }[]; tone: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{title}</p>
      <div className="rounded-xl border border-border/50 overflow-hidden">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 border-b border-border/30 last:border-0 text-[12.5px]">
            <div className="flex items-center gap-3 min-w-0"><span className="text-muted-foreground tnum text-[11px] w-16 shrink-0">{formatDateShort(r.date)}</span><span className="truncate">{r.desc}</span></div>
            <span className={cn("tnum font-semibold shrink-0", tone === "emerald" && "text-emerald-600", tone === "amber" && "text-amber-600", tone === "red" && "text-red-600", tone === "primary" && "text-primary")}>{formatINR(r.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value, icon: Icon, tone }: { label: string; value: string; icon: any; tone: "primary" | "emerald" | "amber" | "red" | "muted" | "purple" }) {
  const map = { primary: "bg-primary/10 text-primary", emerald: "bg-emerald-500/12 text-emerald-600", amber: "bg-amber-500/12 text-amber-600", red: "bg-red-500/12 text-red-600", purple: "bg-purple-500/12 text-purple-600", muted: "bg-muted text-muted-foreground" }[tone];
  return (
    <Card className="p-3.5 shadow-card border-border/50">
      <div className={cn("grid place-items-center w-7 h-7 rounded-lg mb-1.5", map)}><Icon className="w-3.5 h-3.5" /></div>
      <p className="text-[10.5px] text-muted-foreground font-medium">{label}</p>
      <p className="text-[16px] font-bold tnum tracking-tight mt-0.5">{value}</p>
    </Card>
  );
}

function PLRow({ label, value, bold, muted, divider, highlight }: { label: string; value: number; bold?: boolean; muted?: boolean; divider?: boolean; highlight?: "emerald" | "red" }) {
  return (
    <tr className={cn(divider && "border-t border-border/60")}>
      <td className={cn("px-4 py-2.5", bold ? "font-semibold" : muted ? "text-muted-foreground pl-8" : "")}>{label}</td>
      <td className={cn("px-4 py-2.5 text-right tnum", bold ? "font-bold" : "font-medium", highlight === "emerald" && "text-emerald-600", highlight === "red" && "text-red-600", !highlight && muted && "text-muted-foreground")}>{formatINR(value)}</td>
    </tr>
  );
}
