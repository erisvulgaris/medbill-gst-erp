"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatINR, formatDateShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Plus, Wallet, TrendingDown, Receipt, IndianRupee } from "lucide-react";

const CATEGORIES = [
  { id: "rent", label: "Rent", color: "#10b981" },
  { id: "salary", label: "Salary", color: "#f59e0b" },
  { id: "utilities", label: "Utilities", color: "#3b82f6" },
  { id: "travel", label: "Travel", color: "#a855f7" },
  { id: "marketing", label: "Marketing", color: "#ec4899" },
  { id: "misc", label: "Miscellaneous", color: "#6b7280" },
];
const MODES = ["cash", "upi", "card", "bank", "cheque"];
const catColor = (c: string) => CATEGORIES.find((x) => x.id === c)?.color || "#6b7280";
const catLabel = (c: string) => CATEGORIES.find((x) => x.id === c)?.label || c;

export function ExpensesView() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = React.useState(false);

  const { data, isLoading } = useQuery<{ items: any[]; total: number; byCategory: Record<string, number> }>({ queryKey: ["expenses"], queryFn: () => api("/api/expenses") });
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const byCat = data?.byCategory ?? {};
  const pieData = Object.entries(byCat).map(([k, v]) => ({ name: catLabel(k), value: v, color: catColor(k) }));

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-5" data-testid="expenses-view">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-xl sm:text-[22px] font-bold tracking-tight">Expenses</h1><p className="text-[12.5px] text-muted-foreground mt-0.5">Track business spending by category</p></div>
        <Button onClick={() => setFormOpen(true)} className="gap-1.5 h-9 bg-primary hover:bg-primary/90" data-testid="add-expense"><Plus className="w-4 h-4" /> Add Expense</Button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard icon={TrendingDown} label="Total (this period)" value={formatINR(total)} accent="red" />
        <StatCard icon={Receipt} label="Entries" value={String(items.length)} accent="primary" />
        <StatCard icon={Wallet} label="Avg per entry" value={items.length ? formatINR(total / items.length) : "₹0"} accent="amber" />
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="shadow-card border-border/50 p-4 lg:col-span-1">
          <h3 className="text-[14px] font-semibold mb-2">By Category</h3>
          {pieData.length === 0 ? <div className="h-48 grid place-items-center text-[12px] text-muted-foreground">No data</div> : (
            <>
              <div className="h-48"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>{pieData.map((d, i) => <Cell key={i} fill={d.color} />)}</Pie><Tooltip formatter={(v: any) => formatINR(v)} /></PieChart></ResponsiveContainer></div>
              <div className="space-y-1.5 mt-2">{pieData.map((d) => <div key={d.name} className="flex items-center justify-between text-[12px]"><div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} /><span className="text-muted-foreground">{d.name}</span></div><span className="font-semibold tnum">{formatINR(d.value)}</span></div>)}</div>
            </>
          )}
        </Card>
        <Card className="shadow-card border-border/50 overflow-hidden lg:col-span-2">
          {isLoading ? <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div> : items.length === 0 ? (
            <div className="py-16 text-center"><div className="grid place-items-center w-12 h-12 rounded-xl bg-muted mx-auto mb-3"><Wallet className="w-5 h-5 text-muted-foreground" /></div><p className="text-[13px] font-medium">No expenses recorded</p></div>
          ) : (
            <div className="overflow-x-auto"><table className="w-full text-[13px]">
              <thead><tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border/50 bg-muted/20"><th className="text-left font-semibold px-4 py-2.5">Date</th><th className="text-left font-semibold px-2 py-2.5">Category</th><th className="text-left font-semibold px-2 py-2.5 hidden sm:table-cell">Note</th><th className="text-left font-semibold px-2 py-2.5 hidden md:table-cell">Mode</th><th className="text-right font-semibold px-4 py-2.5">Amount</th></tr></thead>
              <tbody>{items.map((e, i) => (
                <motion.tr key={e.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.02, 0.3) }} className="border-b border-border/30 hover:bg-muted/20">
                  <td className="px-4 py-2.5 text-muted-foreground tnum">{formatDateShort(e.date)}</td>
                  <td className="px-2 py-2.5"><Badge variant="secondary" className="text-[10.5px]" style={{ background: `${catColor(e.category)}20`, color: catColor(e.category) }}>{catLabel(e.category)}</Badge></td>
                  <td className="px-2 py-2.5 hidden sm:table-cell text-muted-foreground truncate max-w-[200px]">{e.note || "—"}</td>
                  <td className="px-2 py-2.5 hidden md:table-cell"><Badge variant="outline" className="text-[10px] capitalize">{e.mode}</Badge></td>
                  <td className="px-4 py-2.5 text-right font-semibold tnum text-red-600">−{formatINR(e.amount)}</td>
                </motion.tr>
              ))}</tbody>
            </table></div>
          )}
        </Card>
      </div>
      <ExpenseForm open={formOpen} onOpenChange={setFormOpen} onSaved={() => { queryClient.invalidateQueries({ queryKey: ["expenses"] }); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); setFormOpen(false); }} />
    </div>
  );
}

function ExpenseForm({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const [cat, setCat] = React.useState("misc");
  const [amount, setAmount] = React.useState(0);
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [mode, setMode] = React.useState("cash");
  const [vendor, setVendor] = React.useState("");
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => { if (open) { setCat("misc"); setAmount(0); setDate(new Date().toISOString().slice(0, 10)); setMode("cash"); setVendor(""); setNote(""); } }, [open]);

  const save = async () => {
    if (amount <= 0) { toast.error("Enter a valid amount"); return; }
    setSaving(true);
    try { await api("/api/expenses", { method: "POST", body: JSON.stringify({ category: cat, amount, date, mode, vendor, note }) }); toast.success("Expense added"); onSaved(); } catch (e: any) { toast.error(e?.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>Add Expense</DialogTitle><DialogDescription>Record a business expense</DialogDescription></DialogHeader>
      <div className="space-y-3 py-1">
        <div className="space-y-1.5"><Label className="text-[11.5px]">Category</Label><Select value={cat} onValueChange={setCat}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label className="text-[11.5px]">Amount</Label><div className="relative"><IndianRupee className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input type="number" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} className="pl-8 tnum" placeholder="0" autoFocus /></div></div>
          <div className="space-y-1.5"><Label className="text-[11.5px]">Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label className="text-[11.5px]">Payment Mode</Label><Select value={mode} onValueChange={setMode}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{MODES.map((m) => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label className="text-[11.5px]">Vendor (optional)</Label><Input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Vendor name" /></div>
        </div>
        <div className="space-y-1.5"><Label className="text-[11.5px]">Note</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="What was this for?" /></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save} disabled={saving} className="bg-primary hover:bg-primary/90">{saving ? "Saving…" : "Add Expense"}</Button></DialogFooter>
    </DialogContent></Dialog>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent: "primary" | "amber" | "red" }) {
  const map = { primary: "bg-primary/10 text-primary", amber: "bg-amber-500/12 text-amber-600", red: "bg-red-500/12 text-red-600" }[accent];
  return <Card className="p-4 shadow-card border-border/50"><div className={cn("grid place-items-center w-8 h-8 rounded-lg mb-2", map)}><Icon className="w-4 h-4" /></div><p className="text-[11px] text-muted-foreground font-medium">{label}</p><p className="text-[18px] font-bold tnum tracking-tight mt-0.5">{value}</p></Card>;
}
