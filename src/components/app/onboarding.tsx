"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore, DEFAULT_MODULES, type ModulesConfig } from "@/lib/store";
import { api } from "@/lib/api";
import { INDIAN_STATES } from "@/lib/gst";
import { stateCodeFromGstin, isValidGstin } from "@/lib/gst";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Store, Building2, Receipt, Package, Users, Wrench, Stethoscope, UtensilsCrossed,
  Scissors, Headset, Factory, Pill, ShoppingCart, Car, Smartphone, Shirt, Gem,
  Check, ArrowRight, ArrowLeft, Sparkles, Scan, Landmark, CalendarClock, Boxes,
  Globe, type LucideIcon,
} from "lucide-react";
import { INDUSTRY_LIST, getIndustryModules, getIndustryProfile } from "@/lib/industry-profiles";

// Use the Industry Profile Engine instead of hardcoded list.
// Adding a new industry = adding one entry to INDUSTRY_PROFILES in src/lib/industry-profiles.ts
// No changes needed here (Open-Closed Principle).
const INDUSTRIES = INDUSTRY_LIST.map(p => ({ id: p.id, label: p.label, icon: p.icon, desc: p.description }));;

const BUSINESS_TYPES = [
  { id: "proprietorship", label: "Proprietorship" },
  { id: "partnership", label: "Partnership" },
  { id: "pvt_ltd", label: "Private Limited" },
  { id: "llp", label: "LLP" },
  { id: "huf", label: "HUF" },
  { id: "trust", label: "Trust / Society" },
];

const MODULES: { key: keyof ModulesConfig; label: string; icon: LucideIcon; desc: string }[] = [
  { key: "pos", label: "POS Billing", icon: Receipt, desc: "Quick counter sales" },
  { key: "inventory", label: "Inventory", icon: Package, desc: "Stock & godown" },
  { key: "gst", label: "GST Reports", icon: Landmark, desc: "GSTR-1 & HSN" },
  { key: "barcode", label: "Barcode", icon: Scan, desc: "Scan & print" },
  { key: "crm", label: "CRM", icon: Users, desc: "Follow-ups & leads" },
  { key: "batch", label: "Batch Tracking", icon: Boxes, desc: "Batch-wise stock" },
  { key: "expiry", label: "Expiry Tracking", icon: CalendarClock, desc: "FIFO & expiry alerts" },
  { key: "serial", label: "Serial Tracking", icon: Smartphone, desc: "IMEI / serial numbers" },
  { key: "manufacturing", label: "Manufacturing", icon: Factory, desc: "Production orders" },
  { key: "payroll", label: "Payroll", icon: Users, desc: "Staff salary" },
  { key: "onlineStore", label: "Online Store", icon: Globe, desc: "Sell online" },
];

// Industry presets are now sourced from the Industry Profile Engine.
// See: src/lib/industry-profiles.ts, docs/01_PRD.md
// The old hardcoded INDUSTRY_PRESET is replaced by getIndustryModules().

const STEPS = ["Business", "Industry", "Modules", "Review"] as const;

export function Onboarding() {
  const { setBusiness, setOnboarded } = useAppStore();
  const [step, setStep] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    legalName: "",
    gstin: "",
    pan: "",
    businessType: "proprietorship",
    industry: "retail",
    email: "",
    phone: "",
    addressLine1: "",
    city: "",
    state: "Maharashtra",
    stateCode: "27",
    pincode: "",
    invoicePrefix: "INV",
    quotationPrefix: "QT",
    storeMode: "single",
    inventoryMode: "inventory_heavy",
    employeeCount: 1,
  });
  const [modules, setModules] = React.useState<ModulesConfig>({ ...DEFAULT_MODULES });

  const update = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const selectIndustry = (id: string) => {
    update("industry", id);
    // Use Industry Profile Engine for module presets
    const preset = getIndustryModules(id);
    setModules(preset);
    const stateMap: Record<string, { state: string; code: string }> = {};
    INDIAN_STATES.forEach((s) => (stateMap[s.name] = { state: s.name, code: s.code }));
  };

  const gstinValid = !form.gstin || isValidGstin(form.gstin);
  const canNext = step === 0
    ? form.name.trim().length > 1 && gstinValid
    : step === 1
    ? !!form.industry
    : true;

  const finish = async () => {
    setSubmitting(true);
    try {
      // If no business exists, seed then patch
      const existing = await api<{ business: any | null }>("/api/business");
      let bizId = existing.business?.id;
      if (!existing.business) {
        const seeded = await api<{ businessId: string }>("/api/seed", { method: "POST" });
        bizId = seeded.businessId;
      }
      const res = await api<{ business: any }>("/api/business", {
        method: "PATCH",
        body: JSON.stringify({
          ...form,
          stateCode: form.stateCode || stateCodeFromGstin(form.gstin) || "27",
          modules,
        }),
      });
      setBusiness({ ...res.business, onboarded: true, modules });
      setOnboarded(true);
      toast.success("Welcome to MedBill! Your business is ready.");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save business");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background grid-bg" data-testid="onboarding">
      {/* Top brand bar */}
      <header className="h-16 flex items-center justify-between px-5 sm:px-8 border-b border-border/40 glass">
        <div className="flex items-center gap-2.5">
          <div className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-glow-emerald">
            <span className="font-bold">M</span>
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-[15px] tracking-tight">MedBill</div>
            <div className="text-[10.5px] text-muted-foreground">GST Billing ERP</div>
          </div>
        </div>
        <div className="text-[12px] text-muted-foreground hidden sm:flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          Set up your business in under a minute
        </div>
      </header>

      <div className="flex-1 flex items-start sm:items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-3xl">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-7">
            {STEPS.map((s, i) => (
              <React.Fragment key={s}>
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all",
                    i === step ? "bg-primary text-primary-foreground shadow-soft" : i < step ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}
                >
                  {i < step ? <Check className="w-3.5 h-3.5" /> : <span className="w-4 grid place-items-center">{i + 1}</span>}
                  <span className="hidden sm:inline">{s}</span>
                </div>
                {i < STEPS.length - 1 && <div className={cn("w-6 sm:w-10 h-px", i < step ? "bg-primary/40" : "bg-border")} />}
              </React.Fragment>
            ))}
          </div>

          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
            className="bg-card rounded-2xl shadow-card border border-border/50 p-5 sm:p-7"
          >
            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.div key="biz" className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">Tell us about your business</h2>
                    <p className="text-[13px] text-muted-foreground mt-1">This appears on your invoices and GST returns.</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Business Name" required className="sm:col-span-2">
                      <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Shree Balaji Traders" data-testid="ob-name" />
                    </Field>
                    <Field label="Legal Name">
                      <Input value={form.legalName} onChange={(e) => update("legalName", e.target.value)} placeholder="Shree Balaji Traders Pvt. Ltd." />
                    </Field>
                    <Field label="Business Type">
                      <select value={form.businessType} onChange={(e) => update("businessType", e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                        {BUSINESS_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                      </select>
                    </Field>
                    <Field label="GSTIN" hint={form.gstin && !gstinValid ? "Invalid GSTIN format" : undefined} hintTone={form.gstin && !gstinValid ? "error" : undefined}>
                      <Input value={form.gstin} onChange={(e) => update("gstin", e.target.value.toUpperCase())} placeholder="27ABCDE1234F1Z5" className="uppercase font-mono" maxLength={15} />
                    </Field>
                    <Field label="PAN">
                      <Input value={form.pan} onChange={(e) => update("pan", e.target.value.toUpperCase())} placeholder="ABCDE1234F" className="uppercase font-mono" maxLength={10} />
                    </Field>
                    <Field label="Phone">
                      <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+91 98200 11223" />
                    </Field>
                    <Field label="Email">
                      <Input value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="accounts@business.in" type="email" />
                    </Field>
                    <Field label="Address" className="sm:col-span-2">
                      <Textarea value={form.addressLine1} onChange={(e) => update("addressLine1", e.target.value)} placeholder="Shop 14, APMC Market, Vashi" rows={2} />
                    </Field>
                    <Field label="City">
                      <Input value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Navi Mumbai" />
                    </Field>
                    <Field label="State">
                      <select
                        value={form.state}
                        onChange={(e) => {
                          const s = INDIAN_STATES.find((x) => x.name === e.target.value);
                          update("state", e.target.value);
                          if (s) update("stateCode", s.code);
                        }}
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        {INDIAN_STATES.map((s) => <option key={s.code} value={s.name}>{s.name} ({s.code})</option>)}
                      </select>
                    </Field>
                    <Field label="Pincode">
                      <Input value={form.pincode} onChange={(e) => update("pincode", e.target.value)} placeholder="400703" maxLength={6} />
                    </Field>
                  </div>
                </motion.div>
              )}

              {step === 1 && (
                <motion.div key="ind" className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">Pick your industry</h2>
                    <p className="text-[13px] text-muted-foreground mt-1">We'll tailor the dashboard, modules & reports automatically.</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {INDUSTRIES.map((ind) => {
                      const Icon = ind.icon;
                      const active = form.industry === ind.id;
                      return (
                        <button
                          key={ind.id}
                          onClick={() => selectIndustry(ind.id)}
                          data-testid={`ob-industry-${ind.id}`}
                          className={cn(
                            "relative flex flex-col items-start gap-2 p-3.5 rounded-xl border text-left transition-all gpu",
                            active ? "border-primary bg-primary/5 shadow-soft" : "border-border hover:border-border hover:bg-muted/40"
                          )}
                        >
                          {active && <span className="absolute top-2.5 right-2.5 grid place-items-center w-4 h-4 rounded-full bg-primary text-primary-foreground"><Check className="w-2.5 h-2.5" /></span>}
                          <div className={cn("grid place-items-center w-9 h-9 rounded-lg", active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                            <Icon className="w-[18px] h-[18px]" />
                          </div>
                          <div>
                            <div className="text-[13px] font-semibold leading-tight">{ind.label}</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{ind.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="mod" className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">Enable modules</h2>
                    <p className="text-[13px] text-muted-foreground mt-1">Based on <span className="font-medium text-foreground">{INDUSTRIES.find(i => i.id === form.industry)?.label}</span>. Toggle what you need.</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2.5">
                    {MODULES.map((m) => {
                      const Icon = m.icon;
                      const on = modules[m.key];
                      return (
                        <button
                          key={m.key}
                          onClick={() => setModules((s) => ({ ...s, [m.key]: !s[m.key] }))}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border text-left transition-all gpu",
                            on ? "border-primary/50 bg-primary/5" : "border-border hover:bg-muted/40"
                          )}
                        >
                          <div className={cn("grid place-items-center w-9 h-9 rounded-lg shrink-0", on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                            <Icon className="w-[18px] h-[18px]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-semibold">{m.label}</div>
                            <div className="text-[11px] text-muted-foreground leading-snug">{m.desc}</div>
                          </div>
                          <div className={cn("w-9 h-5 rounded-full p-0.5 transition-colors shrink-0", on ? "bg-primary" : "bg-muted-foreground/25")}>
                            <motion.div className="w-4 h-4 rounded-full bg-white shadow" animate={{ x: on ? 16 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="rev" className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">Review & launch</h2>
                    <p className="text-[13px] text-muted-foreground mt-1">Confirm your setup. You can change everything later in Settings.</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <ReviewCard title="Business" icon={Building2} rows={[
                      ["Name", form.name || "—"],
                      ["Type", BUSINESS_TYPES.find(t => t.id === form.businessType)?.label || "—"],
                      ["GSTIN", form.gstin || "—"],
                      ["Location", [form.city, form.state].filter(Boolean).join(", ") || "—"],
                    ]} />
                    <ReviewCard title="Industry & Modules" icon={Sparkles} rows={[
                      ["Industry", INDUSTRIES.find(i => i.id === form.industry)?.label || "—"],
                      ["Modules enabled", `${Object.values(modules).filter(Boolean).length} active`],
                      ["Inventory mode", form.inventoryMode === "no_inventory" ? "No inventory" : "Inventory tracked"],
                    ]} />
                  </div>
                  <div className="rounded-xl bg-emerald-500/8 border border-emerald-500/20 p-4 flex gap-3">
                    <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-[12.5px] text-emerald-800 dark:text-emerald-200 leading-relaxed">
                      Your dashboard, navigation and reports will be customized for <strong>{INDUSTRIES.find(i => i.id === form.industry)?.label}</strong>. Demo data (sample products, parties & invoices) is pre-loaded so you can explore immediately.
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer nav */}
            <div className="flex items-center justify-between mt-6 pt-5 border-t border-border/50">
              <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="gap-1.5">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext} className="gap-1.5 bg-primary hover:bg-primary/90">
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button onClick={finish} disabled={submitting} className="gap-1.5 bg-primary hover:bg-primary/90" data-testid="ob-finish">
                  {submitting ? "Setting up…" : "Launch MedBill"} <Sparkles className="w-4 h-4" />
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, hint, hintTone, children, className }: { label: string; required?: boolean; hint?: string; hintTone?: "error"; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-[12px] font-medium text-foreground/80 flex items-center gap-1">
        {label}{required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && <p className={cn("text-[11px]", hintTone === "error" ? "text-destructive" : "text-muted-foreground")}>{hint}</p>}
    </div>
  );
}

function ReviewCard({ title, icon: Icon, rows }: { title: string; icon: LucideIcon; rows: [string, string][] }) {
  return (
    <div className="rounded-xl border border-border/60 p-4 bg-muted/20">
      <div className="flex items-center gap-2 mb-3">
        <div className="grid place-items-center w-7 h-7 rounded-lg bg-primary/10 text-primary"><Icon className="w-4 h-4" /></div>
        <span className="text-[13px] font-semibold">{title}</span>
      </div>
      <dl className="space-y-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3 text-[12.5px]">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-medium text-right truncate max-w-[60%]">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
