"use client";

import * as React from "react";
import { api } from "@/lib/api";
import { formatINR, formatDate, formatDateShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Landmark, FileText, Download, CalendarDays, TrendingUp, Wallet,
  Percent, Hash, AlertCircle, CheckCircle2, Loader2,
} from "lucide-react";

function firstOfMonth() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); }
function today() { return new Date().toISOString().slice(0, 10); }

export function GstView() {
  const [from, setFrom] = React.useState(firstOfMonth());
  const [to, setTo] = React.useState(today());
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const d = await api(`/api/gst?from=${from}&to=${to}`);
      setData(d);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load GST data");
    } finally { setLoading(false); }
  }, [from, to]);

  React.useEffect(() => { load(); }, [from, to]);

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-5" data-testid="gst-view">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-[22px] font-bold tracking-tight flex items-center gap-2"><Landmark className="w-5 h-5 text-primary" /> GST Returns</h1>
          <p className="text-[12.5px] text-muted-foreground mt-0.5">GSTR-1 outward supplies, HSN summary & tax liability</p>
        </div>
        <Button variant="outline" onClick={() => toast.success("GSTR-1 JSON exported (demo)")} className="gap-1.5 h-9"><Download className="w-4 h-4" /> Export GSTR-1 JSON</Button>
      </div>

      {/* Period */}
      <Card className="p-3 flex flex-wrap items-end gap-3 shadow-card border-border/50">
        <div className="space-y-1.5"><Label className="text-[11.5px]">Period From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-[160px]" /></div>
        <div className="space-y-1.5"><Label className="text-[11.5px]">To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-[160px]" /></div>
        <div className="ml-auto flex items-center gap-2 text-[12px] text-muted-foreground"><CalendarDays className="w-4 h-4" /><span>{formatDateShort(from)} → {formatDateShort(to)}</span></div>
      </Card>

      {/* Filing status banner */}
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-gradient-to-r from-emerald-500/10 to-amber-500/10 border border-emerald-500/20 p-4 flex items-start gap-3">
        <div className="grid place-items-center w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-600 shrink-0"><CheckCircle2 className="w-5 h-5" /></div>
        <div className="flex-1">
          <p className="text-[13px] font-semibold">GSTR-1 ready to file</p>
          <p className="text-[11.5px] text-muted-foreground mt-0.5">For the period {formatDate(from)} to {formatDate(to)}. Review the summary below and file on the GST portal.</p>
        </div>
        <Button size="sm" className="bg-primary hover:bg-primary/90 gap-1.5" onClick={() => toast.info("Redirect to GST portal (demo)")}><FileText className="w-4 h-4" /> File Now</Button>
      </motion.div>

      {loading || !data ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      ) : (
        <>
          {/* Tax liability cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <LiabCard icon={TrendingUp} label="Taxable Value" value={formatINR(data.totals.taxable)} accent="primary" />
            <LiabCard icon={Percent} label="CGST" value={formatINR(data.totals.cgst)} accent="emerald" />
            <LiabCard icon={Percent} label="SGST" value={formatINR(data.totals.sgst)} accent="emerald" />
            <LiabCard icon={Wallet} label="IGST" value={formatINR(data.totals.igst)} accent="amber" />
          </div>

          <Tabs defaultValue="invoices">
            <TabsList className="bg-muted/60">
              <TabsTrigger value="invoices" className="text-[12.5px] gap-1.5"><FileText className="w-3.5 h-3.5" /> B2B / Invoices ({data.invoices.length})</TabsTrigger>
              <TabsTrigger value="hsn" className="text-[12.5px] gap-1.5"><Hash className="w-3.5 h-3.5" /> HSN Summary</TabsTrigger>
              <TabsTrigger value="rate" className="text-[12.5px] gap-1.5"><Percent className="w-3.5 h-3.5" /> Rate-wise</TabsTrigger>
            </TabsList>

            {/* Invoices tab */}
            <TabsContent value="invoices">
              <Card className="shadow-card border-border/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-[12.5px]">
                    <thead><tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground bg-muted/30 border-b border-border/50">
                      <th className="text-left font-semibold px-3 py-2.5">Invoice</th>
                      <th className="text-left font-semibold px-2 py-2.5">Party</th>
                      <th className="text-left font-semibold px-2 py-2.5 hidden md:table-cell">GSTIN</th>
                      <th className="text-left font-semibold px-2 py-2.5 hidden sm:table-cell">Date</th>
                      <th className="text-left font-semibold px-2 py-2.5 hidden lg:table-cell">Supply</th>
                      <th className="text-right font-semibold px-2 py-2.5">Taxable</th>
                      <th className="text-right font-semibold px-2 py-2.5 hidden sm:table-cell">Tax</th>
                      <th className="text-right font-semibold px-3 py-2.5">Total</th>
                    </tr></thead>
                    <tbody>
                      {data.invoices.map((inv: any, i: number) => (
                        <motion.tr key={inv.number} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.02, 0.3) }} className="border-b border-border/30 hover:bg-muted/20">
                          <td className="px-3 py-2"><span className="font-mono font-semibold">{inv.number}</span></td>
                          <td className="px-2 py-2 font-medium truncate max-w-[150px]">{inv.partyName}</td>
                          <td className="px-2 py-2 hidden md:table-cell font-mono text-[11px] text-muted-foreground">{inv.partyGstin || "Unregistered"}</td>
                          <td className="px-2 py-2 hidden sm:table-cell text-muted-foreground tnum">{formatDateShort(inv.invoiceDate)}</td>
                          <td className="px-2 py-2 hidden lg:table-cell"><Badge variant="outline" className="text-[10px] capitalize">{inv.supplyType}</Badge></td>
                          <td className="px-2 py-2 text-right tnum">{formatINR(inv.taxableValue)}</td>
                          <td className="px-2 py-2 text-right tnum text-muted-foreground hidden sm:table-cell">{formatINR(inv.cgstTotal + inv.sgstTotal + inv.igstTotal)}</td>
                          <td className="px-3 py-2 text-right tnum font-semibold">{formatINR(inv.grandTotal)}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </TabsContent>

            {/* HSN tab */}
            <TabsContent value="hsn">
              <Card className="shadow-card border-border/50 overflow-hidden">
                <div className="p-4 border-b border-border/50"><h3 className="text-[14px] font-semibold flex items-center gap-2"><Hash className="w-4 h-4 text-primary" /> HSN/SAC-wise Summary</h3><p className="text-[11.5px] text-muted-foreground mt-0.5">Required for GSTR-1 filing</p></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[12.5px]">
                    <thead><tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground bg-muted/30 border-b border-border/50">
                      <th className="text-left font-semibold px-3 py-2.5">HSN/SAC</th>
                      <th className="text-right font-semibold px-2 py-2.5">Qty</th>
                      <th className="text-right font-semibold px-2 py-2.5">Taxable</th>
                      <th className="text-right font-semibold px-2 py-2.5 hidden sm:table-cell">CGST</th>
                      <th className="text-right font-semibold px-2 py-2.5 hidden sm:table-cell">SGST</th>
                      <th className="text-right font-semibold px-2 py-2.5 hidden sm:table-cell">IGST</th>
                      <th className="text-right font-semibold px-3 py-2.5">Total Tax</th>
                    </tr></thead>
                    <tbody>
                      {data.hsnSummary.map((h: any) => (
                        <tr key={h.hsn} className="border-b border-border/30 hover:bg-muted/20">
                          <td className="px-3 py-2 font-mono font-semibold">{h.hsn}</td>
                          <td className="px-2 py-2 text-right tnum">{h.qty}</td>
                          <td className="px-2 py-2 text-right tnum">{formatINR(h.taxable)}</td>
                          <td className="px-2 py-2 text-right tnum text-muted-foreground hidden sm:table-cell">{formatINR(h.cgst)}</td>
                          <td className="px-2 py-2 text-right tnum text-muted-foreground hidden sm:table-cell">{formatINR(h.sgst)}</td>
                          <td className="px-2 py-2 text-right tnum text-muted-foreground hidden sm:table-cell">{formatINR(h.igst)}</td>
                          <td className="px-3 py-2 text-right tnum font-semibold">{formatINR(h.cgst + h.sgst + h.igst)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr className="bg-muted/30 font-semibold border-t-2 border-border/60">
                      <td className="px-3 py-2.5">Total</td>
                      <td className="px-2 py-2.5"></td>
                      <td className="px-2 py-2.5 text-right tnum">{formatINR(data.totals.taxable)}</td>
                      <td className="px-2 py-2.5 text-right tnum hidden sm:table-cell">{formatINR(data.totals.cgst)}</td>
                      <td className="px-2 py-2.5 text-right tnum hidden sm:table-cell">{formatINR(data.totals.sgst)}</td>
                      <td className="px-2 py-2.5 text-right tnum hidden sm:table-cell">{formatINR(data.totals.igst)}</td>
                      <td className="px-3 py-2.5 text-right tnum">{formatINR(data.totals.cgst + data.totals.sgst + data.totals.igst)}</td>
                    </tr></tfoot>
                  </table>
                </div>
              </Card>
            </TabsContent>

            {/* Rate-wise */}
            <TabsContent value="rate">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.rateSummary.map((r: any) => (
                  <Card key={r.rate} className="p-4 shadow-card border-border/50">
                    <div className="flex items-center justify-between">
                      <div className="grid place-items-center w-10 h-10 rounded-xl bg-primary/10 text-primary"><Percent className="w-5 h-5" /></div>
                      <Badge variant="secondary" className="text-[12px] font-bold">{r.rate}% GST</Badge>
                    </div>
                    <div className="mt-3 space-y-1.5">
                      <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">Taxable</span><span className="font-semibold tnum">{formatINR(r.taxable)}</span></div>
                      <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">Tax Collected</span><span className="font-semibold tnum text-primary">{formatINR(r.cgst + r.sgst + r.igst)}</span></div>
                      <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">Invoices</span><span className="font-semibold tnum">{r.count}</span></div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function LiabCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent: "primary" | "emerald" | "amber" }) {
  const map = { primary: "bg-primary/10 text-primary", emerald: "bg-emerald-500/12 text-emerald-600", amber: "bg-amber-500/12 text-amber-600" }[accent];
  return (
    <Card className="p-4 shadow-card border-border/50">
      <div className={cn("grid place-items-center w-8 h-8 rounded-lg mb-2", map)}><Icon className="w-4 h-4" /></div>
      <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
      <p className="text-[18px] font-bold tnum tracking-tight mt-0.5">{value}</p>
    </Card>
  );
}
