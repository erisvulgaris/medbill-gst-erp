"use client";

import * as React from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { formatINR, formatDateShort, formatDate, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  ArrowLeft, Printer, MessageCircle, Phone, Mail, MapPin, Download,
  TrendingUp, TrendingDown, Wallet, FileText, ShoppingCart, IndianRupee,
  ArrowRight,
} from "lucide-react";

interface PartyStatement {
  party: {
    id: string; name: string; type: string; phone?: string | null; email?: string | null;
    gstin?: string | null; city?: string | null; state?: string | null; stateCode?: string | null;
    openingBalance: number; creditLimit: number; creditDays: number;
  };
  entries: {
    date: string; type: string; ref: string; refType: string; refId: string | null;
    debit: number; credit: number; balance: number; note?: string | null;
  }[];
  totals: {
    totalSales: number; totalPurchases: number; totalReceived: number;
    totalPaid: number; closingBalance: number; outstandingInvoices: number;
  };
  invoiceCount: number; purchaseCount: number; paymentCount: number;
}

export function PartyStatement({ partyId, onBack }: { partyId: string; onBack: () => void }) {
  const { openView, business } = useAppStore();
  const [data, setData] = React.useState<PartyStatement | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const d = await api<PartyStatement>(`/api/parties/${partyId}`);
        setData(d);
      } catch (e: any) { toast.error(e?.message || "Failed"); } finally { setLoading(false); }
    })();
  }, [partyId]);

  if (loading || !data) {
    return <div className="p-7 space-y-3"><Skeleton className="h-9 w-48" /><Skeleton className="h-32 w-full" /><Skeleton className="h-96 w-full" /></div>;
  }

  const { party, entries, totals } = data;
  const isCustomer = party.type === "customer" || party.type === "both";
  const closingPositive = totals.closingBalance > 0;

  const shareWhatsApp = () => {
    const msg = `*Ledger Statement*\n${party.name}\n\nClosing Balance: ${formatINR(Math.abs(totals.closingBalance))} ${closingPositive ? "(Dr - you owe us)" : "(Cr - we owe you)"}\nTotal Sales: ${formatINR(totals.totalSales)}\nTotal Received: ${formatINR(totals.totalReceived)}\n\n- ${business?.name}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1200px] mx-auto space-y-5" data-testid="party-statement">
      <div className="flex items-center justify-between gap-2 print:hidden">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 h-9"><ArrowLeft className="w-4 h-4" /> Back to parties</Button>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" onClick={shareWhatsApp} className="gap-1.5 h-9 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/8"><MessageCircle className="w-4 h-4" /> <span className="hidden sm:inline">WhatsApp</span></Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5 h-9"><Printer className="w-4 h-4" /> <span className="hidden sm:inline">Print</span></Button>
        </div>
      </div>

      {/* Party header card */}
      <Card className="p-5 shadow-card border-border/50">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar className="w-14 h-14 rounded-2xl border border-border/50 shrink-0">
            <AvatarFallback className={cn("rounded-2xl text-[16px] font-bold", isCustomer ? "bg-primary/10 text-primary" : "bg-purple-500/15 text-purple-600")}>{initials(party.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[20px] font-bold tracking-tight">{party.name}</h1>
              <Badge variant="outline" className="text-[10.5px] capitalize">{party.type}</Badge>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-[12px] text-muted-foreground">
              {party.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{party.phone}</span>}
              {party.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{party.email}</span>}
              {party.gstin && <span className="font-mono">GSTIN: {party.gstin}</span>}
              {party.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{party.city}, {party.state}</span>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Closing Balance</p>
            <p className={cn("text-[22px] font-bold tnum", closingPositive ? "text-amber-600" : "text-emerald-600")}>{formatINR(Math.abs(totals.closingBalance))}</p>
            <p className="text-[10.5px] text-muted-foreground">{closingPositive ? "Dr · They owe you" : "Cr · You owe them"}</p>
          </div>
        </div>
      </Card>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={isCustomer ? TrendingUp : ShoppingCart} label={isCustomer ? "Total Sales" : "Total Purchases"} value={formatINR(isCustomer ? totals.totalSales : totals.totalPurchases)} accent="primary" />
        <StatCard icon={Wallet} label={isCustomer ? "Received" : "Paid"} value={formatINR(isCustomer ? totals.totalReceived : totals.totalPaid)} accent="emerald" />
        <StatCard icon={FileText} label="Outstanding" value={formatINR(totals.outstandingInvoices)} accent="amber" />
        <StatCard icon={IndianRupee} label="Credit Limit" value={party.creditLimit > 0 ? formatINR(party.creditLimit) : "—"} accent="purple" />
      </div>

      {/* Ledger table */}
      <Card className="shadow-card border-border/50 overflow-hidden">
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Ledger Statement</h2>
          <span className="text-[11.5px] text-muted-foreground">{entries.length} entries</span>
        </div>
        {entries.length === 0 ? (
          <div className="py-16 text-center">
            <div className="grid place-items-center w-12 h-12 rounded-xl bg-muted mx-auto mb-3"><FileText className="w-5 h-5 text-muted-foreground" /></div>
            <p className="text-[13px] font-medium">No transactions yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead><tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground bg-muted/20 border-b border-border/50">
                <th className="text-left font-semibold px-4 py-2.5">Date</th>
                <th className="text-left font-semibold px-2 py-2.5">Particulars</th>
                <th className="text-left font-semibold px-2 py-2.5 hidden sm:table-cell">Type</th>
                <th className="text-right font-semibold px-2 py-2.5">Debit</th>
                <th className="text-right font-semibold px-2 py-2.5">Credit</th>
                <th className="text-right font-semibold px-4 py-2.5">Balance</th>
              </tr></thead>
              <tbody>
                {entries.map((e, i) => {
                  const typeIcon = e.refType === "invoice" ? FileText : e.refType === "purchase" ? ShoppingCart : e.refType === "payment" ? Wallet : IndianRupee;
                  const Icon = typeIcon;
                  return (
                    <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.01, 0.2) }} className={cn("border-b border-border/30 hover:bg-muted/20", e.type === "opening" && "bg-muted/30 font-medium")}>
                      <td className="px-4 py-2.5 text-muted-foreground tnum whitespace-nowrap">{formatDateShort(e.date)}</td>
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className={cn("grid place-items-center w-6 h-6 rounded shrink-0", e.debit > 0 ? "bg-amber-500/12 text-amber-600" : e.credit > 0 ? "bg-emerald-500/12 text-emerald-600" : "bg-muted text-muted-foreground")}><Icon className="w-3 h-3" /></div>
                          <div className="min-w-0">
                            <div className="font-medium truncate">{e.ref}</div>
                            {e.note && <div className="text-[10.5px] text-muted-foreground truncate">{e.note}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2.5 hidden sm:table-cell"><Badge variant="outline" className="text-[9.5px] capitalize">{e.refType}</Badge></td>
                      <td className="px-2 py-2.5 text-right tnum">{e.debit > 0 ? formatINR(e.debit) : <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-2 py-2.5 text-right tnum">{e.credit > 0 ? formatINR(e.credit) : <span className="text-muted-foreground">—</span>}</td>
                      <td className={cn("px-4 py-2.5 text-right tnum font-semibold", e.balance > 0 ? "text-amber-600" : e.balance < 0 ? "text-emerald-600" : "text-muted-foreground")}>
                        {e.balance !== 0 ? formatINR(Math.abs(e.balance)) : "—"}
                        {e.balance !== 0 && <span className="text-[9px] ml-0.5 text-muted-foreground">{e.balance > 0 ? "Dr" : "Cr"}</span>}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
              <tfoot><tr className="bg-muted/30 font-bold border-t-2 border-border/60">
                <td className="px-4 py-3" colSpan={3}>Closing Balance</td>
                <td className="px-2 py-3 text-right tnum">{formatINR(entries.reduce((s, e) => s + e.debit, 0))}</td>
                <td className="px-2 py-3 text-right tnum">{formatINR(entries.reduce((s, e) => s + e.credit, 0))}</td>
                <td className={cn("px-4 py-3 text-right tnum", closingPositive ? "text-amber-600" : "text-emerald-600")}>{formatINR(Math.abs(totals.closingBalance))} {closingPositive ? "Dr" : "Cr"}</td>
              </tr></tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2 print:hidden">
        {isCustomer && (
          <Button onClick={() => openView("sales", { action: "new" })} className="gap-1.5 bg-primary hover:bg-primary/90">
            <FileText className="w-4 h-4" /> New Invoice for {party.name.split(" ")[0]}
          </Button>
        )}
        {!isCustomer && (
          <Button onClick={() => openView("purchases")} className="gap-1.5 bg-primary hover:bg-primary/90">
            <ShoppingCart className="w-4 h-4" /> New Purchase
          </Button>
        )}
      </div>
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
