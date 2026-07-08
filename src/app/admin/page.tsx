"use client";

import * as React from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Shield, Building2, Users, CreditCard, TrendingUp, Search,
  DollarSign, AlertCircle, CheckCircle2, Clock, Ban, RefreshCw, LogOut,
  Moon, Sun, ExternalLink,
} from "lucide-react";
import { useTheme } from "next-themes";

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = React.useState(false);
  const [loginForm, setLoginForm] = React.useState({ email: "", password: "" });
  const [loginLoading, setLoginLoading] = React.useState(false);

  const handleLogin = async () => {
    setLoginLoading(true);
    try {
      await api("/api/admin/login", {
        method: "POST",
        body: JSON.stringify(loginForm),
      });
      setLoggedIn(true);
      toast.success("Admin login successful");
    } catch (e: any) {
      toast.error(e?.message || "Login failed");
    } finally {
      setLoginLoading(false);
    }
  };

  if (!loggedIn) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-emerald-900 to-teal-900 p-4">
        <Card className="w-full max-w-md p-8 shadow-float">
          <div className="flex items-center gap-3 mb-6">
            <div className="grid place-items-center w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">MedBill Admin</h1>
              <p className="text-[12px] text-muted-foreground">Super Admin Control Panel</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Admin Email</Label>
              <Input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm(f => ({ ...f, email: e.target.value }))}
                placeholder="admin@medbill.in"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">Password</Label>
              <Input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm(f => ({ ...f, password: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="••••••••"
                className="h-11"
              />
            </div>
            <Button
              onClick={handleLogin}
              disabled={loginLoading}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 gap-2"
            >
              {loginLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              Login to Admin Panel
            </Button>
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-[11px] text-emerald-700">
              <p className="font-semibold">Default Credentials:</p>
              <p>Email: admin@medbill.in</p>
              <p>Password: Admin@MedBill2026</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return <AdminDashboard onLogout={() => setLoggedIn(false)} />;
}

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = React.useState<"dashboard" | "businesses" | "users" | "subscriptions" | "plans">("dashboard");
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const loadDashboard = async () => {
    setLoading(true);
    try { setData(await api("/api/admin/dashboard")); } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  const loadBusinesses = async () => {
    setLoading(true);
    try { setData(await api("/api/admin/businesses")); } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  const loadUsers = async () => {
    setLoading(true);
    try { setData(await api("/api/admin/users")); } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  const loadSubscriptions = async () => {
    setLoading(true);
    try { setData(await api("/api/admin/subscriptions")); } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  const loadPlans = async () => {
    setLoading(true);
    try { setData(await api("/api/admin/plans")); } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const tabs = [
    { key: "dashboard", label: "Dashboard", icon: TrendingUp },
    { key: "businesses", label: "Businesses", icon: Building2 },
    { key: "users", label: "Users", icon: Users },
    { key: "subscriptions", label: "Subscriptions", icon: CreditCard },
    { key: "plans", label: "Plans", icon: DollarSign },
    { key: "analytics", label: "Analytics", icon: TrendingUp },
    { key: "audit", label: "Audit Log", icon: AlertCircle },
    { key: "health", label: "System", icon: CheckCircle2 },
  ] as const;

  const [auditData, setAuditData] = React.useState<any>(null);
  const [healthData, setHealthData] = React.useState<any>(null);

  const loadAudit = async () => {
    setLoading(true);
    try { setAuditData(await api("/api/admin/audit")); } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  const loadHealth = async () => {
    setLoading(true);
    try {
      const dash = await api("/api/admin/dashboard");
      setHealthData(dash);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  // Update useEffect
  React.useEffect(() => {
    if (tab === "dashboard") loadDashboard();
    if (tab === "businesses") loadBusinesses();
    if (tab === "users") loadUsers();
    if (tab === "subscriptions") loadSubscriptions();
    if (tab === "plans") loadPlans();
    if (tab === "analytics") loadDashboard(); // reuse dashboard data for analytics
    if (tab === "audit") loadAudit();
    if (tab === "health") loadHealth();
  }, [tab]);

  return (
    <div className="min-h-screen bg-background">
      {/* Admin header — responsive */}
      <header className="sticky top-0 z-20 h-16 glass border-b border-border/50 flex items-center gap-2 sm:gap-4 px-3 sm:px-5">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white">
            <Shield className="w-4 h-4" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-[15px] font-bold">MedBill Admin</h1>
            <p className="text-[10px] text-muted-foreground">Super Admin Panel</p>
          </div>
        </div>
        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 ml-4 sm:ml-8">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 h-9 rounded-lg text-[12.5px] font-medium transition-colors",
                  tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                )}
              >
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <a href="/" target="_blank" className="hidden sm:flex items-center gap-1.5 px-3 h-9 rounded-lg text-[12px] text-muted-foreground hover:bg-muted transition-colors">
            <ExternalLink className="w-3.5 h-3.5" /> Main App
          </a>
          {mounted && (
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onLogout} className="gap-1.5 h-9 text-muted-foreground">
            <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      {/* Mobile bottom nav for admin */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-border/60 h-16 grid grid-cols-5" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} className={cn("flex flex-col items-center justify-center gap-1 text-[10px] font-medium", tab === t.key ? "text-primary" : "text-muted-foreground")}>
              <Icon className="w-5 h-5" strokeWidth={tab === t.key ? 2.4 : 2} />
              <span className="truncate">{t.label.split(" ")[0]}</span>
            </button>
          );
        })}
      </nav>

      <main className="p-5 sm:p-7 max-w-[1400px] mx-auto pb-24 md:pb-7">
        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
            </div>
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        ) : tab === "dashboard" ? (
          <DashboardTab data={data} />
        ) : tab === "businesses" ? (
          <BusinessesTab data={data} onAction={loadBusinesses} />
        ) : tab === "users" ? (
          <UsersTab data={data} />
        ) : tab === "subscriptions" ? (
          <SubscriptionsTab data={data} />
        ) : tab === "plans" ? (
          <PlansTab data={data} />
        ) : tab === "analytics" ? (
          <AnalyticsTab data={data} />
        ) : tab === "audit" ? (
          <AuditTab data={auditData} />
        ) : tab === "health" ? (
          <HealthTab data={healthData} />
        ) : null}
      </main>
    </div>
  );
}

function DashboardTab({ data }: { data: any }) {
  if (!data) return null;
  const m = data.metrics;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AdminStat icon={Building2} label="Total Businesses" value={String(m.totalBusinesses)} accent="primary" />
        <AdminStat icon={Users} label="Total Users" value={String(m.totalUsers)} accent="emerald" />
        <AdminStat icon={DollarSign} label="Annual Revenue" value={`₹${m.totalRevenue.toLocaleString("en-IN")}`} accent="amber" />
        <AdminStat icon={CreditCard} label="Active Subscriptions" value={String(m.activeSubscriptions)} accent="purple" />
      </div>

      <Card className="p-5 shadow-card border-border/50">
        <h3 className="text-[15px] font-semibold mb-4">Plan Distribution</h3>
        <div className="space-y-3">
          {data.planDistribution.map((p: any) => (
            <div key={p.plan} className="flex items-center gap-4">
              <div className="w-32">
                <span className="text-[13px] font-medium">{p.plan}</span>
                <span className="text-[11px] text-muted-foreground block">₹{p.price}/year</span>
              </div>
              <div className="flex-1 h-8 rounded-lg bg-muted/40 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 flex items-center justify-end px-2"
                  style={{ width: `${Math.max(p.count * 20, 5)}%` }}
                >
                  <span className="text-[11px] font-bold text-white">{p.count}</span>
                </div>
              </div>
              <div className="w-24 text-right text-[12px] font-semibold tnum">₹{p.revenue.toLocaleString("en-IN")}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5 shadow-card border-border/50">
        <h3 className="text-[15px] font-semibold mb-4">Subscription Status</h3>
        <div className="grid grid-cols-4 gap-3">
          {Object.entries(data.statusCounts).map(([status, count]) => (
            <div key={status} className="rounded-xl border border-border/50 p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{status}</p>
              <p className="text-[20px] font-bold tnum mt-1">{String(count)}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5 shadow-card border-border/50">
        <h3 className="text-[15px] font-semibold mb-4">Recent Signups</h3>
        <div className="space-y-2">
          {data.recentBusinesses.map((b: any) => (
            <div key={b.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/40">
              <div>
                <span className="text-[13px] font-medium">{b.name}</span>
                <span className="text-[11px] text-muted-foreground ml-2">{b.industry}</span>
              </div>
              <span className="text-[11px] text-muted-foreground">{new Date(b.createdAt).toLocaleDateString("en-IN")}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function BusinessesTab({ data, onAction }: { data: any; onAction: () => void }) {
  const [search, setSearch] = React.useState("");
  const [selectedBiz, setSelectedBiz] = React.useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = React.useState<string>("");
  const [plans, setPlans] = React.useState<any[]>([]);

  React.useEffect(() => {
    api("/api/admin/plans").then((d: any) => setPlans(d.items)).catch(() => {});
  }, []);

  const items = (data?.items ?? []).filter((b: any) =>
    !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.gstin?.includes(search)
  );

  const handleAction = async (id: string, action: string, planId?: string) => {
    try {
      await api(`/api/admin/businesses/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action, planId }),
      });
      toast.success(`Action: ${action} completed`);
      setSelectedBiz(null);
      onAction();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold">All Businesses</h2>
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-9 h-9" />
        </div>
      </div>
      <Card className="shadow-card border-border/50 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border/50 bg-muted/20">
              <th className="text-left font-semibold px-4 py-2.5">Business</th>
              <th className="text-left font-semibold px-2 py-2.5 hidden md:table-cell">Industry</th>
              <th className="text-left font-semibold px-2 py-2.5">Plan</th>
              <th className="text-center font-semibold px-2 py-2.5">Status</th>
              <th className="text-right font-semibold px-2 py-2.5 hidden sm:table-cell">Invoices</th>
              <th className="text-right font-semibold px-4 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((b: any) => (
              <tr key={b.id} className="border-b border-border/30 hover:bg-muted/20">
                <td className="px-4 py-3">
                  <div className="font-medium">{b.name}</div>
                  <div className="text-[11px] text-muted-foreground">{b.email || b.phone || "—"}</div>
                </td>
                <td className="px-2 py-3 hidden md:table-cell text-muted-foreground capitalize">{b.industry}</td>
                <td className="px-2 py-3">
                  {b.subscription ? (
                    <Badge variant="outline" className="text-[10px]">{b.subscription.plan}</Badge>
                  ) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-2 py-3 text-center">
                  {b.subscription ? (
                    <StatusBadge status={b.subscription.status} />
                  ) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-2 py-3 text-right tnum hidden sm:table-cell">{b.invoiceCount}</td>
                <td className="px-4 py-3 text-right">
                  {selectedBiz === b.id ? (
                    <div className="flex items-center gap-1.5 justify-end">
                      <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                        <SelectTrigger className="h-7 w-32 text-[11px]"><SelectValue placeholder="Select plan" /></SelectTrigger>
                        <SelectContent>
                          {plans.map((p: any) => (
                            <SelectItem key={p.id} value={p.id} className="text-[11px]">
                              {p.displayName} (₹{p.priceYearly}/yr)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700" disabled={!selectedPlan} onClick={() => handleAction(b.id, "change_plan", selectedPlan)}>
                        Confirm
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => { setSelectedBiz(null); setSelectedPlan(""); }}>Cancel</Button>
                    </div>
                  ) : (
                    <div className="flex gap-1 justify-end">
                      <a href={`/admin/business/${b.id}`} className="hidden sm:flex items-center gap-1 px-2 h-7 rounded text-[11px] text-muted-foreground hover:bg-muted">
                        <Building2 className="w-3 h-3" /> View
                      </a>
                      <Button size="sm" variant="ghost" className="h-7 text-[11px] text-emerald-600" onClick={() => { setSelectedBiz(b.id); setSelectedPlan(""); }}>
                        <CreditCard className="w-3 h-3" /> <span className="hidden lg:inline">Change Plan</span>
                      </Button>
                      {b.subscription?.status !== "suspended" ? (
                        <Button size="sm" variant="ghost" className="h-7 text-[11px] text-red-600" onClick={() => handleAction(b.id, "suspend")}>
                          <Ban className="w-3 h-3" /> Suspend
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-7 text-[11px] text-emerald-600" onClick={() => handleAction(b.id, "activate")}>
                          <CheckCircle2 className="w-3 h-3" /> Activate
                        </Button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function UsersTab({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">All Users</h2>
      <Card className="shadow-card border-border/50 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border/50 bg-muted/20">
              <th className="text-left font-semibold px-4 py-2.5">User</th>
              <th className="text-left font-semibold px-2 py-2.5 hidden sm:table-cell">Phone</th>
              <th className="text-left font-semibold px-2 py-2.5">Businesses</th>
              <th className="text-center font-semibold px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((u: any) => (
              <tr key={u.id} className="border-b border-border/30 hover:bg-muted/20">
                <td className="px-4 py-3">
                  <div className="font-medium">{u.name}</div>
                  <div className="text-[11px] text-muted-foreground">{u.email}</div>
                </td>
                <td className="px-2 py-3 hidden sm:table-cell text-muted-foreground">{u.phone || "—"}</td>
                <td className="px-2 py-3">
                  {u.businesses.length > 0 ? (
                    <span className="text-[12px]">{u.businesses.map((b: any) => b.businessName).join(", ")}</span>
                  ) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={u.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function SubscriptionsTab({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">All Subscriptions</h2>
      <Card className="shadow-card border-border/50 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border/50 bg-muted/20">
              <th className="text-left font-semibold px-4 py-2.5">Business</th>
              <th className="text-left font-semibold px-2 py-2.5">Plan</th>
              <th className="text-center font-semibold px-2 py-2.5">Status</th>
              <th className="text-right font-semibold px-2 py-2.5">Amount</th>
              <th className="text-right font-semibold px-2 py-2.5 hidden sm:table-cell">End Date</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((s: any) => (
              <tr key={s.id} className="border-b border-border/30 hover:bg-muted/20">
                <td className="px-4 py-3 font-medium">{s.businessName}</td>
                <td className="px-2 py-3">
                  <Badge variant="outline" className="text-[10px]">{s.plan}</Badge>
                </td>
                <td className="px-2 py-3 text-center"><StatusBadge status={s.status} /></td>
                <td className="px-2 py-3 text-right tnum font-semibold">₹{s.amount.toLocaleString("en-IN")}</td>
                <td className="px-2 py-3 text-right tnum text-muted-foreground hidden sm:table-cell">
                  {new Date(s.endDate).toLocaleDateString("en-IN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function PlansTab({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Subscription Plans</h2>
      <div className="grid sm:grid-cols-3 gap-4">
        {(data?.items ?? []).map((p: any) => (
          <Card key={p.id} className="p-5 shadow-card border-border/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[16px] font-bold">{p.displayName}</h3>
              {p.name === "professional" && <Badge className="bg-emerald-500/15 text-emerald-700">Popular</Badge>}
            </div>
            <div className="mb-4">
              <span className="text-[28px] font-bold">₹{p.priceYearly}</span>
              <span className="text-[13px] text-muted-foreground">/year</span>
              <span className="text-[11px] text-muted-foreground block">₹{p.priceMonthly}/month equivalent</span>
            </div>
            <div className="space-y-1.5 text-[12px]">
              <div className="flex justify-between"><span className="text-muted-foreground">Users</span><span className="font-medium">{p.maxUsers === -1 ? "Unlimited" : p.maxUsers}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Products</span><span className="font-medium">{p.maxProducts === -1 ? "Unlimited" : p.maxProducts}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Branches</span><span className="font-medium">{p.maxBranches === -1 ? "Unlimited" : p.maxBranches}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Invoices/mo</span><span className="font-medium">{p.maxInvoices === -1 ? "Unlimited" : p.maxInvoices}</span></div>
            </div>
            <div className="mt-3 pt-3 border-t border-border/40">
              <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Features</p>
              <div className="flex flex-wrap gap-1">
                {p.features.map((f: string) => (
                  <Badge key={f} variant="secondary" className="text-[9px]">{f.replace(/_/g, " ")}</Badge>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AdminStat({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent: string }) {
  const map: Record<string, string> = {
    primary: "bg-primary/10 text-primary", emerald: "bg-emerald-500/12 text-emerald-600",
    amber: "bg-amber-500/12 text-amber-600", purple: "bg-purple-500/12 text-purple-600",
  };
  return (
    <Card className="p-4 shadow-card border-border/50">
      <div className={cn("grid place-items-center w-8 h-8 rounded-lg mb-2", map[accent])}><Icon className="w-4 h-4" /></div>
      <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
      <p className="text-[20px] font-bold tnum tracking-tight mt-0.5">{value}</p>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-500/12 text-emerald-700", trial: "bg-blue-500/12 text-blue-700",
    expired: "bg-amber-500/12 text-amber-700", suspended: "bg-red-500/12 text-red-700",
    grace: "bg-amber-500/12 text-amber-700", active_user: "bg-emerald-500/12 text-emerald-700",
  };
  return <span className={cn("inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md capitalize", map[status] || "bg-muted text-muted-foreground")}>{status}</span>;
}

function AnalyticsTab({ data }: { data: any }) {
  if (!data) return null;
  const m = data.metrics;
  const conversionRate = m.totalBusinesses > 0 ? ((m.activeSubscriptions / m.totalBusinesses) * 100).toFixed(1) : "0";
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold">Platform Analytics</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AdminStat icon={TrendingUp} label="MRR (Monthly)" value={`₹${m.monthlyRevenue.toLocaleString("en-IN")}`} accent="emerald" />
        <AdminStat icon={DollarSign} label="ARR (Annual)" value={`₹${m.totalRevenue.toLocaleString("en-IN")}`} accent="primary" />
        <AdminStat icon={Building2} label="Total Businesses" value={String(m.totalBusinesses)} accent="amber" />
        <AdminStat icon={Users} label="Total Users" value={String(m.totalUsers)} accent="purple" />
      </div>
      <Card className="p-5 shadow-card border-border/50">
        <h3 className="text-[15px] font-semibold mb-4">Revenue by Plan</h3>
        <div className="space-y-3">
          {data.planDistribution.map((p: any) => (
            <div key={p.plan} className="flex items-center gap-4">
              <div className="w-32">
                <span className="text-[13px] font-medium">{p.plan}</span>
                <span className="text-[11px] text-muted-foreground block">₹{p.price}/year</span>
              </div>
              <div className="flex-1 h-8 rounded-lg bg-muted/40 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 flex items-center justify-end px-2" style={{ width: `${Math.max(p.count * 20, 5)}%` }}>
                  <span className="text-[11px] font-bold text-white">{p.count}</span>
                </div>
              </div>
              <div className="w-24 text-right text-[12px] font-semibold tnum">₹{p.revenue.toLocaleString("en-IN")}</div>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-5 shadow-card border-border/50">
        <h3 className="text-[15px] font-semibold mb-4">Key Metrics</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border/50 p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Conversion Rate</p>
            <p className="text-[20px] font-bold tnum mt-1">{conversionRate}%</p>
          </div>
          <div className="rounded-xl border border-border/50 p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Active Subs</p>
            <p className="text-[20px] font-bold tnum mt-1">{m.activeSubscriptions}</p>
          </div>
          <div className="rounded-xl border border-border/50 p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Trial Users</p>
            <p className="text-[20px] font-bold tnum mt-1">{m.trialSubscriptions}</p>
          </div>
          <div className="rounded-xl border border-border/50 p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Users/Business</p>
            <p className="text-[20px] font-bold tnum mt-1">{m.totalBusinesses > 0 ? (m.totalUsers / m.totalBusinesses).toFixed(1) : "0"}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function AuditTab({ data }: { data: any }) {
  if (!data) return <div className="text-center py-10 text-muted-foreground">Loading audit log...</div>;
  const items = data?.items ?? [];
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Platform Audit Log</h2>
      <Card className="shadow-card border-border/50 overflow-hidden">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border/50 bg-muted/20">
              <th className="text-left font-semibold px-4 py-2.5">Date</th>
              <th className="text-left font-semibold px-2 py-2.5">Action</th>
              <th className="text-left font-semibold px-2 py-2.5 hidden sm:table-cell">Entity</th>
              <th className="text-left font-semibold px-2 py-2.5">Summary</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a: any) => (
              <tr key={a.id} className="border-b border-border/30 hover:bg-muted/20">
                <td className="px-4 py-2.5 text-muted-foreground tnum whitespace-nowrap">{new Date(a.createdAt).toLocaleString("en-IN")}</td>
                <td className="px-2 py-2.5"><StatusBadge status={a.action} /></td>
                <td className="px-2 py-2.5 hidden sm:table-cell text-muted-foreground">{a.entity}</td>
                <td className="px-2 py-2.5">{a.summary || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div className="py-10 text-center text-muted-foreground text-[13px]">No audit entries found</div>}
      </Card>
    </div>
  );
}

function HealthTab({ data }: { data: any }) {
  if (!data) return <div className="text-center py-10 text-muted-foreground">Loading system health...</div>;
  const m = data.metrics;
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold">System Health</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AdminStat icon={CheckCircle2} label="Server Status" value="Running" accent="emerald" />
        <AdminStat icon={Building2} label="Businesses" value={String(m.totalBusinesses)} accent="primary" />
        <AdminStat icon={Users} label="Users" value={String(m.totalUsers)} accent="amber" />
        <AdminStat icon={CreditCard} label="Subscriptions" value={String(m.activeSubscriptions)} accent="purple" />
      </div>
      <Card className="p-5 shadow-card border-border/50">
        <h3 className="text-[15px] font-semibold mb-4">Subscription Status Distribution</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(data.statusCounts || {}).map(([status, count]) => (
            <div key={status} className="rounded-xl border border-border/50 p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{status}</p>
              <p className="text-[20px] font-bold tnum mt-1">{String(count)}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-5 shadow-card border-border/50">
        <h3 className="text-[15px] font-semibold mb-4">Recent Signups</h3>
        <div className="space-y-2">
          {(data.recentBusinesses || []).map((b: any) => (
            <div key={b.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/40">
              <div>
                <span className="text-[13px] font-medium">{b.name}</span>
                <span className="text-[11px] text-muted-foreground ml-2 capitalize">{b.industry}</span>
              </div>
              <span className="text-[11px] text-muted-foreground">{new Date(b.createdAt).toLocaleDateString("en-IN")}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
