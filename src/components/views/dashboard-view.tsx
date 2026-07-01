"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { formatINR, formatINRCompact, formatDate, relativeTime } from "@/lib/format";
import { getIndustryQuickActions } from "@/lib/industry-profiles";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp, Wallet, Package, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Receipt,
  Bell, ChevronRight, Banknote, Users, ShoppingCart, ScanLine, type LucideIcon,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart,
  Bar, PieChart, Pie, Cell, CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";

interface DashboardData {
  kpis: {
    monthSales: number; salesGrowth: number; monthPurchases: number;
    monthExpenses: number; monthReceipts: number; receipts7: number;
    totalOutstanding: number; totalOverdue: number; customerCount: number;
    supplierCount: number; productCount: number; lowStockCount: number;
    outOfStockCount: number; inventoryValue: number; grossProfit: number;
  };
  sparkline: { date: string; sales: number; receipts: number }[];
  topProducts: { name: string; qty: number; revenue: number }[];
  gstBreakdown: { rate: number; taxable: number; tax: number }[];
  recentInvoices: any[];
  lowStock: { id: string; name: string; stock: number; minStock: number; salePrice: number }[];
  notifications: any[];
  unreadNotifications: number;
}

export function DashboardView() {
  const { business, openView } = useAppStore();
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: () => api("/api/dashboard"),
    refetchInterval: 60_000,
  });

  if (isLoading || !data) {
    return (
      <div className="p-5 sm:p-7 space-y-5">
        <Skeleton className="h-9 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid lg:grid-cols-3 gap-4">
          <Skeleton className="h-80 rounded-xl lg:col-span-2" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  const k = data.kpis;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="p-4 sm:p-6 lg:p-7 space-y-5 max-w-[1600px] mx-auto" data-testid="dashboard-view">
      {/* Hero gradient banner */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white p-5 sm:p-6 shadow-float"
      >
        {/* Decorative shapes */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/8 blur-2xl" />
        <div className="absolute -bottom-16 -left-8 w-56 h-56 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute top-4 right-4 hidden sm:grid place-items-center w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15">
          <span className="font-bold text-lg">M</span>
        </div>

        <div className="relative">
          <p className="text-[11.5px] text-white/75 font-medium">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          <h1 className="text-[22px] sm:text-[28px] font-bold tracking-tight mt-1">
            {greeting} 👋
          </h1>
          <p className="text-[12.5px] sm:text-[13px] text-white/85 mt-1 max-w-lg">
            Here's how <strong className="text-white">{business?.name}</strong> is performing this month.
          </p>

          {/* Inline hero stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <HeroStat label="Month Sales" value={formatINR(k.monthSales)} growth={k.salesGrowth} />
            <HeroStat label="Collected" value={formatINR(k.monthReceipts)} />
            <HeroStat label="Outstanding" value={formatINR(k.totalOutstanding)} tone={k.totalOverdue > 0 ? "warn" : "ok"} />
            <HeroStat label="Net Profit" value={formatINR(k.grossProfit)} tone={k.grossProfit >= 0 ? "ok" : "warn"} />
          </div>

          <div className="flex flex-wrap gap-2 mt-5">
            {/* Industry-driven quick actions from Industry Profile Engine */}
            {getIndustryQuickActions(business?.industry).map((action, i) => {
              const ActionIcon = action.icon;
              const isPrimary = i === 0;
              return (
                <Button
                  key={action.key}
                  size="sm"
                  onClick={() => openView(action.view, action.params)}
                  className={isPrimary
                    ? "gap-1.5 h-9 bg-white text-emerald-700 hover:bg-white/90 hover:text-emerald-800 shadow-soft"
                    : "gap-1.5 h-9 bg-white/10 border-white/25 text-white hover:bg-white/20 hover:text-white backdrop-blur-sm"}
                  variant={isPrimary ? "default" : "outline"}
                >
                  <ActionIcon className="w-4 h-4" /> {action.label}
                </Button>
              );
            })}
            <Button size="sm" variant="outline" onClick={() => openView("reports")} className="gap-1.5 h-9 bg-white/10 border-white/25 text-white hover:bg-white/20 hover:text-white backdrop-blur-sm">
              <TrendingUp className="w-4 h-4" /> Reports
            </Button>
          </div>
        </div>
      </motion.div>

      {/* KPI grid — operational metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          icon={ShoppingCart}
          label="Purchases (Month)"
          value={formatINR(k.monthPurchases)}
          sub="Goods inward"
          accent="amber"
        />
        <KpiCard
          icon={Wallet}
          label="Expenses (Month)"
          value={formatINR(k.monthExpenses)}
          sub="Business spending"
          accent="red"
        />
        <KpiCard
          icon={Users}
          label="Customers"
          value={String(k.customerCount)}
          sub={`${k.supplierCount} suppliers`}
          accent="emerald"
        />
        <KpiCard
          icon={Package}
          label="Inventory Value"
          value={formatINR(k.inventoryValue)}
          sub={`${k.productCount} products · ${k.lowStockCount} low stock`}
          accent="purple"
        />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 shadow-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-[15px] font-semibold">Sales & Collections</CardTitle>
              <p className="text-[11.5px] text-muted-foreground mt-0.5">Last 14 days</p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <Legend color="bg-primary" label="Sales" />
              <Legend color="bg-amber-500" label="Receipts" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-[260px] -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.sparkline} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                  <defs>
                    <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.32} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gRecv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.85 0.01 150)" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={(d) => { const dt = new Date(d); return `${dt.getDate()}/${dt.getMonth() + 1}`; }} tick={{ fontSize: 10, fill: "oklch(0.55 0.02 155)" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => formatINRCompact(v)} tick={{ fontSize: 10, fill: "oklch(0.55 0.02 155)" }} axisLine={false} tickLine={false} width={52} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2.2} fill="url(#gSales)" />
                  <Area type="monotone" dataKey="receipts" stroke="#f59e0b" strokeWidth={1.8} fill="url(#gRecv)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px] font-semibold">GST Collected</CardTitle>
            <p className="text-[11.5px] text-muted-foreground">By rate (last 30 days)</p>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.gstBreakdown} dataKey="tax" nameKey="rate" cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={2}>
                    {data.gstBreakdown.map((g, i) => (
                      <Cell key={`gst-${g.rate}`} fill={GST_COLORS[i % GST_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip suffix="" />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 mt-2">
              {data.gstBreakdown.map((g, i) => (
                <div key={g.rate} className="flex items-center justify-between text-[12px]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: GST_COLORS[i % GST_COLORS.length] }} />
                    <span className="text-muted-foreground">GST {g.rate}%</span>
                  </div>
                  <span className="font-semibold tnum">{formatINR(g.tax)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 shadow-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-[15px] font-semibold">Recent Invoices</CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-[12px] text-muted-foreground" onClick={() => openView("sales")}>
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1">
              {data.recentInvoices.map((inv, i) => (
                <motion.button
                  key={inv.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => openView("sales", { action: "view", id: inv.id })}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left"
                >
                  <div className="grid place-items-center w-9 h-9 rounded-lg bg-primary/10 text-primary shrink-0">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[13px] font-mono">{inv.number}</span>
                      <StatusBadge status={inv.status} />
                    </div>
                    <div className="text-[11.5px] text-muted-foreground truncate">{inv.partyName} · {formatDate(inv.date)}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold text-[13px] tnum">{formatINR(inv.amount)}</div>
                  </div>
                </motion.button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="shadow-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Stock Alerts
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-[12px] text-muted-foreground" onClick={() => openView("inventory")}>
                Manage <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2.5">
                {data.lowStock.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground py-3 text-center">All products well stocked ✓</p>
                ) : data.lowStock.map((p) => (
                  <div key={p.id} className="flex items-center gap-2.5">
                    <div className={cn("grid place-items-center w-8 h-8 rounded-lg shrink-0", p.stock <= 0 ? "bg-red-500/12 text-red-600" : "bg-amber-500/12 text-amber-600")}>
                      <Package className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-medium truncate">{p.name}</div>
                      <div className="text-[10.5px] text-muted-foreground">{p.stock} in stock · min {p.minStock}</div>
                    </div>
                    {p.stock <= 0 ? <Badge variant="destructive" className="text-[10px] h-5">Out</Badge> : <Badge variant="secondary" className="text-[10px] h-5 bg-amber-500/15 text-amber-700">Low</Badge>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" /> Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2.5">
                {data.notifications.slice(0, 4).map((n) => (
                  <div key={n.id} className="flex items-start gap-2.5">
                    <span className={cn("mt-1.5 w-1.5 h-1.5 rounded-full shrink-0", n.read ? "bg-muted-foreground/30" : "bg-primary")} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium leading-tight">{n.title}</div>
                      <div className="text-[10.5px] text-muted-foreground leading-snug mt-0.5">{relativeTime(n.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Top products */}
      <Card className="shadow-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-[15px] font-semibold">Top Products (Last 30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topProducts} layout="vertical" margin={{ left: 8, right: 16, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.85 0.01 150)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "oklch(0.55 0.02 155)" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatINRCompact(v)} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10.5, fill: "oklch(0.4 0.02 155)" }} axisLine={false} tickLine={false} width={150} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "oklch(0.5 0.02 155 / 0.06)" }} />
                <Bar dataKey="revenue" fill="#10b981" radius={[0, 6, 6, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const GST_COLORS = ["#10b981", "#f59e0b", "#3b82f6", "#a855f7", "#ef4444"];

function KpiCard({
  icon: Icon, label, value, change, sub, accent, spark,
}: {
  icon: LucideIcon; label: string; value: string; change?: number; sub?: string;
  accent: "emerald" | "amber" | "red" | "purple" | "neutral"; spark?: number[];
}) {
  const accentMap = {
    emerald: "bg-emerald-500/12 text-emerald-600",
    amber: "bg-amber-500/12 text-amber-600",
    red: "bg-red-500/12 text-red-600",
    purple: "bg-purple-500/12 text-purple-600",
    neutral: "bg-muted text-muted-foreground",
  }[accent];
  const sparkId = React.useId();
  return (
    <Card className="shadow-card border-border/50 overflow-hidden relative group hover:shadow-float transition-shadow">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <div className={cn("grid place-items-center w-9 h-9 rounded-xl", accentMap)}>
            <Icon className="w-[18px] h-[18px]" />
          </div>
          {change !== undefined && (
            <div className={cn("flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-md", change >= 0 ? "text-emerald-600 bg-emerald-500/10" : "text-red-600 bg-red-500/10")}>
              {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(change).toFixed(0)}%
            </div>
          )}
        </div>
        <div className="mt-3">
          <p className="text-[11.5px] text-muted-foreground font-medium">{label}</p>
          <p className="text-[22px] sm:text-[24px] font-bold tracking-tight tnum mt-0.5">{value}</p>
          {sub && <p className="text-[11px] text-muted-foreground mt-1 truncate">{sub}</p>}
        </div>
        {spark && spark.length > 1 && (
          <div className="h-8 mt-2 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spark.map((v, i) => ({ i, v }))}>
                <defs>
                  <linearGradient id={sparkId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke="currentColor" strokeWidth={1.6} fill={`url(#${sparkId})`} className={accentMap.split(" ").find(c => c.startsWith("text"))} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HeroStat({ label, value, growth, tone }: { label: string; value: string; growth?: number; tone?: "ok" | "warn" }) {
  return (
    <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-wider text-white/70 font-semibold">{label}</p>
        {growth !== undefined && (
          <span className={`flex items-center gap-0.5 text-[10px] font-bold ${growth >= 0 ? "text-emerald-200" : "text-red-200"}`}>
            {growth >= 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
            {Math.abs(growth).toFixed(0)}%
          </span>
        )}
      </div>
      <p className={`text-[16px] sm:text-[18px] font-bold tnum tracking-tight mt-1 ${tone === "warn" ? "text-amber-200" : "text-white"}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    unpaid: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
    partial: "bg-blue-500/12 text-blue-700 dark:text-blue-300",
    overdue: "bg-red-500/12 text-red-700 dark:text-red-300",
    draft: "bg-muted text-muted-foreground",
    cancelled: "bg-muted text-muted-foreground line-through",
  };
  return <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-md capitalize", map[status] || map.draft)}>{status}</span>;
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("w-2.5 h-2.5 rounded-full", color)} />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

function ChartTooltip({ active, payload, label, suffix = "₹" }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/60 bg-popover/95 backdrop-blur px-3 py-2 shadow-float text-[11.5px]">
      {label !== undefined && label !== "" && <div className="font-semibold mb-1">{typeof label === "string" && label.includes("-") ? formatDate(label) : label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-muted-foreground capitalize">{p.name}:</span>
          <span className="font-semibold tnum">{suffix === "₹" ? formatINR(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}
