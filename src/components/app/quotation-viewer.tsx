"use client";

import * as React from "react";
import { api } from "@/lib/api";
import { formatINR, formatDateShort, amountInWords } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { ArrowLeft, Printer, Share2, FileText, Check, X, Clock, Send, ArrowRight, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

interface QuotationDetail {
  id: string; number: string; status: string; type: string;
  partyName: string; partyGstin: string | null; partyStateCode: string | null;
  quotationDate: string; validUntil: string | null; subject: string | null;
  subtotal: number; taxableValue: number; cgstTotal: number; sgstTotal: number;
  igstTotal: number; roundOff: number; grandTotal: number;
  notes: string | null; terms: string | null; items: any[];
  business: { name: string; legalName: string | null; gstin: string | null; pan: string | null; addressLine1: string | null; city: string | null; state: string | null; stateCode: string | null; pincode: string | null; phone: string | null; email: string | null; };
}

export function QuotationViewer({ quotationId, onBack, onConverted }: { quotationId: string; onBack: () => void; onConverted: (invoiceId: string) => void }) {
  const [data, setData] = React.useState<{ quotation: QuotationDetail } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const { openView } = useAppStore();

  React.useEffect(() => {
    (async () => {
      try {
        const d = await api<{ quotation: QuotationDetail }>(`/api/quotations/${quotationId}`);
        setData(d);
      } finally { setLoading(false); }
    })();
  }, [quotationId]);

  const updateStatus = async (status: string) => {
    setBusy(true);
    try {
      await api(`/api/quotations/${quotationId}`, { method: "PATCH", body: JSON.stringify({ status }) });
      toast.success(`Quotation marked as ${status}`);
      const d = await api<{ quotation: QuotationDetail }>(`/api/quotations/${quotationId}`);
      setData(d);
    } catch (e: any) { toast.error(e?.message); } finally { setBusy(false); }
  };

  const convert = async () => {
    if (!confirm("Convert this quotation to a tax invoice? Stock will be deducted.")) return;
    setBusy(true);
    try {
      const res = await api<{ ok: boolean; invoice: { id: string; number: string } }>(`/api/quotations/${quotationId}`, { method: "PATCH", body: JSON.stringify({ convertToInvoice: true }) });
      toast.success(`Converted to invoice ${res.invoice.number}`);
      onConverted(res.invoice.id);
    } catch (e: any) { toast.error(e?.message); } finally { setBusy(false); }
  };

  const shareWhatsApp = () => {
    if (!data) return;
    const qt = data.quotation;
    const msg = `*${qt.business.name}*\nQuotation ${qt.number}${qt.subject ? `\n${qt.subject}` : ""}\nAmount: ${formatINR(qt.grandTotal)}\nValid until: ${qt.validUntil ? formatDateShort(qt.validUntil) : "N/A"}\n\nThank you for your inquiry!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  if (loading || !data) return <div className="p-7"><div className="h-9 w-48 bg-muted rounded animate-pulse" /></div>;
  const qt = data.quotation;
  const b = qt.business;
  const isExpired = qt.validUntil && new Date(qt.validUntil) < new Date();
  const canConvert = qt.status !== "converted" && qt.status !== "rejected";

  return (
    <div className="p-4 sm:p-6 max-w-[900px] mx-auto print:p-0" data-testid="quotation-viewer">
      <div className="flex items-center justify-between gap-2 mb-4 print:hidden">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 h-9"><ArrowLeft className="w-4 h-4" /> Back</Button>
        <div className="flex gap-1.5 flex-wrap">
          <Button variant="outline" size="sm" onClick={shareWhatsApp} className="gap-1.5 h-9 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/8"><MessageCircle className="w-4 h-4" /> <span className="hidden sm:inline">WhatsApp</span></Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5 h-9"><Printer className="w-4 h-4" /> <span className="hidden sm:inline">Print</span></Button>
          {qt.status === "draft" && <Button variant="outline" size="sm" onClick={() => updateStatus("sent")} disabled={busy} className="gap-1.5 h-9"><Send className="w-4 h-4" /> <span className="hidden sm:inline">Mark Sent</span></Button>}
          {qt.status === "sent" && <Button variant="outline" size="sm" onClick={() => updateStatus("accepted")} disabled={busy} className="gap-1.5 h-9 text-emerald-600 hover:text-emerald-700"><Check className="w-4 h-4" /> <span className="hidden sm:inline">Accept</span></Button>}
          {qt.status === "sent" && <Button variant="outline" size="sm" onClick={() => updateStatus("rejected")} disabled={busy} className="gap-1.5 h-9 text-red-600 hover:text-red-700"><X className="w-4 h-4" /> <span className="hidden sm:inline">Reject</span></Button>}
          {canConvert && (
            <Button size="sm" onClick={convert} disabled={busy} className="gap-1.5 h-9 bg-primary hover:bg-primary/90" data-testid="convert-to-invoice">
              <ArrowRight className="w-4 h-4" /> <span className="hidden sm:inline">Convert to Invoice</span>
            </Button>
          )}
        </div>
      </div>

      {/* Status banner */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className={cn("rounded-xl border p-3.5 mb-4 flex items-center gap-3 print:hidden", qt.status === "accepted" ? "bg-emerald-500/8 border-emerald-500/25" : qt.status === "rejected" ? "bg-red-500/8 border-red-500/25" : qt.status === "converted" ? "bg-blue-500/8 border-blue-500/25" : isExpired ? "bg-amber-500/8 border-amber-500/25" : "bg-blue-500/8 border-blue-500/25")}>
        <div className={cn("grid place-items-center w-9 h-9 rounded-lg shrink-0", qt.status === "accepted" ? "bg-emerald-500/15 text-emerald-600" : qt.status === "rejected" ? "bg-red-500/15 text-red-600" : qt.status === "converted" ? "bg-blue-500/15 text-blue-600" : "bg-blue-500/15 text-blue-600")}>
          {qt.status === "accepted" ? <Check className="w-5 h-5" /> : qt.status === "rejected" ? <X className="w-5 h-5" /> : qt.status === "converted" ? <FileText className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
        </div>
        <div className="flex-1">
          <p className="text-[13px] font-semibold capitalize">
            {qt.status === "converted" ? "Converted to Invoice" : qt.status}
            {isExpired && qt.status !== "converted" && " · Expired"}
          </p>
          <p className="text-[11.5px] text-muted-foreground">
            {qt.validUntil && <>Valid until {formatDateShort(qt.validUntil)}</>}
            {qt.status === "converted" && " — This quotation has been turned into a tax invoice."}
          </p>
        </div>
      </motion.div>

      {/* Quotation paper */}
      <div className="bg-white dark:bg-card rounded-2xl shadow-float border border-border/40 overflow-hidden print:shadow-none print:border-0 print:rounded-none">
        <div className="bg-gradient-to-br from-amber-500 to-amber-700 text-white p-6 print:bg-amber-600">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="grid place-items-center w-10 h-10 rounded-xl bg-white/15 backdrop-blur"><span className="font-bold text-lg">M</span></div>
                <div><h2 className="text-[17px] font-bold leading-tight">{b.name}</h2>{b.legalName && <p className="text-[11px] text-white/80">{b.legalName}</p>}</div>
              </div>
              <div className="text-[11.5px] text-white/85 mt-1.5 leading-relaxed">
                {b.addressLine1}<br />{[b.city, b.state, b.pincode].filter(Boolean).join(", ")}<br />
                {b.phone && <span>📞 {b.phone}</span>} {b.email && <span className="ml-2">✉ {b.email}</span>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10.5px] uppercase tracking-wider text-white/70 font-semibold">Quotation</div>
              <div className="text-[20px] font-bold font-mono mt-0.5">{qt.number}</div>
              <div className="mt-2 text-[11.5px] text-white/85">
                <div>Date: <span className="font-medium">{formatDateShort(qt.quotationDate)}</span></div>
                {qt.validUntil && <div>Valid Until: <span className="font-medium">{formatDateShort(qt.validUntil)}</span></div>}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-white/15 text-[11px]">
            <span><span className="text-white/70">GSTIN:</span> <span className="font-mono font-medium">{b.gstin || "—"}</span></span>
            {b.pan && <span><span className="text-white/70">PAN:</span> <span className="font-mono font-medium">{b.pan}</span></span>}
          </div>
        </div>

        {qt.subject && <div className="px-6 py-3 border-b border-border/40 bg-muted/20"><p className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Subject</p><p className="text-[13px] font-medium">{qt.subject}</p></div>}

        <div className="grid sm:grid-cols-2 gap-4 p-6 border-b border-border/40">
          <div><p className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Quotation To</p><p className="text-[14px] font-semibold">{qt.partyName}</p>{qt.partyGstin && <p className="text-[11.5px] text-muted-foreground font-mono mt-0.5">GSTIN: {qt.partyGstin}</p>}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead><tr className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="text-left font-semibold px-4 py-2.5">#</th>
              <th className="text-left font-semibold px-2 py-2.5">Item</th>
              <th className="text-left font-semibold px-2 py-2.5 w-20">HSN</th>
              <th className="text-right font-semibold px-2 py-2.5 w-16">Qty</th>
              <th className="text-right font-semibold px-2 py-2.5 w-24">Rate</th>
              <th className="text-right font-semibold px-2 py-2.5 w-24">Taxable</th>
              {qt.supplyType === "intra" ? (
                <><th className="text-right font-semibold px-2 py-2.5 w-20">CGST</th><th className="text-right font-semibold px-2 py-2.5 w-20">SGST</th></>
              ) : <th className="text-right font-semibold px-2 py-2.5 w-24">IGST</th>}
              <th className="text-right font-semibold px-4 py-2.5 w-24">Total</th>
            </tr></thead>
            <tbody>
              {qt.items.map((it, i) => (
                <tr key={it.id} className="border-b border-border/30">
                  <td className="px-4 py-2.5 text-muted-foreground tnum">{i + 1}</td>
                  <td className="px-2 py-2.5 font-medium">{it.name}</td>
                  <td className="px-2 py-2.5 text-muted-foreground font-mono text-[11px]">{it.hsn || "—"}</td>
                  <td className="px-2 py-2.5 text-right tnum">{it.quantity} {it.unit || ""}</td>
                  <td className="px-2 py-2.5 text-right tnum">{formatINR(it.price)}</td>
                  <td className="px-2 py-2.5 text-right tnum">{formatINR(it.taxable)}</td>
                  {qt.supplyType === "intra" ? (
                    <><td className="px-2 py-2.5 text-right tnum text-muted-foreground">{formatINR(it.cgst)}</td><td className="px-2 py-2.5 text-right tnum text-muted-foreground">{formatINR(it.sgst)}</td></>
                  ) : <td className="px-2 py-2.5 text-right tnum text-muted-foreground">{formatINR(it.igst)}</td>}
                  <td className="px-4 py-2.5 text-right tnum font-semibold">{formatINR(it.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 p-6 border-t border-border/40">
          <div className="space-y-2 order-2 sm:order-1">
            {qt.notes && <div><p className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Notes</p><p className="text-[11.5px] text-muted-foreground leading-relaxed">{qt.notes}</p></div>}
            {qt.terms && <div><p className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Terms</p><p className="text-[11.5px] text-muted-foreground leading-relaxed">{qt.terms}</p></div>}
            <div className="pt-2 border-t border-border/30"><p className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Amount in Words</p><p className="text-[11.5px] italic">{amountInWords(qt.grandTotal)}</p></div>
          </div>
          <div className="order-1 sm:order-2">
            <div className="rounded-xl bg-muted/30 p-4 space-y-1.5 ml-auto max-w-xs border border-border/40">
              <div className="flex items-center justify-between text-[12px]"><span className="text-foreground/80">Subtotal</span><span className="tnum font-medium">{formatINR(qt.subtotal)}</span></div>
              <div className="flex items-center justify-between text-[12px]"><span className="text-foreground/80">Taxable Value</span><span className="tnum font-medium">{formatINR(qt.taxableValue)}</span></div>
              <div className="border-t border-border/50 pt-2 mt-1 flex items-center justify-between">
                <span className="text-[13px] font-semibold">Grand Total</span>
                <span className="text-[18px] font-bold tnum text-primary">{formatINR(qt.grandTotal)}</span>
              </div>
              <p className="text-[10.5px] text-muted-foreground italic mt-1">{amountInWords(qt.grandTotal)}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-muted/20 border-t border-border/40 flex items-center justify-between text-[10.5px] text-muted-foreground">
          <span>This is a computer-generated quotation. Prices subject to terms above.</span>
          <span>Generated by MedBill</span>
        </div>
      </div>
    </div>
  );
}
