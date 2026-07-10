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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { computeDocument, computeLine, type LineInput } from "@/lib/gst";
import { toast } from "sonner";
import { QuickCreateCustomer, QuickCreateProduct } from "@/components/app/quick-create";
import { motion } from "framer-motion";
import { Plus, Search, ShoppingCart, Trash2, Check, ChevronsUpDown, X, Package, IndianRupee, TrendingDown } from "lucide-react";

interface Product { id: string; name: string; sku?: string; hsn?: string; purchasePrice: number; taxRate: number; stock: number; unitSymbol?: string }
interface Party { id: string; name: string; phone?: string; gstin?: string; state?: string; stateCode?: string }
interface Purchase { id: string; number: string; status: string; partyName: string; invoiceNumber?: string; invoiceDate: string; grandTotal: number; balance: number; supplyType: string }

export function PurchasesView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);

  const { data, isLoading } = useQuery<{ items: Purchase[] }>({ queryKey: ["purchases", search], queryFn: () => api(`/api/purchases?q=${encodeURIComponent(search)}`) });
  const items = data?.items ?? [];
  const total = items.reduce((s, p) => s + p.grandTotal, 0);

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-5" data-testid="purchases-view">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-xl sm:text-[22px] font-bold tracking-tight">Purchases</h1><p className="text-[12.5px] text-muted-foreground mt-0.5">Record goods-in & supplier GST bills</p></div>
        <Button onClick={() => setFormOpen(true)} className="gap-1.5 h-9 bg-primary hover:bg-primary/90" data-testid="new-purchase"><Plus className="w-4 h-4" /> New Purchase</Button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard icon={ShoppingCart} label="Total Purchases" value={formatINR(total)} accent="amber" />
        <StatCard icon={TrendingDown} label="Purchase Count" value={String(items.length)} accent="purple" />
        <StatCard icon={Package} label="Suppliers" value={String(new Set(items.map(i => i.partyName)).size)} accent="primary" />
      </div>
      <Card className="p-3 flex items-center gap-2 shadow-card border-border/50">
        <div className="relative flex-1"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search purchases…" className="pl-9 h-9 bg-background" /></div>
      </Card>
      <Card className="shadow-card border-border/50 overflow-hidden">
        {isLoading ? <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div> : items.length === 0 ? (
          <div className="py-20 text-center"><div className="grid place-items-center w-14 h-14 rounded-2xl bg-muted mx-auto mb-4"><ShoppingCart className="w-6 h-6 text-muted-foreground" /></div><p className="text-[14px] font-semibold">No purchases yet</p><p className="text-[12.5px] text-muted-foreground mt-1">Record your first supplier purchase</p><Button onClick={() => setFormOpen(true)} className="mt-4 gap-1.5 bg-primary hover:bg-primary/90"><Plus className="w-4 h-4" /> New Purchase</Button></div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-[13px]">
            <thead><tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border/50 bg-muted/20">
              <th className="text-left font-semibold px-4 py-2.5">Number</th>
              <th className="text-left font-semibold px-2 py-2.5">Supplier</th>
              <th className="text-left font-semibold px-2 py-2.5 hidden md:table-cell">Bill No</th>
              <th className="text-left font-semibold px-2 py-2.5 hidden sm:table-cell">Date</th>
              <th className="text-left font-semibold px-2 py-2.5 hidden lg:table-cell">Supply</th>
              <th className="text-right font-semibold px-4 py-2.5">Total</th>
            </tr></thead>
            <tbody>{items.map((p, i) => (
              <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.03, 0.3) }} className="border-b border-border/30 hover:bg-muted/30">
                <td className="px-4 py-3"><div className="flex items-center gap-2.5"><div className="grid place-items-center w-8 h-8 rounded-lg bg-amber-500/12 text-amber-600 shrink-0"><ShoppingCart className="w-4 h-4" /></div><span className="font-mono font-semibold text-[12.5px]">{p.number}</span></div></td>
                <td className="px-2 py-3 font-medium truncate max-w-[160px]">{p.partyName}</td>
                <td className="px-2 py-3 hidden md:table-cell text-muted-foreground font-mono text-[11.5px]">{p.invoiceNumber || "—"}</td>
                <td className="px-2 py-3 hidden sm:table-cell text-muted-foreground tnum">{formatDateShort(p.invoiceDate)}</td>
                <td className="px-2 py-3 hidden lg:table-cell"><Badge variant="outline" className="text-[10px] capitalize">{p.supplyType}</Badge></td>
                <td className="px-4 py-3 text-right font-semibold tnum">{formatINR(p.grandTotal)}</td>
              </motion.tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>
      <PurchaseForm open={formOpen} onOpenChange={setFormOpen} onSaved={() => { queryClient.invalidateQueries({ queryKey: ["purchases"] }); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); setFormOpen(false); }} />
    </div>
  );
}

function PurchaseForm({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [parties, setParties] = React.useState<Party[]>([]);
  const [party, setParty] = React.useState<Party | null>(null);
  const [partyOpen, setPartyOpen] = React.useState(false);
  const [prodOpen, setProdOpen] = React.useState(false);
  const [prodQ, setProdQ] = React.useState("");
  const [lines, setLines] = React.useState<LineInput[]>([]);
  const [invNo, setInvNo] = React.useState("");
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => { if (open) { api<{ items: Product[] }>("/api/products").then((d) => setProducts(d.items)); api<{ items: Party[] }>("/api/parties?type=supplier").then((d) => setParties(d.items)); setLines([]); setParty(null); } }, [open]);

  const supplyType = "intra";
  const { totals } = React.useMemo(() => computeDocument(lines, supplyType), [lines]);

  const addProduct = (p: Product) => { setLines((prev) => { const idx = prev.findIndex((l) => l.productId === p.id); if (idx >= 0) { const n = [...prev]; n[idx] = { ...n[idx], quantity: n[idx].quantity + 1 }; return n; } return [...prev, { productId: p.id, name: p.name, hsn: p.hsn, quantity: 1, unit: p.unitSymbol, price: p.purchasePrice, discountPct: 0, discountAmt: 0, taxRate: p.taxRate }]; }); setProdOpen(false); setProdQ(""); };
  const upd = (i: number, patch: Partial<LineInput>) => setLines((p) => p.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  const rm = (i: number) => setLines((p) => p.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!party) { toast.error("Select a supplier"); return; }
    if (lines.length === 0) { toast.error("Add at least one item"); return; }
    setSaving(true);
    try {
      await api("/api/purchases", { method: "POST", body: JSON.stringify({ partyId: party.id, invoiceDate: date, invoiceNumber: invNo, supplyType, items: lines, notes }) });
      toast.success("Purchase recorded");
      onSaved();
    } catch (e: any) { toast.error(e?.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Record Purchase</DialogTitle><DialogDescription>Add supplier bill — stock will increase automatically</DialogDescription></DialogHeader>
        <div className="grid sm:grid-cols-3 gap-3 py-1">
          <div className="sm:col-span-2 space-y-1.5"><Label className="text-[11.5px]">Supplier</Label>
            <Popover open={partyOpen} onOpenChange={setPartyOpen}><PopoverTrigger asChild><Button variant="outline" className="w-full justify-between h-9 font-normal">{party ? <span className="font-medium">{party.name}</span> : <span className="text-muted-foreground">Search supplier by name, phone or GSTIN…</span>}<ChevronsUpDown className="w-4 h-4 opacity-50" /></Button></PopoverTrigger>
              <PopoverContent className="p-0"><Command><CommandInput placeholder="Search suppliers…" /><CommandList><CommandEmpty>No supplier found. Create one below ↓</CommandEmpty><CommandGroup>{parties.map((p) => <CommandItem key={p.id} onSelect={() => { setParty(p); setPartyOpen(false); }}><div className="flex-1"><div className="text-[13px] font-medium">{p.name}</div><div className="text-[11px] text-muted-foreground">{[p.phone, p.gstin].filter(Boolean).join(" · ")}</div></div></CommandItem>)}</CommandGroup></CommandList></Command><QuickCreateCustomer type="supplier" onCreated={(p) => { setParties(prev => [...prev, p as any]); setParty(p as any); setPartyOpen(false); }} /></PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1.5"><Label className="text-[11.5px]">Bill Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" /></div>
          <div className="space-y-1.5"><Label className="text-[11.5px]">Supplier Bill No.</Label><Input value={invNo} onChange={(e) => setInvNo(e.target.value)} placeholder="Optional" className="h-9" /></div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Popover open={prodOpen} onOpenChange={setProdOpen}><PopoverTrigger asChild><Button variant="outline" size="sm" className="gap-2 h-9"><Search className="w-4 h-4 text-muted-foreground" /> Add product by name, SKU or barcode…</Button></PopoverTrigger><PopoverContent className="p-0 w-[380px]" align="start"><Command shouldFilter={false}><CommandInput placeholder="Type to search products…" value={prodQ} onValueChange={setProdQ} /><CommandList><CommandEmpty>No product found. Create one below ↓</CommandEmpty><CommandGroup>{products.filter((p) => !prodQ || p.name.toLowerCase().includes(prodQ.toLowerCase())).slice(0, 8).map((p) => <CommandItem key={p.id} onSelect={() => addProduct(p)}><Package className="w-4 h-4" /><div className="flex-1"><div className="text-[13px] font-medium">{p.name}</div><div className="text-[11px] text-muted-foreground">Stock: {p.stock} · {formatINR(p.purchasePrice)}</div></div></CommandItem>)}</CommandGroup></CommandList></Command><QuickCreateProduct onCreated={(p) => { setProducts(prev => [...prev, p as any]); addProduct(p as any); setProdOpen(false); setProdQ(""); }} /></PopoverContent></Popover>
        </div>
        {lines.length > 0 && (
          <div className="rounded-xl border border-border/50 overflow-hidden">
            <table className="w-full text-[12.5px]"><thead><tr className="text-[10.5px] uppercase text-muted-foreground bg-muted/20"><th className="text-left font-semibold px-3 py-2">Item</th><th className="text-right font-semibold px-2 py-2 w-20">Qty</th><th className="text-right font-semibold px-2 py-2 w-28">Rate</th><th className="text-right font-semibold px-2 py-2 w-20">GST%</th><th className="text-right font-semibold px-3 py-2 w-28">Total</th><th className="w-8"></th></tr></thead>
              <tbody>{lines.map((l, i) => { const c = computeLine(l, supplyType); return (
                <tr key={i} className="border-t border-border/30">
                  <td className="px-3 py-1.5 font-medium">{l.name}</td>
                  <td className="px-2 py-1.5"><Input type="number" value={l.quantity} onChange={(e) => upd(i, { quantity: Number(e.target.value) })} className="h-8 w-16 text-right tnum" /></td>
                  <td className="px-2 py-1.5"><Input type="number" value={l.price} onChange={(e) => upd(i, { price: Number(e.target.value) })} className="h-8 w-24 text-right tnum" /></td>
                  <td className="px-2 py-1.5 text-right tnum text-muted-foreground">{l.taxRate}%</td>
                  <td className="px-3 py-1.5 text-right tnum font-semibold">{formatINR(c.total)}</td>
                  <td className="px-1 py-1.5"><Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => rm(i)}><Trash2 className="w-3.5 h-3.5" /></Button></td>
                </tr>); })}</tbody>
            </table>
            <div className="p-3 bg-muted/20 flex justify-end"><div className="w-48 space-y-1"><div className="flex justify-between text-[12px]"><span className="text-muted-foreground">Taxable</span><span className="tnum">{formatINR(totals.taxableValue)}</span></div><div className="flex justify-between text-[12px]"><span className="text-muted-foreground">Tax</span><span className="tnum">{formatINR(totals.cgstTotal + totals.sgstTotal + totals.igstTotal)}</span></div><div className="flex justify-between text-[14px] font-bold border-t border-border/40 pt-1"><span>Total</span><span className="tnum text-primary">{formatINR(totals.grandTotal)}</span></div></div></div>
          </div>
        )}
        <div className="space-y-1.5"><Label className="text-[11.5px]">Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional notes" /></div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save} disabled={saving} className="bg-primary hover:bg-primary/90 gap-1.5">{saving ? "Saving…" : <><Check className="w-4 h-4" /> Save Purchase</>}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent: "primary" | "amber" | "purple" }) {
  const map = { primary: "bg-primary/10 text-primary", amber: "bg-amber-500/12 text-amber-600", purple: "bg-purple-500/12 text-purple-600" }[accent];
  return <Card className="p-4 shadow-card border-border/50"><div className={cn("grid place-items-center w-8 h-8 rounded-lg mb-2", map)}><Icon className="w-4 h-4" /></div><p className="text-[11px] text-muted-foreground font-medium">{label}</p><p className="text-[18px] font-bold tnum tracking-tight mt-0.5">{value}</p></Card>;
}
