"use client";

import * as React from "react";
import { api } from "@/lib/api";
import { useAppStore, type ModulesConfig } from "@/lib/store";
import { INDIAN_STATES, isValidGstin, stateCodeFromGstin } from "@/lib/gst";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Building2, Landmark, Receipt, Users, Shield, Bell, Database,
  Check, Save, Building, MapPin, Phone, Mail, FileText, Package,
  Boxes, Scan, CalendarClock, Smartphone, Factory, Headset, Globe, type LucideIcon,
} from "lucide-react";

const MODULE_META: { key: keyof ModulesConfig; label: string; icon: LucideIcon; desc: string }[] = [
  { key: "pos", label: "POS Billing", icon: Receipt, desc: "Quick counter sales" },
  { key: "inventory", label: "Inventory", icon: Package, desc: "Stock & godown" },
  { key: "gst", label: "GST Reports", icon: Landmark, desc: "GSTR-1 & HSN" },
  { key: "barcode", label: "Barcode", icon: Scan, desc: "Scan & print" },
  { key: "crm", label: "CRM", icon: Headset, desc: "Leads & follow-ups" },
  { key: "batch", label: "Batch Tracking", icon: Boxes, desc: "Batch-wise stock" },
  { key: "expiry", label: "Expiry Tracking", icon: CalendarClock, desc: "FIFO & expiry" },
  { key: "serial", label: "Serial Tracking", icon: Smartphone, desc: "IMEI / serials" },
  { key: "manufacturing", label: "Manufacturing", icon: Factory, desc: "Production orders" },
  { key: "onlineStore", label: "Online Store", icon: Globe, desc: "Sell online" },
];

const ROLES = [
  { name: "Owner", users: 1, perms: "Full access", color: "emerald" },
  { name: "Manager", users: 2, perms: "Sales, Purchase, Reports", color: "primary" },
  { name: "Cashier", users: 1, perms: "POS & Sales only", color: "amber" },
  { name: "Accountant", users: 1, perms: "Reports & GST", color: "purple" },
];

export function SettingsView() {
  const { business, setBusiness } = useAppStore();
  const [form, setForm] = React.useState<any>({});
  const [modules, setModules] = React.useState<ModulesConfig>(business?.modules || ({} as ModulesConfig));
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (business) {
      setForm({ name: business.name, legalName: business.legalName || "", gstin: business.gstin || "", pan: business.pan || "", email: business.email || "", phone: business.phone || "", addressLine1: business.addressLine1 || "", city: business.city || "", state: business.state || "Maharashtra", stateCode: business.stateCode || "27", pincode: business.pincode || "", invoicePrefix: business.invoicePrefix || "INV", quotationPrefix: business.quotationPrefix || "QT", industry: business.industry, businessType: business.businessType });
      setModules(business.modules);
    }
  }, [business]);

  const upd = (k: string, v: unknown) => setForm((f: any) => ({ ...f, [k]: v }));
  const gstinValid = !form.gstin || isValidGstin(form.gstin);

  const save = async () => {
    if (!gstinValid) { toast.error("Invalid GSTIN"); return; }
    setSaving(true);
    try {
      const res = await api<{ business: any }>("/api/business", { method: "PATCH", body: JSON.stringify({ ...form, stateCode: form.stateCode || stateCodeFromGstin(form.gstin) || "27", modules }) });
      setBusiness({ ...res.business, onboarded: true, modules });
      toast.success("Settings saved");
    } catch (e: any) { toast.error(e?.message); } finally { setSaving(false); }
  };

  const reseed = async () => {
    if (!confirm("Reset all demo data? This wipes everything and reseeds.")) return;
    toast.info("Use the reset endpoint via API to clear. (Demo safety)");
  };

  if (!business) return <div className="p-7">No business</div>;

  return (
    <div className="p-4 sm:p-6 max-w-[1100px] mx-auto space-y-5" data-testid="settings-view">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-xl sm:text-[22px] font-bold tracking-tight">Settings</h1><p className="text-[12.5px] text-muted-foreground mt-0.5">Business profile, modules, roles & preferences</p></div>
        <Button onClick={save} disabled={saving} className="gap-1.5 h-9 bg-primary hover:bg-primary/90"><Save className="w-4 h-4" /> {saving ? "Saving…" : "Save Changes"}</Button>
      </div>

      <Tabs defaultValue="business">
        <TabsList className="bg-muted/60 flex-wrap h-auto">
          <TabsTrigger value="business" className="text-[12.5px] gap-1.5"><Building2 className="w-3.5 h-3.5" /> Business</TabsTrigger>
          <TabsTrigger value="modules" className="text-[12.5px] gap-1.5"><Boxes className="w-3.5 h-3.5" /> Modules</TabsTrigger>
          <TabsTrigger value="roles" className="text-[12.5px] gap-1.5"><Users className="w-3.5 h-3.5" /> Roles</TabsTrigger>
          <TabsTrigger value="security" className="text-[12.5px] gap-1.5"><Shield className="w-3.5 h-3.5" /> Security</TabsTrigger>
          <TabsTrigger value="data" className="text-[12.5px] gap-1.5"><Database className="w-3.5 h-3.5" /> Data</TabsTrigger>
        </TabsList>

        {/* Business profile */}
        <TabsContent value="business" className="space-y-4">
          <Card className="p-5 shadow-card border-border/50">
            <div className="flex items-center gap-2 mb-4"><Building className="w-5 h-5 text-primary" /><h2 className="text-[15px] font-semibold">Business Profile</h2></div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Business Name" required><Input value={form.name || ""} onChange={(e) => upd("name", e.target.value)} /></Field>
              <Field label="Legal Name"><Input value={form.legalName || ""} onChange={(e) => upd("legalName", e.target.value)} /></Field>
              <Field label="GSTIN" hint={form.gstin && !gstinValid ? "Invalid GSTIN" : undefined} hintTone={form.gstin && !gstinValid ? "error" : undefined}><Input value={form.gstin || ""} onChange={(e) => upd("gstin", e.target.value.toUpperCase())} className="uppercase font-mono" maxLength={15} /></Field>
              <Field label="PAN"><Input value={form.pan || ""} onChange={(e) => upd("pan", e.target.value.toUpperCase())} className="uppercase font-mono" maxLength={10} /></Field>
              <Field label="Industry"><Select value={form.industry || "retail"} onValueChange={(v) => upd("industry", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[["retail","Retail"],["wholesale","Wholesale"],["manufacturer","Manufacturer"],["medical","Medical"],["restaurant","Restaurant"],["salon","Salon"],["service","Service"],["electronics","Electronics"],["grocery","Grocery"],["garments","Garments"],["automobile","Automobile"],["jewellery","Jewellery"]].map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Business Type"><Select value={form.businessType || "proprietorship"} onValueChange={(v) => upd("businessType", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[["proprietorship","Proprietorship"],["partnership","Partnership"],["pvt_ltd","Private Limited"],["llp","LLP"],["huf","HUF"]].map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></Field>
            </div>
          </Card>
          <Card className="p-5 shadow-card border-border/50">
            <div className="flex items-center gap-2 mb-4"><MapPin className="w-5 h-5 text-primary" /><h2 className="text-[15px] font-semibold">Address</h2></div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Address Line" className="sm:col-span-2"><Textarea value={form.addressLine1 || ""} onChange={(e) => upd("addressLine1", e.target.value)} rows={2} /></Field>
              <Field label="City"><Input value={form.city || ""} onChange={(e) => upd("city", e.target.value)} /></Field>
              <Field label="State"><Select value={form.state || "Maharashtra"} onValueChange={(v) => { upd("state", v); const s = INDIAN_STATES.find((x) => x.name === v); if (s) upd("stateCode", s.code); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{INDIAN_STATES.map((s) => <SelectItem key={s.code} value={s.name}>{s.name} ({s.code})</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Pincode"><Input value={form.pincode || ""} onChange={(e) => upd("pincode", e.target.value)} maxLength={6} /></Field>
            </div>
          </Card>
          <Card className="p-5 shadow-card border-border/50">
            <div className="flex items-center gap-2 mb-4"><FileText className="w-5 h-5 text-primary" /><h2 className="text-[15px] font-semibold">Contact & Invoicing</h2></div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Phone"><Input value={form.phone || ""} onChange={(e) => upd("phone", e.target.value)} /></Field>
              <Field label="Email"><Input value={form.email || ""} onChange={(e) => upd("email", e.target.value)} type="email" /></Field>
              <Field label="Invoice Prefix"><Input value={form.invoicePrefix || ""} onChange={(e) => upd("invoicePrefix", e.target.value)} className="font-mono uppercase" /></Field>
              <Field label="Quotation Prefix"><Input value={form.quotationPrefix || ""} onChange={(e) => upd("quotationPrefix", e.target.value)} className="font-mono uppercase" /></Field>
            </div>
          </Card>
        </TabsContent>

        {/* Modules */}
        <TabsContent value="modules">
          <Card className="p-5 shadow-card border-border/50">
            <div className="flex items-center gap-2 mb-1"><Boxes className="w-5 h-5 text-primary" /><h2 className="text-[15px] font-semibold">Modules & Features</h2></div>
            <p className="text-[12px] text-muted-foreground mb-4">Toggle modules on/off. Disabled modules hide from navigation.</p>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {MODULE_META.map((m) => {
                const Icon = m.icon; const on = !!modules[m.key];
                return (
                  <div key={m.key} className={cn("flex items-center gap-3 p-3 rounded-xl border transition-colors", on ? "border-primary/40 bg-primary/5" : "border-border")}>
                    <div className={cn("grid place-items-center w-9 h-9 rounded-lg shrink-0", on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}><Icon className="w-[18px] h-[18px]" /></div>
                    <div className="flex-1 min-w-0"><div className="text-[13px] font-semibold">{m.label}</div><div className="text-[11px] text-muted-foreground">{m.desc}</div></div>
                    <Switch checked={on} onCheckedChange={(v) => setModules((s) => ({ ...s, [m.key]: v }))} />
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex justify-end"><Button onClick={save} disabled={saving} className="bg-primary hover:bg-primary/90 gap-1.5"><Save className="w-4 h-4" /> {saving ? "Saving…" : "Save Modules"}</Button></div>
          </Card>
        </TabsContent>

        {/* Roles */}
        <TabsContent value="roles">
          <Card className="p-5 shadow-card border-border/50">
            <div className="flex items-center gap-2 mb-1"><Users className="w-5 h-5 text-primary" /><h2 className="text-[15px] font-semibold">User Roles & Permissions</h2></div>
            <p className="text-[12px] text-muted-foreground mb-4">Manage team members and their access levels.</p>
            <div className="space-y-2.5">
              {ROLES.map((r) => (
                <div key={r.name} className="flex items-center gap-3 p-3.5 rounded-xl border border-border/50 hover:bg-muted/30">
                  <div className={cn("grid place-items-center w-10 h-10 rounded-lg shrink-0", r.color === "emerald" && "bg-emerald-500/12 text-emerald-600", r.color === "primary" && "bg-primary/10 text-primary", r.color === "amber" && "bg-amber-500/12 text-amber-600", r.color === "purple" && "bg-purple-500/12 text-purple-600")}><Users className="w-5 h-5" /></div>
                  <div className="flex-1"><div className="flex items-center gap-2"><span className="text-[14px] font-semibold">{r.name}</span><Badge variant="secondary" className="text-[10px]">{r.users} {r.users === 1 ? "user" : "users"}</Badge></div><div className="text-[11.5px] text-muted-foreground mt-0.5">{r.perms}</div></div>
                  <Button variant="outline" size="sm" className="h-8 text-[11.5px]">Manage</Button>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl bg-primary/8 border border-primary/20 p-4 flex items-start gap-3"><Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" /><div className="text-[12px]"><p className="font-semibold text-foreground">Permission matrix</p><p className="text-muted-foreground mt-0.5">Create, Read, Update, Delete, Export, Approve, Print — assignable per role per module. (Full RBAC available in Pro)</p></div></div>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security">
          <Card className="p-5 shadow-card border-border/50 space-y-4">
            <div className="flex items-center gap-2 mb-1"><Shield className="w-5 h-5 text-primary" /><h2 className="text-[15px] font-semibold">Security & Sessions</h2></div>
            <Row icon={Phone} title="Phone OTP" desc="Login via SMS OTP" badge="Enabled" />
            <Row icon={Mail} title="Email OTP" desc="Login via email OTP" badge="Enabled" />
            <Row icon={Check} title="Google Login" desc="OAuth sign-in" badge="Enabled" />
            <Row icon={Shield} title="Two-Factor Auth" desc="Extra security for owner" badge="Recommended" badgeTone="amber" />
            <Row icon={Smartphone} title="Device Management" desc="1 active device" badge="View" />
          </Card>
        </TabsContent>

        {/* Data */}
        <TabsContent value="data">
          <Card className="p-5 shadow-card border-border/50 space-y-3">
            <div className="flex items-center gap-2 mb-1"><Database className="w-5 h-5 text-primary" /><h2 className="text-[15px] font-semibold">Backup & Data</h2></div>
            <DataRow title="Export Data" desc="Download all data as JSON" action="Export" />
            <DataRow title="Backup Database" desc="Create a snapshot backup" action="Backup" />
            <DataRow title="Restore from Backup" desc="Upload a backup file" action="Restore" />
            <DataRow title="Import from Excel/CSV" desc="Bulk import parties & products" action="Import" />
            <div className="pt-3 border-t border-border/40">
              <DataRow title="Reset Demo Data" desc="Wipe & reseed sample business" action="Reset" danger onClick={reseed} />
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, required, hint, hintTone, children, className }: { label: string; required?: boolean; hint?: string; hintTone?: "error"; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-[11.5px] font-medium text-foreground/80">{label}{required && <span className="text-destructive"> *</span>}</Label>
      {children}
      {hint && <p className={cn("text-[11px]", hintTone === "error" ? "text-destructive" : "text-muted-foreground")}>{hint}</p>}
    </div>
  );
}
function Row({ icon: Icon, title, desc, badge, badgeTone }: { icon: LucideIcon; title: string; desc: string; badge: string; badgeTone?: "amber" }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border/50">
      <div className="grid place-items-center w-9 h-9 rounded-lg bg-muted text-muted-foreground"><Icon className="w-4 h-4" /></div>
      <div className="flex-1"><div className="text-[13px] font-semibold">{title}</div><div className="text-[11.5px] text-muted-foreground">{desc}</div></div>
      <Badge variant="secondary" className={cn("text-[10.5px]", badgeTone === "amber" && "bg-amber-500/15 text-amber-700")}>{badge}</Badge>
    </div>
  );
}
function DataRow({ title, desc, action, danger, onClick }: { title: string; desc: string; action: string; danger?: boolean; onClick?: () => void }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border/50">
      <div className={cn("grid place-items-center w-9 h-9 rounded-lg", danger ? "bg-red-500/12 text-red-600" : "bg-muted text-muted-foreground")}><Database className="w-4 h-4" /></div>
      <div className="flex-1"><div className={cn("text-[13px] font-semibold", danger && "text-red-600")}>{title}</div><div className="text-[11.5px] text-muted-foreground">{desc}</div></div>
      <Button variant={danger ? "outline" : "default"} size="sm" className={cn("h-8 text-[11.5px]", danger && "text-red-600 hover:text-red-700 border-red-500/30")} onClick={onClick}>{action}</Button>
    </div>
  );
}
