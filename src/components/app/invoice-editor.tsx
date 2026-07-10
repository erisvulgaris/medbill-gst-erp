"use client";

import * as React from "react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import {
  computeDocument, computeLine, deriveSupplyType, GST_RATES,
  isValidGstin, stateCodeFromGstin, INDIAN_STATES, type LineInput,
} from "@/lib/gst";
import { formatINR, amountInWords } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Trash2, Plus, Search, Check, ChevronsUpDown, Package, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { QuickCreateCustomer, QuickCreateProduct } from "@/components/app/quick-create";

interface Product {
  id: string; name: string; sku?: string | null; barcode?: string | null;
  hsn?: string | null; unitName?: string | null; unitSymbol?: string | null;
  taxRate: number; salePrice: number; stock: number; mrp?: number;
}
interface Party {
  id: string; name: string; phone?: string | null; gstin?: string | null;
  state?: string | null; stateCode?: string | null; type?: string;
}

interface InvoiceEditorProps {
  onSaved: (invoiceId: string) => void;
  onCancel: () => void;
}

export function InvoiceEditor({ onSaved, onCancel }: InvoiceEditorProps) {
  const { business } = useAppStore();
  const [products, setProducts] = React.useState<Product[]>([]);
  const [parties, setParties] = React.useState<Party[]>([]);
  const [party, setParty] = React.useState<Party | null>(null);
  const [partyOpen, setPartyOpen] = React.useState(false);
  const [productOpen, setProductOpen] = React.useState(false);
  const [productQuery, setProductQuery] = React.useState("");
  const [lines, setLines] = React.useState<LineInput[]>([]);
  const [invoiceDate, setInvoiceDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = React.useState("");
  const [notes, setNotes] = React.useState("Thank you for your business.");
  const [terms, setTerms] = React.useState("Goods once sold will not be taken back. Interest @18% p.a. on overdue bills.");
  const [saving, setSaving] = React.useState(false);
  const lineRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  React.useEffect(() => {
    (async () => {
      try {
        const [p, pr] = await Promise.all([
          api<{ items: Product[] }>("/api/products"),
          api<{ items: Party[] }>("/api/parties?type=customer"),
        ]);
        setProducts(p.items);
        setParties(pr.items.filter((x) => x.name !== "Walk-in Customer").concat(pr.items.find((x) => x.name === "Walk-in Customer") || []));
      } catch {}
    })();
  }, []);

  const supplyType = React.useMemo(() => {
    const partyState = party?.stateCode ?? null;
    return deriveSupplyType(business?.stateCode, partyState);
  }, [party, business?.stateCode]);

  const { lines: computed, totals } = React.useMemo(
    () => computeDocument(lines, supplyType),
    [lines, supplyType]
  );

  const addProduct = (p: Product) => {
    setLines((prev) => {
      const existing = prev.findIndex((l) => l.productId === p.id);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = { ...next[existing], quantity: next[existing].quantity + 1 };
        return next;
      }
      return [
        ...prev,
        {
          productId: p.id,
          name: p.name,
          hsn: p.hsn,
          quantity: 1,
          unit: p.unitSymbol,
          price: p.salePrice,
          discountPct: 0,
          discountAmt: 0,
          taxRate: p.taxRate,
        },
      ];
    });
    setProductOpen(false);
    setProductQuery("");
    setTimeout(() => {
      const idx = lines.length;
      lineRefs.current[idx]?.focus();
    }, 50);
  };

  const addBlankLine = () => {
    setLines((prev) => [...prev, { name: "", quantity: 1, price: 0, discountPct: 0, discountAmt: 0, taxRate: 18 }]);
  };

  const updateLine = (i: number, patch: Partial<LineInput>) => {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  };

  const removeLine = (i: number) => {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  };

  const filteredProducts = React.useMemo(() => {
    if (!productQuery) return products.slice(0, 8);
    const q = productQuery.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.barcode?.includes(q)).slice(0, 8);
  }, [products, productQuery]);

  const save = async () => {
    if (!party && !party?.name) {
      toast.error("Please select a customer");
      return;
    }
    if (lines.length === 0) {
      toast.error("Add at least one item");
      return;
    }
    if (lines.some((l) => !l.name.trim() || l.quantity <= 0)) {
      toast.error("Each line needs a name and quantity > 0");
      return;
    }
    if (party?.gstin && !isValidGstin(party.gstin)) {
      toast.error("Customer GSTIN is invalid");
      return;
    }
    setSaving(true);
    try {
      const res = await api<{ ok: boolean; invoice: { id: string; number: string } }>("/api/invoices", {
        method: "POST",
        body: JSON.stringify({
          partyId: party?.id,
          partyName: party?.name,
          partyGstin: party?.gstin,
          partyStateCode: party?.stateCode,
          invoiceDate,
          dueDate: dueDate || undefined,
          supplyType,
          items: lines,
          notes,
          terms,
          placeOfSupply: party?.stateCode,
        }),
      });
      toast.success(`Invoice ${res.invoice.number} created`);
      onSaved(res.invoice.id);
    } catch (e: any) {
      toast.error(e?.message || "Failed to create invoice");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-4" data-testid="invoice-editor">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" className="mb-1 -ml-2 h-7 text-[12px] text-muted-foreground" onClick={onCancel}>
            <X className="w-3.5 h-3.5" /> Cancel
          </Button>
          <h1 className="text-xl font-bold tracking-tight">Create Tax Invoice</h1>
          <p className="text-[12.5px] text-muted-foreground mt-0.5">GST-compliant invoice with auto CGST/SGST/IGST</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addBlankLine} className="gap-1.5 h-9">
            <Plus className="w-4 h-4" /> Blank line
          </Button>
          <Button size="sm" onClick={save} disabled={saving} className="gap-1.5 h-9 bg-primary hover:bg-primary/90" data-testid="save-invoice">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save Invoice
          </Button>
        </div>
      </div>

      {/* Party + meta */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-[12px] font-semibold text-muted-foreground">CUSTOMER (BILL TO)</Label>
            {party && (
              <Button variant="ghost" size="sm" className="h-6 text-[11px]" onClick={() => setParty(null)}>
                Change
              </Button>
            )}
          </div>
          {!party ? (
            <Popover open={partyOpen} onOpenChange={setPartyOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between h-11 font-normal" data-testid="party-select">
                  <span className="text-muted-foreground flex items-center gap-2"><Search className="w-4 h-4" /> Search customer by name, phone or GSTIN…</span>
                  <ChevronsUpDown className="w-4 h-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 max-w-[520px]" align="start">
                <Command>
                  <CommandInput placeholder="Search customers…" />
                  <CommandList className="max-h-72">
                    <CommandEmpty>No customer found.</CommandEmpty>
                    <CommandGroup>
                      {parties.map((p) => (
                        <CommandItem key={p.id} onSelect={() => { setParty(p); setPartyOpen(false); }} className="gap-3">
                          <div className="grid place-items-center w-8 h-8 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold">
                            {p.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-medium truncate">{p.name}</div>
                            <div className="text-[11px] text-muted-foreground truncate">{[p.phone, p.gstin, p.state].filter(Boolean).join(" · ")}</div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
                <QuickCreateCustomer type="customer" onCreated={(p) => { setParties(prev => [...prev, p]); setParty(p); setPartyOpen(false); }} />
              </PopoverContent>
            </Popover>
          ) : (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-muted/40 p-3.5 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[15px]">{party.name}</span>
                {party.gstin && <Badge variant="secondary" className="font-mono text-[10px]">{party.gstin}</Badge>}
              </div>
              <div className="text-[12px] text-muted-foreground">
                {[party.phone, party.state && `${party.state} (${party.stateCode})`].filter(Boolean).join(" · ") || "No contact"}
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                <Badge variant="outline" className="text-[10px] capitalize">{party.type || "customer"}</Badge>
                <Badge variant="outline" className="text-[10px]">{supplyType === "intra" ? "Intra-state (CGST+SGST)" : "Inter-state (IGST)"}</Badge>
              </div>
            </motion.div>
          )}
        </Card>

        <Card className="p-4 space-y-3">
          <Label className="text-[12px] font-semibold text-muted-foreground">INVOICE DETAILS</Label>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1.5">
              <Label className="text-[11.5px]">Invoice Date</Label>
              <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11.5px]">Due Date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-9" />
            </div>
          </div>
          <div className="rounded-lg bg-primary/8 border border-primary/20 px-3 py-2 text-[11.5px]">
            <span className="font-medium text-primary">Supply type:</span>{" "}
            <span className="text-foreground">{supplyType === "intra" ? "Intra-state → CGST + SGST" : "Inter-state → IGST"}</span>
          </div>
        </Card>
      </div>

      {/* Items */}
      <Card className="overflow-hidden">
        {/* Add product bar */}
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-border/50 bg-muted/20">
          <Popover open={productOpen} onOpenChange={setProductOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 h-9 min-w-[280px] justify-start" data-testid="add-product-btn">
                <Search className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Add product by name, SKU or barcode…</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[420px]" align="start">
              <Command shouldFilter={false}>
                <CommandInput placeholder="Type to search products…" value={productQuery} onValueChange={setProductQuery} autoFocus />
                <CommandList className="max-h-80">
                  <CommandEmpty>No product found. Create one below ↓</CommandEmpty>
                  <CommandGroup>
                    {filteredProducts.map((p) => (
                      <CommandItem key={p.id} onSelect={() => addProduct(p)} className="gap-3">
                        <div className="grid place-items-center w-8 h-8 rounded-lg bg-muted text-muted-foreground">
                          <Package className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium truncate">{p.name}</div>
                          <div className="text-[11px] text-muted-foreground">{p.sku} · Stock: {p.stock} · GST {p.taxRate}%</div>
                        </div>
                        <span className="text-[12px] font-semibold tnum">{formatINR(p.salePrice)}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
              <QuickCreateProduct onCreated={(p) => { setProducts(prev => [...prev, p]); addProduct(p); setProductOpen(false); setProductQuery(""); }} />
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="sm" onClick={addBlankLine} className="h-9 gap-1.5 text-muted-foreground">
            <Plus className="w-4 h-4" /> Add blank line
          </Button>
          {lines.length > 0 && (
            <span className="text-[11.5px] text-muted-foreground ml-auto">{lines.length} item{lines.length > 1 ? "s" : ""}</span>
          )}
        </div>

        {/* Table */}
        {lines.length === 0 ? (
          <div className="py-16 text-center">
            <div className="grid place-items-center w-12 h-12 rounded-xl bg-muted mx-auto mb-3">
              <Package className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-[13px] font-medium">No items added yet</p>
            <p className="text-[11.5px] text-muted-foreground mt-0.5">Search products above or add a blank line</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border/50 bg-muted/20">
                  <th className="text-left font-semibold px-3 py-2.5 min-w-[260px]">Item</th>
                  <th className="text-right font-semibold px-2 py-2.5 w-20">Qty</th>
                  <th className="text-right font-semibold px-2 py-2.5 w-28">Rate</th>
                  <th className="text-right font-semibold px-2 py-2.5 w-20">Disc%</th>
                  <th className="text-right font-semibold px-2 py-2.5 w-20">GST%</th>
                  <th className="text-right font-semibold px-3 py-2.5 w-28">Taxable</th>
                  <th className="text-right font-semibold px-3 py-2.5 w-28">Tax</th>
                  <th className="text-right font-semibold px-3 py-2.5 w-28">Total</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {computed.map((l, i) => (
                  <tr key={i} className="border-b border-border/40 group hover:bg-muted/20">
                    <td className="px-3 py-1.5">
                      <Input
                        ref={(el) => { lineRefs.current[i] = el; }}
                        value={l.name}
                        onChange={(e) => updateLine(i, { name: e.target.value })}
                        placeholder="Item name"
                        className="h-8 border-transparent bg-transparent hover:bg-background focus:bg-background text-[12.5px] font-medium"
                      />
                      {l.hsn && <span className="text-[10px] text-muted-foreground ml-1">HSN: {l.hsn}</span>}
                    </td>
                    <td className="px-2 py-1.5">
                      <Input type="number" value={l.quantity || ""} onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })} className="h-8 w-16 text-right tnum border-transparent bg-transparent hover:bg-background focus:bg-background" />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input type="number" value={l.price || ""} onChange={(e) => updateLine(i, { price: Number(e.target.value) })} className="h-8 w-24 text-right tnum border-transparent bg-transparent hover:bg-background focus:bg-background" />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input type="number" value={l.discountPct || ""} onChange={(e) => updateLine(i, { discountPct: Number(e.target.value) })} className="h-8 w-16 text-right tnum border-transparent bg-transparent hover:bg-background focus:bg-background" placeholder="0" />
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        value={l.taxRate}
                        onChange={(e) => updateLine(i, { taxRate: Number(e.target.value) })}
                        className="h-8 w-16 rounded-md border border-transparent bg-transparent hover:bg-background focus:bg-background focus:border-input text-right tnum text-[12px]"
                      >
                        {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-1.5 text-right tnum text-muted-foreground">{formatINR(l.taxable)}</td>
                    <td className="px-3 py-1.5 text-right tnum text-muted-foreground">
                      {supplyType === "intra" ? (
                        <span className="text-[11px] leading-tight block">{formatINR(l.cgst)}<br /><span className="text-muted-foreground/70">+{formatINR(l.sgst)}</span></span>
                      ) : formatINR(l.igst)}
                    </td>
                    <td className="px-3 py-1.5 text-right tnum font-semibold">{formatINR(l.total)}</td>
                    <td className="px-1 py-1.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive" onClick={() => removeLine(i)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals */}
        {lines.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-4 p-4 bg-muted/20 border-t border-border/50">
            <div className="space-y-2 order-2 sm:order-1">
              <div className="space-y-1.5">
                <Label className="text-[11.5px] font-semibold text-muted-foreground">NOTES</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="text-[12px] resize-none" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11.5px] font-semibold text-muted-foreground">TERMS & CONDITIONS</Label>
                <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={2} className="text-[12px] resize-none" />
              </div>
            </div>
            <div className="order-1 sm:order-2">
              <div className="rounded-xl bg-card border border-border/60 p-4 space-y-2 ml-auto max-w-sm">
                <TotalRow label="Subtotal" value={formatINR(totals.subtotal)} />
                {totals.discountTotal > 0 && <TotalRow label="Discount" value={`- ${formatINR(totals.discountTotal)}`} tone="muted" />}
                <TotalRow label="Taxable Value" value={formatINR(totals.taxableValue)} />
                {supplyType === "intra" ? (
                  <>
                    <TotalRow label="CGST" value={formatINR(totals.cgstTotal)} tone="muted" />
                    <TotalRow label="SGST" value={formatINR(totals.sgstTotal)} tone="muted" />
                  </>
                ) : (
                  <TotalRow label="IGST" value={formatINR(totals.igstTotal)} tone="muted" />
                )}
                {totals.roundOff !== 0 && <TotalRow label="Round Off" value={`${totals.roundOff > 0 ? "+" : ""}${formatINR(totals.roundOff)}`} tone="muted" />}
                <div className="border-t border-border/60 pt-2 mt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold">Grand Total</span>
                    <span className="text-[19px] font-bold tnum text-primary">{formatINR(totals.grandTotal)}</span>
                  </div>
                  <p className="text-[10.5px] text-muted-foreground mt-1 italic">{amountInWords(totals.grandTotal)}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border border-border/50 bg-card shadow-card", className)}>{children}</div>;
}

function TotalRow({ label, value, tone }: { label: string; value: string; tone?: "muted" }) {
  return (
    <div className="flex items-center justify-between text-[12.5px]">
      <span className={cn(tone === "muted" ? "text-muted-foreground" : "text-foreground/80")}>{label}</span>
      <span className={cn("tnum font-medium", tone === "muted" ? "text-muted-foreground" : "text-foreground")}>{value}</span>
    </div>
  );
}
