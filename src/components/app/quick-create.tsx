"use client";

import * as React from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UserPlus, PackagePlus, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * QuickCreate — inline forms to create customers/suppliers/products on the fly.
 * Used inside pickers in invoice editor, quotation editor, purchase form, POS.
 *
 * See: docs/06_COMPONENT_LIBRARY.md
 */

// ─────────────────────────────────────────────
// Quick Create Customer
// ─────────────────────────────────────────────

interface QuickCustomer {
  id: string; name: string; phone?: string | null; gstin?: string | null;
  state?: string | null; stateCode?: string | null; type?: string;
}

export function QuickCreateCustomer({
  type = "customer",
  onCreated,
}: {
  type?: "customer" | "supplier";
  onCreated: (party: QuickCustomer) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [gstin, setGstin] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const result = await api<{ party: QuickCustomer }>("/api/parties", {
        method: "POST",
        body: JSON.stringify({ type, name: name.trim(), phone: phone || undefined, gstin: gstin || undefined }),
      });
      toast.success(`${type === "customer" ? "Customer" : "Supplier"} "${name.trim()}" created`);
      onCreated(result.party);
      setOpen(false);
      setName(""); setPhone(""); setGstin("");
    } catch (e: any) {
      toast.error(e?.message || "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full p-2.5 rounded-lg hover:bg-primary/5 text-primary transition-colors text-[12.5px] font-medium border-t border-border/40 mt-1"
      >
        <UserPlus className="w-4 h-4" />
        Create New {type === "customer" ? "Customer" : "Supplier"}
      </button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className="p-3 border-t border-border/40 space-y-2 bg-muted/30"
      >
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold text-primary">New {type === "customer" ? "Customer" : "Supplier"}</span>
          <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
        </div>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name *" className="h-8 text-[12.5px]" autoFocus onKeyDown={(e) => e.key === "Enter" && save()} />
        <div className="flex gap-2">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="h-8 text-[12.5px] flex-1" />
          <Input value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} placeholder="GSTIN" className="h-8 text-[12.5px] flex-1 font-mono uppercase" maxLength={15} />
        </div>
        <Button size="sm" onClick={save} disabled={saving || !name.trim()} className="w-full h-8 gap-1.5 bg-primary hover:bg-primary/90 text-[12px]">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
          {saving ? "Creating..." : `Create ${type === "customer" ? "Customer" : "Supplier"}`}
        </Button>
      </motion.div>
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────
// Quick Create Product
// ─────────────────────────────────────────────

interface QuickProduct {
  id: string; name: string; sku?: string | null; barcode?: string | null;
  hsn?: string | null; unitName?: string | null; unitSymbol?: string | null;
  taxRate: number; salePrice: number; stock: number; mrp?: number;
}

export function QuickCreateProduct({
  onCreated,
}: {
  onCreated: (product: QuickProduct) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [taxRate, setTaxRate] = React.useState("18");
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    if (!name.trim()) { toast.error("Product name is required"); return; }
    setSaving(true);
    try {
      const result = await api<{ product: QuickProduct }>("/api/products", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          salePrice: Number(price) || 0,
          purchasePrice: Number(price) || 0,
          taxRate: Number(taxRate) || 0,
          openingStock: 0,
        }),
      });
      toast.success(`Product "${name.trim()}" created`);
      onCreated(result.product);
      setOpen(false);
      setName(""); setPrice(""); setTaxRate("18");
    } catch (e: any) {
      toast.error(e?.message || "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full p-2.5 rounded-lg hover:bg-primary/5 text-primary transition-colors text-[12.5px] font-medium border-t border-border/40 mt-1"
      >
        <PackagePlus className="w-4 h-4" />
        Create New Product
      </button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className="p-3 border-t border-border/40 space-y-2 bg-muted/30"
      >
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold text-primary">New Product</span>
          <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
        </div>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name *" className="h-8 text-[12.5px]" autoFocus onKeyDown={(e) => e.key === "Enter" && save()} />
        <div className="flex gap-2">
          <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Sale price" className="h-8 text-[12.5px] flex-1" />
          <select value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-[12px]">
            {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}% GST</option>)}
          </select>
        </div>
        <Button size="sm" onClick={save} disabled={saving || !name.trim()} className="w-full h-8 gap-1.5 bg-primary hover:bg-primary/90 text-[12px]">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <PackagePlus className="w-3 h-3" />}
          {saving ? "Creating..." : "Create Product"}
        </Button>
      </motion.div>
    </AnimatePresence>
  );
}
