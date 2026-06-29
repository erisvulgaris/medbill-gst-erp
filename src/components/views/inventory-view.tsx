"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { formatINR, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Plus, Search, Package, AlertTriangle, PackageX, Boxes, Barcode,
  Pencil, Minus, PlusCircle, Trash2, X, IndianRupee, Scan,
} from "lucide-react";

interface Product {
  id: string; name: string; sku?: string; barcode?: string; hsn?: string;
  categoryId?: string; categoryName?: string; unitId?: string; unitName?: string;
  unitSymbol?: string; taxId?: string; taxRate: number; purchasePrice: number;
  salePrice: number; mrp: number; wholesalePrice: number; minStock: number;
  reorderLevel: number; stock: number; openingStock: number; batchTracked: boolean;
  expiryTracked: boolean; serialTracked: boolean; isActive: boolean; image?: string;
  isLow: boolean; isOut: boolean; stockValue: number;
}
interface Unit { id: string; name: string; symbol?: string }
interface TaxRate { id: string; name: string; rate: number }
interface Category { id: string; name: string }

const STOCK_FILTERS = [
  { id: "all", label: "All" },
  { id: "in", label: "In Stock" },
  { id: "low", label: "Low Stock" },
  { id: "out", label: "Out of Stock" },
];

export function InventoryView() {
  const { viewParams, openView } = useAppStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [stockFilter, setStockFilter] = React.useState("all");
  const [editProduct, setEditProduct] = React.useState<Product | null>(null);
  const [adjustProduct, setAdjustProduct] = React.useState<Product | null>(null);
  const [formOpen, setFormOpen] = React.useState(!!(viewParams.action === "new"));

  const { data, isLoading } = useQuery<{ items: Product[]; units: Unit[]; taxes: TaxRate[]; categories: Category[] }>({
    queryKey: ["products", search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      return api(`/api/products?${params}`);
    },
  });

  const products = data?.items ?? [];
  const units = data?.units ?? [];
  const taxes = data?.taxes ?? [];
  const categories = data?.categories ?? [];

  const filtered = React.useMemo(() => {
    return products.filter((p) => {
      if (category !== "all" && p.categoryId !== category) return false;
      if (stockFilter === "in" && (p.isLow || p.isOut)) return false;
      if (stockFilter === "low" && !p.isLow) return false;
      if (stockFilter === "out" && !p.isOut) return false;
      return true;
    });
  }, [products, category, stockFilter]);

  const totalValue = products.reduce((s, p) => s + p.stockValue, 0);
  const lowCount = products.filter((p) => p.isLow && !p.isOut).length;
  const outCount = products.filter((p) => p.isOut).length;

  const closeForm = () => { setFormOpen(false); setEditProduct(null); };
  const onSaved = () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    closeForm();
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-5" data-testid="inventory-view">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-[22px] font-bold tracking-tight">Inventory & Products</h1>
          <p className="text-[12.5px] text-muted-foreground mt-0.5">Manage stock, prices, barcodes & GST rates</p>
        </div>
        <Button onClick={() => { setEditProduct(null); setFormOpen(true); }} className="gap-1.5 h-9 bg-primary hover:bg-primary/90" data-testid="add-product-btn">
          <Plus className="w-4 h-4" /> Add Product
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Package} label="Total Products" value={String(products.length)} accent="primary" />
        <StatCard icon={Boxes} label="Inventory Value" value={formatINR(totalValue)} accent="emerald" />
        <StatCard icon={AlertTriangle} label="Low Stock" value={String(lowCount)} accent="amber" />
        <StatCard icon={PackageX} label="Out of Stock" value={String(outCount)} accent="red" />
      </div>

      {/* Filters */}
      <Card className="p-3 flex flex-wrap items-center gap-2 shadow-card border-border/50">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, SKU or barcode…" className="pl-9 h-9 bg-background" data-testid="product-search" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/60">
          {STOCK_FILTERS.map((f) => (
            <button key={f.id} onClick={() => setStockFilter(f.id)} className={cn("px-3 h-7 rounded-md text-[12px] font-medium transition-colors", stockFilter === f.id ? "bg-background text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground")}>
              {f.label}
            </button>
          ))}
        </div>
      </Card>

      {/* List */}
      <Card className="shadow-card border-border/50 overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="grid place-items-center w-14 h-14 rounded-2xl bg-muted mx-auto mb-4"><Package className="w-6 h-6 text-muted-foreground" /></div>
            <p className="text-[14px] font-semibold">No products found</p>
            <p className="text-[12.5px] text-muted-foreground mt-1">{search ? "Try a different search" : "Add your first product to start billing"}</p>
            <Button onClick={() => { setEditProduct(null); setFormOpen(true); }} className="mt-4 gap-1.5 bg-primary hover:bg-primary/90"><Plus className="w-4 h-4" /> Add Product</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border/50 bg-muted/20">
                  <th className="text-left font-semibold px-4 py-2.5">Product</th>
                  <th className="text-left font-semibold px-2 py-2.5 hidden md:table-cell">Category</th>
                  <th className="text-left font-semibold px-2 py-2.5 hidden lg:table-cell">HSN / GST</th>
                  <th className="text-right font-semibold px-2 py-2.5">Stock</th>
                  <th className="text-right font-semibold px-2 py-2.5 hidden sm:table-cell">Sale Price</th>
                  <th className="text-right font-semibold px-2 py-2.5 hidden lg:table-cell">Value</th>
                  <th className="text-right font-semibold px-4 py-2.5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}
                    className="border-b border-border/30 hover:bg-muted/30 group"
                    data-testid={`product-row-${p.sku}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={cn("grid place-items-center w-9 h-9 rounded-lg shrink-0", p.isOut ? "bg-red-500/12 text-red-600" : p.isLow ? "bg-amber-500/12 text-amber-600" : "bg-primary/10 text-primary")}>
                          <Package className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate max-w-[220px]">{p.name}</div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                            <span className="font-mono">{p.sku}</span>
                            {p.barcode && <><span>·</span><Barcode className="w-3 h-3" /><span className="font-mono">{p.barcode}</span></>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-3 hidden md:table-cell">{p.categoryName ? <Badge variant="secondary" className="text-[10.5px] font-medium">{p.categoryName}</Badge> : <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-2 py-3 hidden lg:table-cell">
                      <div className="text-[11.5px] text-muted-foreground font-mono">{p.hsn || "—"}</div>
                      <div className="text-[10.5px] text-muted-foreground">GST {p.taxRate}%</div>
                    </td>
                    <td className="px-2 py-3 text-right">
                      <div className={cn("font-semibold tnum", p.isOut ? "text-red-600" : p.isLow ? "text-amber-600" : "text-foreground")}>{formatNumber(p.stock)}</div>
                      <div className="text-[10.5px] text-muted-foreground">{p.unitSymbol || "pc"} · min {p.minStock}</div>
                    </td>
                    <td className="px-2 py-3 text-right tnum font-medium hidden sm:table-cell">{formatINR(p.salePrice)}</td>
                    <td className="px-2 py-3 text-right tnum text-muted-foreground hidden lg:table-cell">{formatINR(p.stockValue)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); setAdjustProduct(p); }} title="Adjust stock">
                          <PlusCircle className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); setEditProduct(p); setFormOpen(true); }} title="Edit">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add/Edit dialog */}
      <ProductFormDialog
        open={formOpen}
        onOpenChange={(o) => { if (!o) closeForm(); }}
        product={editProduct}
        units={units} taxes={taxes} categories={categories}
        onSaved={onSaved}
      />

      {/* Stock adjust dialog */}
      <StockAdjustDialog
        product={adjustProduct}
        onOpenChange={(o) => { if (!o) setAdjustProduct(null); }}
        onSaved={() => { queryClient.invalidateQueries({ queryKey: ["products"] }); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); setAdjustProduct(null); }}
      />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent: "primary" | "emerald" | "amber" | "red" }) {
  const map = {
    primary: "bg-primary/10 text-primary", emerald: "bg-emerald-500/12 text-emerald-600",
    amber: "bg-amber-500/12 text-amber-600", red: "bg-red-500/12 text-red-600",
  }[accent];
  return (
    <Card className="p-4 shadow-card border-border/50">
      <div className={cn("grid place-items-center w-8 h-8 rounded-lg mb-2", map)}><Icon className="w-4 h-4" /></div>
      <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
      <p className="text-[18px] font-bold tnum tracking-tight mt-0.5">{value}</p>
    </Card>
  );
}

function ProductFormDialog({ open, onOpenChange, product, units, taxes, categories, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; product: Product | null;
  units: Unit[]; taxes: TaxRate[]; categories: Category[];
  onSaved: () => void;
}) {
  const isEdit = !!product;
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<any>({});

  React.useEffect(() => {
    if (open) {
      setForm(product ? {
        name: product.name, sku: product.sku || "", barcode: product.barcode || "", hsn: product.hsn || "",
        categoryId: product.categoryId || "", unitId: product.unitId || "", taxId: product.taxId || "",
        taxRate: product.taxRate, purchasePrice: product.purchasePrice, salePrice: product.salePrice,
        mrp: product.mrp, wholesalePrice: product.wholesalePrice, minStock: product.minStock,
        reorderLevel: product.reorderLevel, openingStock: product.openingStock,
        batchTracked: product.batchTracked, expiryTracked: product.expiryTracked, serialTracked: product.serialTracked,
        isActive: product.isActive, description: "",
      } : {
        name: "", sku: "", barcode: "", hsn: "", categoryId: "", unitId: "", taxId: "", taxRate: 18,
        purchasePrice: 0, salePrice: 0, mrp: 0, wholesalePrice: 0, minStock: 0, reorderLevel: 0,
        openingStock: 0, batchTracked: false, expiryTracked: false, serialTracked: false, isActive: true, description: "",
      });
    }
  }, [open, product]);

  const upd = (k: string, v: unknown) => setForm((f: any) => ({ ...f, [k]: v }));

  const stockValue = (Number(form.openingStock) || 0) * (Number(form.salePrice) || 0);

  const save = async () => {
    if (!form.name?.trim()) { toast.error("Product name is required"); return; }
    setSaving(true);
    try {
      if (isEdit && product) {
        await api("/api/products", { method: "PATCH", body: JSON.stringify({ id: product.id, ...form }) });
        toast.success("Product updated");
      } else {
        await api("/api/products", { method: "POST", body: JSON.stringify(form) });
        toast.success("Product added");
      }
      onSaved();
    } catch (e: any) { toast.error(e?.message || "Failed"); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Product" : "Add New Product"}</DialogTitle>
          <DialogDescription>{isEdit ? "Update product details, pricing & stock settings." : "Fill in the details to create a new inventory item."}</DialogDescription>
        </DialogHeader>
        <div className="grid sm:grid-cols-2 gap-3 py-2">
          <Field label="Product Name" required className="sm:col-span-2"><Input value={form.name || ""} onChange={(e) => upd("name", e.target.value)} placeholder="e.g. Aashirvaad Atta 5kg" /></Field>
          <Field label="SKU"><Input value={form.sku || ""} onChange={(e) => upd("sku", e.target.value)} placeholder="Auto-generated if empty" className="font-mono" /></Field>
          <Field label="Barcode"><div className="relative"><Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input value={form.barcode || ""} onChange={(e) => upd("barcode", e.target.value)} placeholder="890..." className="pl-9 font-mono" /></div></Field>
          <Field label="HSN/SAC Code"><Input value={form.hsn || ""} onChange={(e) => upd("hsn", e.target.value)} placeholder="e.g. 1101" className="font-mono" /></Field>
          <Field label="Category"><Select value={form.categoryId || "none"} onValueChange={(v) => upd("categoryId", v === "none" ? "" : v)}><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent><SelectItem value="none">— None —</SelectItem>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Unit"><Select value={form.unitId || "none"} onValueChange={(v) => upd("unitId", v === "none" ? "" : v)}><SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger><SelectContent><SelectItem value="none">— None —</SelectItem>{units.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}{u.symbol ? ` (${u.symbol})` : ""}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="GST Tax Rate"><Select value={form.taxId || "none"} onValueChange={(v) => { const t = taxes.find((x) => x.id === v); upd("taxId", v === "none" ? "" : v); if (t) upd("taxRate", t.rate); }}><SelectTrigger><SelectValue placeholder="Select tax rate" /></SelectTrigger><SelectContent><SelectItem value="none">— None (0%) —</SelectItem>{taxes.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></Field>
          <div className="sm:col-span-2 mt-1"><p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pricing</p></div>
          <Field label="Purchase Price"><MoneyInput value={form.purchasePrice} onChange={(v) => upd("purchasePrice", v)} /></Field>
          <Field label="Sale Price"><MoneyInput value={form.salePrice} onChange={(v) => upd("salePrice", v)} /></Field>
          <Field label="MRP"><MoneyInput value={form.mrp} onChange={(v) => upd("mrp", v)} /></Field>
          <Field label="Wholesale Price"><MoneyInput value={form.wholesalePrice} onChange={(v) => upd("wholesalePrice", v)} /></Field>
          <div className="sm:col-span-2 mt-1"><p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Stock</p></div>
          <Field label="Opening Stock"><Input type="number" value={form.openingStock || ""} onChange={(e) => upd("openingStock", Number(e.target.value))} placeholder="0" className="tnum" /></Field>
          <Field label="Min Stock (reorder level)"><Input type="number" value={form.minStock || ""} onChange={(e) => upd("minStock", Number(e.target.value))} placeholder="0" className="tnum" /></Field>
          <div className="sm:col-span-2 rounded-lg bg-primary/8 border border-primary/20 px-3 py-2 flex items-center justify-between">
            <span className="text-[12px] text-muted-foreground">Stock value at sale price</span>
            <span className="font-bold tnum text-primary">{formatINR(stockValue)}</span>
          </div>
          <div className="sm:col-span-2 mt-1"><p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tracking</p></div>
          <ToggleRow label="Batch Tracking" desc="Track stock by batch number" checked={!!form.batchTracked} onChange={(v) => upd("batchTracked", v)} />
          <ToggleRow label="Expiry Tracking" desc="Track expiry dates (FIFO)" checked={!!form.expiryTracked} onChange={(v) => upd("expiryTracked", v)} />
          <ToggleRow label="Serial Tracking" desc="Track serial/IMEI numbers" checked={!!form.serialTracked} onChange={(v) => upd("serialTracked", v)} />
          <ToggleRow label="Active" desc="Available for billing" checked={!!form.isActive} onChange={(v) => upd("isActive", v)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-primary hover:bg-primary/90 gap-1.5">{saving ? "Saving…" : isEdit ? "Update Product" : "Add Product"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StockAdjustDialog({ product, onOpenChange, onSaved }: { product: Product | null; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const [mode, setMode] = React.useState<"in" | "out">("in");
  const [qty, setQty] = React.useState(1);
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => { if (product) { setMode("in"); setQty(1); setNote(""); } }, [product]);

  if (!product) return null;
  const newStock = mode === "in" ? product.stock + qty : Math.max(0, product.stock - qty);

  const save = async () => {
    if (qty <= 0) { toast.error("Quantity must be positive"); return; }
    setSaving(true);
    try {
      await api("/api/products", { method: "PATCH", body: JSON.stringify({ id: product.id, stock: newStock }) });
      toast.success(`Stock ${mode === "in" ? "added" : "removed"}`);
      onSaved();
    } catch (e: any) { toast.error(e?.message || "Failed"); } finally { setSaving(false); }
  };

  return (
    <Dialog open={!!product} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Adjust Stock</DialogTitle><DialogDescription>{product.name}</DialogDescription></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/40 p-1">
            <div className="text-center py-2"><p className="text-[10.5px] text-muted-foreground">Current</p><p className="font-bold tnum">{formatNumber(product.stock)}</p></div>
            <div className="text-center py-2 border-x border-border/40"><p className="text-[10.5px] text-muted-foreground">Adjust</p><p className={cn("font-bold tnum", mode === "in" ? "text-emerald-600" : "text-red-600")}>{mode === "in" ? "+" : "−"}{qty}</p></div>
            <div className="text-center py-2"><p className="text-[10.5px] text-muted-foreground">New</p><p className="font-bold tnum text-primary">{formatNumber(newStock)}</p></div>
          </div>
          <div className="flex gap-2">
            <Button variant={mode === "in" ? "default" : "outline"} className={cn("flex-1 gap-1.5", mode === "in" && "bg-emerald-600 hover:bg-emerald-700")} onClick={() => setMode("in")}><PlusCircle className="w-4 h-4" /> Stock In</Button>
            <Button variant={mode === "out" ? "default" : "outline"} className={cn("flex-1 gap-1.5", mode === "out" && "bg-red-600 hover:bg-red-700")} onClick={() => setMode("out")}><Minus className="w-4 h-4" /> Stock Out</Button>
          </div>
          <Field label="Quantity"><Input type="number" value={qty} onChange={(e) => setQty(Math.max(0, Number(e.target.value)))} className="tnum" autoFocus /></Field>
          <Field label="Note (optional)"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Damaged, new purchase, correction…" /></Field>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save} disabled={saving} className="bg-primary hover:bg-primary/90">{saving ? "Saving…" : "Confirm Adjustment"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, required, children, className }: { label: string; required?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-[11.5px] font-medium text-foreground/80">{label}{required && <span className="text-destructive"> *</span>}</Label>
      {children}
    </div>
  );
}
function MoneyInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="relative">
      <IndianRupee className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <Input type="number" value={value || ""} onChange={(e) => onChange(Number(e.target.value))} className="pl-8 tnum" placeholder="0.00" />
    </div>
  );
}
function ToggleRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2">
      <div><div className="text-[12.5px] font-medium">{label}</div><div className="text-[11px] text-muted-foreground">{desc}</div></div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
