"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatINR, formatDateShort, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Plus, Search, Users, UserPlus, IndianRupee, Phone, MapPin, Mail,
  Pencil, TrendingUp, TrendingDown, Wallet, UserCheck, Building2, X,
} from "lucide-react";
import { INDIAN_STATES, stateCodeFromGstin, isValidGstin } from "@/lib/gst";
import { useAppStore } from "@/lib/store";

interface Party {
  id: string; type: string; name: string; companyName?: string; gstin?: string;
  pan?: string; phone?: string; email?: string; whatsapp?: string;
  addressLine1?: string; city?: string; state?: string; stateCode?: string;
  pincode?: string; openingBalance: number; creditLimit: number; creditDays: number;
  isBlacklisted: boolean; tags?: string; createdAt: string; outstanding: number;
}

export function PartiesView() {
  const { viewParams } = useAppStore();
  const queryClient = useQueryClient();
  const [tab, setTab] = React.useState<"customer" | "supplier" | "all">("customer");
  const [search, setSearch] = React.useState("");
  const [editParty, setEditParty] = React.useState<Party | null>(null);
  const [formOpen, setFormOpen] = React.useState(!!(viewParams.action === "new"));

  const { data, isLoading } = useQuery<{ items: Party[] }>({
    queryKey: ["parties", search, tab],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (tab !== "all") params.set("type", tab);
      return api(`/api/parties?${params}`);
    },
  });

  const parties = data?.items ?? [];
  const customers = parties.filter((p) => p.type === "customer" || p.type === "both");
  const suppliers = parties.filter((p) => p.type === "supplier" || p.type === "both");
  const totalReceivable = parties.filter((p) => p.type !== "supplier").reduce((s, p) => s + Math.max(0, p.outstanding), 0);
  const totalPayable = parties.filter((p) => p.type !== "customer").reduce((s, p) => s + Math.max(0, -p.outstanding), 0);

  const closeForm = () => { setFormOpen(false); setEditParty(null); };
  const onSaved = () => { queryClient.invalidateQueries({ queryKey: ["parties"] }); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); closeForm(); };

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-5" data-testid="parties-view">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-[22px] font-bold tracking-tight">Parties</h1>
          <p className="text-[12.5px] text-muted-foreground mt-0.5">Customers & suppliers with live outstanding balances</p>
        </div>
        <Button onClick={() => { setEditParty(null); setFormOpen(true); }} className="gap-1.5 h-9 bg-primary hover:bg-primary/90" data-testid="add-party-btn">
          <UserPlus className="w-4 h-4" /> Add Party
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={UserCheck} label="Customers" value={String(customers.length)} accent="primary" />
        <StatCard icon={Building2} label="Suppliers" value={String(suppliers.length)} accent="purple" />
        <StatCard icon={TrendingUp} label="Receivable" value={formatINR(totalReceivable)} accent="emerald" />
        <StatCard icon={TrendingDown} label="Payable" value={formatINR(totalPayable)} accent="amber" />
      </div>

      {/* Filters */}
      <Card className="p-3 flex flex-wrap items-center gap-2 shadow-card border-border/50">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, phone or GSTIN…" className="pl-9 h-9 bg-background" data-testid="party-search" />
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="bg-muted/60">
            <TabsTrigger value="customer" className="text-[12px]">Customers</TabsTrigger>
            <TabsTrigger value="supplier" className="text-[12px]">Suppliers</TabsTrigger>
            <TabsTrigger value="all" className="text-[12px]">All</TabsTrigger>
          </TabsList>
        </Tabs>
      </Card>

      {/* List */}
      <Card className="shadow-card border-border/50 overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
        ) : parties.length === 0 ? (
          <div className="py-20 text-center">
            <div className="grid place-items-center w-14 h-14 rounded-2xl bg-muted mx-auto mb-4"><Users className="w-6 h-6 text-muted-foreground" /></div>
            <p className="text-[14px] font-semibold">No parties found</p>
            <p className="text-[12.5px] text-muted-foreground mt-1">Add a customer or supplier to start tracking</p>
            <Button onClick={() => { setEditParty(null); setFormOpen(true); }} className="mt-4 gap-1.5 bg-primary hover:bg-primary/90"><Plus className="w-4 h-4" /> Add Party</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border/50 bg-muted/20">
                  <th className="text-left font-semibold px-4 py-2.5">Name</th>
                  <th className="text-left font-semibold px-2 py-2.5 hidden sm:table-cell">Contact</th>
                  <th className="text-left font-semibold px-2 py-2.5 hidden lg:table-cell">GSTIN</th>
                  <th className="text-right font-semibold px-2 py-2.5">Outstanding</th>
                  <th className="text-right font-semibold px-4 py-2.5 hidden sm:table-cell">Credit Limit</th>
                  <th className="text-right font-semibold px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {parties.map((p, i) => (
                  <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.02, 0.3) }} className="border-b border-border/30 hover:bg-muted/30 group" data-testid={`party-row-${p.id}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9 rounded-lg border border-border/50"><AvatarFallback className={cn("rounded-lg text-[11px] font-semibold", p.type === "supplier" ? "bg-purple-500/15 text-purple-600" : "bg-primary/10 text-primary")}>{initials(p.name)}</AvatarFallback></Avatar>
                        <div className="min-w-0">
                          <div className="font-medium truncate max-w-[180px]">{p.name}</div>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[9.5px] capitalize h-4">{p.type}</Badge>
                            {p.city && <span className="text-[11px] text-muted-foreground">{p.city}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-3 hidden sm:table-cell">
                      {p.phone ? <div className="text-[12px] text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{p.phone}</div> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-2 py-3 hidden lg:table-cell">{p.gstin ? <span className="font-mono text-[11.5px] text-muted-foreground">{p.gstin}</span> : <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-2 py-3 text-right">
                      {p.outstanding > 0 ? <span className="text-amber-600 font-semibold tnum">{formatINR(p.outstanding)}</span> : p.outstanding < 0 ? <span className="text-emerald-600 font-medium tnum">{formatINR(-p.outstanding)} cr</span> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right tnum text-muted-foreground hidden sm:table-cell">{p.creditLimit > 0 ? formatINR(p.creditLimit) : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary" onClick={() => { setEditParty(p); setFormOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <PartyFormDialog open={formOpen} onOpenChange={(o) => { if (!o) closeForm(); }} party={editParty} onSaved={onSaved} />
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

function PartyFormDialog({ open, onOpenChange, party, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; party: Party | null; onSaved: () => void }) {
  const isEdit = !!party;
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<any>({});

  React.useEffect(() => {
    if (open) {
      setForm(party ? { ...party } : {
        type: "customer", name: "", companyName: "", gstin: "", pan: "", phone: "", email: "",
        whatsapp: "", addressLine1: "", city: "", state: "Maharashtra", stateCode: "27", pincode: "",
        openingBalance: 0, creditLimit: 0, creditDays: 30, tags: "",
      });
    }
  }, [open, party]);

  const upd = (k: string, v: unknown) => setForm((f: any) => ({ ...f, [k]: v }));
  const gstinValid = !form.gstin || isValidGstin(form.gstin);

  const save = async () => {
    if (!form.name?.trim()) { toast.error("Name is required"); return; }
    if (!gstinValid) { toast.error("Invalid GSTIN format"); return; }
    setSaving(true);
    try {
      const payload = { ...form, stateCode: form.stateCode || stateCodeFromGstin(form.gstin) || "27" };
      if (isEdit && party) {
        await api("/api/parties", { method: "PATCH", body: JSON.stringify({ id: party.id, ...payload }) });
        toast.success("Party updated");
      } else {
        await api("/api/parties", { method: "POST", body: JSON.stringify(payload) });
        toast.success("Party added");
      }
      onSaved();
    } catch (e: any) { toast.error(e?.message || "Failed"); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Party" : "Add New Party"}</DialogTitle><DialogDescription>{isEdit ? "Update party details." : "Add a customer, supplier or both."}</DialogDescription></DialogHeader>
        <div className="grid sm:grid-cols-2 gap-3 py-2">
          <Field label="Party Type" required>
            <Select value={form.type || "customer"} onValueChange={(v) => upd("type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="supplier">Supplier</SelectItem>
                <SelectItem value="both">Both (Customer & Supplier)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Name" required><Input value={form.name || ""} onChange={(e) => upd("name", e.target.value)} placeholder="Party name" /></Field>
          <Field label="Company Name"><Input value={form.companyName || ""} onChange={(e) => upd("companyName", e.target.value)} placeholder="Legal entity name" /></Field>
          <Field label="GSTIN" hint={form.gstin && !gstinValid ? "Invalid GSTIN" : undefined} hintTone={form.gstin && !gstinValid ? "error" : undefined}><Input value={form.gstin || ""} onChange={(e) => upd("gstin", e.target.value.toUpperCase())} placeholder="27ABCDE1234F1Z5" className="uppercase font-mono" maxLength={15} /></Field>
          <Field label="PAN"><Input value={form.pan || ""} onChange={(e) => upd("pan", e.target.value.toUpperCase())} placeholder="ABCDE1234F" className="uppercase font-mono" maxLength={10} /></Field>
          <Field label="Phone"><div className="relative"><Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input value={form.phone || ""} onChange={(e) => upd("phone", e.target.value)} placeholder="98200 11223" className="pl-9" /></div></Field>
          <Field label="Email"><div className="relative"><Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input value={form.email || ""} onChange={(e) => upd("email", e.target.value)} placeholder="party@email.com" className="pl-9" type="email" /></div></Field>
          <Field label="WhatsApp"><Input value={form.whatsapp || ""} onChange={(e) => upd("whatsapp", e.target.value)} placeholder="Same as phone if empty" /></Field>
          <Field label="Address" className="sm:col-span-2"><Textarea value={form.addressLine1 || ""} onChange={(e) => upd("addressLine1", e.target.value)} placeholder="Shop / building, street, area" rows={2} /></Field>
          <Field label="City"><Input value={form.city || ""} onChange={(e) => upd("city", e.target.value)} placeholder="Mumbai" /></Field>
          <Field label="State">
            <Select value={form.state || "Maharashtra"} onValueChange={(v) => { const s = INDIAN_STATES.find((x) => x.name === v); upd("state", v); if (s) upd("stateCode", s.code); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{INDIAN_STATES.map((s) => <SelectItem key={s.code} value={s.name}>{s.name} ({s.code})</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Pincode"><Input value={form.pincode || ""} onChange={(e) => upd("pincode", e.target.value)} placeholder="400703" maxLength={6} /></Field>
          <div className="sm:col-span-2 mt-1"><p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Credit & Balance</p></div>
          <Field label="Opening Balance" hint="Positive = they owe you"><div className="relative"><IndianRupee className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input type="number" value={form.openingBalance || ""} onChange={(e) => upd("openingBalance", Number(e.target.value))} className="pl-8 tnum" /></div></Field>
          <Field label="Credit Limit"><div className="relative"><IndianRupee className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input type="number" value={form.creditLimit || ""} onChange={(e) => upd("creditLimit", Number(e.target.value))} className="pl-8 tnum" /></div></Field>
          <Field label="Credit Days"><Input type="number" value={form.creditDays || ""} onChange={(e) => upd("creditDays", Number(e.target.value))} className="tnum" /></Field>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save} disabled={saving} className="bg-primary hover:bg-primary/90">{saving ? "Saving…" : isEdit ? "Update Party" : "Add Party"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, hint, hintTone, children, className }: { label: string; hint?: string; hintTone?: "error"; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-[11.5px] font-medium text-foreground/80">{label}</Label>
      {children}
      {hint && <p className={cn("text-[11px]", hintTone === "error" ? "text-destructive" : "text-muted-foreground")}>{hint}</p>}
    </div>
  );
}
