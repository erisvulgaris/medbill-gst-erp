"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { computeDocument, type LineInput } from "@/lib/gst";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Plus, Minus, Trash2, ShoppingCart, Scan, X, Printer,
  CheckCircle2, CreditCard, Banknote, Wallet, Receipt,
} from "lucide-react";

interface Product { id: string; name: string; sku?: string; barcode?: string; salePrice: number; taxRate: number; stock: number; unitSymbol?: string; hsn?: string }

export function PosView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [cart, setCart] = React.useState<LineInput[]>([]);
  const [partyName, setPartyName] = React.useState("Walk-in Customer");
  const [payMode, setPayMode] = React.useState<"cash" | "upi" | "card">("cash");
  const [checkingOut, setCheckingOut] = React.useState(false);
  const [lastInvoice, setLastInvoice] = React.useState<{ id: string; number: string } | null>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);

  const { data } = useQuery<{ items: Product[] }>({ queryKey: ["products", "pos", search], queryFn: () => api(`/api/products?q=${encodeURIComponent(search)}`) });
  const products = (data?.items ?? []).slice(0, 24);

  const supplyType = "intra";
  const { totals } = React.useMemo(() => computeDocument(cart, supplyType), [cart]);

  const addToCart = (p: Product) => {
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.productId === p.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { productId: p.id, name: p.name, hsn: p.hsn, quantity: 1, unit: p.unitSymbol, price: p.salePrice, discountPct: 0, discountAmt: 0, taxRate: p.taxRate }];
    });
    setSearch("");
    searchRef.current?.focus();
  };

  const updateQty = (i: number, delta: number) => {
    setCart((prev) => prev.map((l, idx) => idx === i ? { ...l, quantity: Math.max(1, l.quantity + delta) } : l));
  };
  const setQty = (i: number, q: number) => {
    setCart((prev) => prev.map((l, idx) => idx === i ? { ...l, quantity: Math.max(1, q) } : l));
  };
  const removeItem = (i: number) => setCart((prev) => prev.filter((_, idx) => idx !== i));

  const checkout = async () => {
    if (cart.length === 0) { toast.error("Cart is empty"); return; }
    setCheckingOut(true);
    try {
      const res = await api<{ ok: boolean; invoice: { id: string; number: string } }>("/api/invoices", {
        method: "POST",
        body: JSON.stringify({ partyName, invoiceDate: new Date().toISOString().slice(0, 10), supplyType, items: cart, notes: "POS sale", terms: "" }),
      });
      // record payment
      await api("/api/payments", { method: "POST", body: JSON.stringify({ type: "receipt", mode: payMode, amount: totals.grandTotal, date: new Date().toISOString(), invoiceId: res.invoice.id, partyId: null, reference: "POS-" + res.invoice.number, note: "POS payment" }) });
      setLastInvoice(res.invoice);
      setCart([]);
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(`Sale complete · ${res.invoice.number}`);
    } catch (e: any) { toast.error(e?.message || "Checkout failed"); } finally { setCheckingOut(false); }
  };

  return (
    <div className="grid lg:grid-cols-[1fr_400px] gap-4 p-4 sm:p-6 h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)]" data-testid="pos-view">
      {/* Product grid */}
      <div className="flex flex-col min-h-0">
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Scan barcode or search product…" className="pl-9 h-11 bg-background text-[14px]" autoFocus data-testid="pos-search" />
          </div>
          <Button variant="outline" size="icon" className="h-11 w-11" onClick={() => toast.info("Barcode scanner (demo)")}><Scan className="w-5 h-5" /></Button>
        </div>
        <div className="flex-1 overflow-y-auto pr-1 -mr-1">
          {products.length === 0 ? (
            <div className="grid place-items-center h-48 text-center"><div><Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" /><p className="text-[13px] text-muted-foreground">{search ? "No products match" : "Type to search products"}</p></div></div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {products.map((p) => (
                <motion.button key={p.id} whileTap={{ scale: 0.97 }} onClick={() => addToCart(p)} className={cn("text-left p-3 rounded-xl border transition-all gpu relative", p.stock <= 0 ? "border-border/40 opacity-60" : "border-border/60 hover:border-primary hover:shadow-soft hover:bg-primary/5")} disabled={p.stock <= 0}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="grid place-items-center w-9 h-9 rounded-lg bg-muted text-muted-foreground shrink-0"><Receipt className="w-4 h-4" /></div>
                    {p.stock <= 0 ? <Badge variant="destructive" className="text-[9px] h-4">Out</Badge> : p.stock <= 5 ? <Badge className="text-[9px] h-4 bg-amber-500/15 text-amber-700">{p.stock} left</Badge> : null}
                  </div>
                  <p className="text-[12.5px] font-medium mt-2 leading-tight line-clamp-2 min-h-[34px]">{p.name}</p>
                  <div className="flex items-center justify-between mt-1.5"><span className="text-[15px] font-bold tnum text-primary">{formatINR(p.salePrice)}</span><span className="text-[10px] text-muted-foreground">{p.taxRate}% GST</span></div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart */}
      <Card className="flex flex-col shadow-card border-border/50 min-h-0 overflow-hidden">
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-primary" /><h2 className="text-[15px] font-semibold">Current Sale</h2></div>
          {cart.length > 0 && <Button variant="ghost" size="sm" className="h-7 text-[11px] text-muted-foreground" onClick={() => setCart([])}>Clear</Button>}
        </div>

        <div className="px-4 py-2 border-b border-border/40">
          <Input value={partyName} onChange={(e) => setPartyName(e.target.value)} placeholder="Customer name" className="h-8 text-[12.5px] bg-transparent border-transparent focus:bg-background" />
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {cart.length === 0 ? (
            <div className="grid place-items-center h-full text-center py-10"><div><div className="grid place-items-center w-14 h-14 rounded-2xl bg-muted mx-auto mb-3"><ShoppingCart className="w-6 h-6 text-muted-foreground" /></div><p className="text-[13px] font-medium">Cart is empty</p><p className="text-[11.5px] text-muted-foreground mt-0.5">Tap products to add</p></div></div>
          ) : (
            <AnimatePresence>
              {cart.map((item, i) => (
                <motion.div key={i} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/40 mb-1">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-medium truncate">{item.name}</p>
                    <p className="text-[11px] text-muted-foreground tnum">{formatINR(item.price)} × {item.quantity} = <span className="font-semibold text-foreground">{formatINR(item.price * item.quantity)}</span></p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQty(i, -1)}><Minus className="w-3 h-3" /></Button>
                    <Input type="number" value={item.quantity} onChange={(e) => setQty(i, Number(e.target.value))} className="h-6 w-10 text-center text-[12px] tnum p-0" />
                    <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQty(i, 1)}><Plus className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeItem(i)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Totals + checkout */}
        <div className="border-t border-border/50 p-4 space-y-3 bg-muted/20">
          <div className="space-y-1">
            <Row label="Subtotal" value={formatINR(totals.subtotal)} />
            <Row label={`Tax (${totals.cgstTotal + totals.sgstTotal + totals.igstTotal > 0 ? "CGST+SGST" : "—"})`} value={formatINR(totals.cgstTotal + totals.sgstTotal + totals.igstTotal)} muted />
            {totals.roundOff !== 0 && <Row label="Round Off" value={`${totals.roundOff > 0 ? "+" : ""}${formatINR(totals.roundOff)}`} muted />}
            <div className="flex items-center justify-between pt-1.5 border-t border-border/40"><span className="text-[14px] font-semibold">Total</span><span className="text-[22px] font-bold tnum text-primary">{formatINR(totals.grandTotal)}</span></div>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {([["cash", Banknote], ["upi", Wallet], ["card", CreditCard]] as const).map(([mode, Icon]) => (
              <button key={mode} onClick={() => setPayMode(mode)} className={cn("flex flex-col items-center gap-1 py-2 rounded-lg border text-[11px] font-medium capitalize transition-all", payMode === mode ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-muted/40")}>
                <Icon className="w-4 h-4" /> {mode}
              </button>
            ))}
          </div>
          <Button onClick={checkout} disabled={checkingOut || cart.length === 0} className="w-full h-11 gap-2 bg-primary hover:bg-primary/90 text-[14px] font-semibold" data-testid="pos-checkout">
            {checkingOut ? "Processing…" : <>Charge {formatINR(totals.grandTotal)}</>}
          </Button>
        </div>
      </Card>

      {/* Success dialog */}
      <AnimatePresence>
        {lastInvoice && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setLastInvoice(null)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-card rounded-2xl shadow-float p-6 max-w-sm w-full text-center" onClick={(e) => e.stopPropagation()}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: "spring" }} className="grid place-items-center w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600 mx-auto mb-4"><CheckCircle2 className="w-9 h-9" /></motion.div>
              <h3 className="text-[18px] font-bold">Sale Complete!</h3>
              <p className="text-[12.5px] text-muted-foreground mt-1">Invoice <span className="font-mono font-semibold text-foreground">{lastInvoice.number}</span> created & payment recorded</p>
              <div className="flex gap-2 mt-5">
                <Button variant="outline" className="flex-1 gap-1.5" onClick={() => window.print()}><Printer className="w-4 h-4" /> Print</Button>
                <Button className="flex-1 bg-primary hover:bg-primary/90 gap-1.5" onClick={() => setLastInvoice(null)}><Receipt className="w-4 h-4" /> New Sale</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return <div className="flex items-center justify-between text-[12.5px]"><span className={cn(muted ? "text-muted-foreground" : "text-foreground/80")}>{label}</span><span className={cn("tnum font-medium", muted ? "text-muted-foreground" : "text-foreground")}>{value}</span></div>;
}
