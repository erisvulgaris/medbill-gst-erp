"use client";

import * as React from "react";
import { api } from "@/lib/api";
import { formatINR, formatDate, amountInWords, formatDateShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, Download, Share2, ArrowLeft, Trash2, CheckCircle2, Clock, X } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";

interface InvoiceDetail {
  id: string; number: string; type: string; status: string;
  partyName: string; partyGstin: string | null; partyStateCode: string | null;
  invoiceDate: string; dueDate: string | null; supplyType: string;
  subtotal: number; taxableValue: number; cgstTotal: number; sgstTotal: number;
  igstTotal: number; roundOff: number; grandTotal: number; paidAmount: number;
  balance: number; notes: string | null; terms: string | null;
  items: any[]; payments: any[];
  business: {
    name: string; legalName: string | null; gstin: string | null; pan: string | null;
    addressLine1: string | null; city: string | null; state: string | null;
    stateCode: string | null; pincode: string | null; phone: string | null; email: string | null;
  };
}

export function InvoiceViewer({ invoiceId, onBack, onDeleted }: { invoiceId: string; onBack: () => void; onDeleted: () => void }) {
  const { data, isLoading } = useInvoice(invoiceId);
  const [deleting, setDeleting] = React.useState(false);
  const { openView } = useAppStore();

  const handlePrint = () => {
    window.print();
  };

  const handleDelete = async () => {
    if (!confirm("Cancel this invoice? Stock will be restored and payments removed.")) return;
    setDeleting(true);
    try {
      await api(`/api/invoices/${invoiceId}`, { method: "DELETE" });
      toast.success("Invoice cancelled");
      onDeleted();
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setDeleting(false);
    }
  };

  const handleShare = async () => {
    if (!data) return;
    const text = `Invoice ${data.invoice.number} from ${data.invoice.business.name} — Total ${formatINR(data.invoice.grandTotal)}`;
    if (navigator.share) {
      try { await navigator.share({ title: `Invoice ${data.invoice.number}`, text }); } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("Invoice summary copied");
    }
  };

  if (isLoading || !data) {
    return <div className="p-7"><div className="h-9 w-48 bg-muted rounded animate-pulse" /></div>;
  }

  const inv = data.invoice;
  const b = inv.business;

  return (
    <div className="p-4 sm:p-6 max-w-[900px] mx-auto print:p-0" data-testid="invoice-viewer">
      {/* Action bar */}
      <div className="flex items-center justify-between gap-2 mb-4 print:hidden">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 h-9">
          <ArrowLeft className="w-4 h-4" /> Back to invoices
        </Button>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" onClick={handleShare} className="gap-1.5 h-9">
            <Share2 className="w-4 h-4" /> <span className="hidden sm:inline">Share</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 h-9" data-testid="print-invoice">
            <Printer className="w-4 h-4" /> <span className="hidden sm:inline">Print</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleting} className="gap-1.5 h-9 text-destructive hover:text-destructive">
            <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">Cancel</span>
          </Button>
        </div>
      </div>

      {/* Invoice paper */}
      <div className="bg-white rounded-2xl shadow-float border border-border/40 overflow-hidden print:shadow-none print:border-0 print:rounded-none">
        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-6 print:bg-emerald-700">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="grid place-items-center w-10 h-10 rounded-xl bg-white/15 backdrop-blur">
                  <span className="font-bold text-lg">M</span>
                </div>
                <div>
                  <h2 className="text-[17px] font-bold leading-tight">{b.name}</h2>
                  {b.legalName && <p className="text-[11px] text-white/80">{b.legalName}</p>}
                </div>
              </div>
              <div className="text-[11.5px] text-white/85 mt-1.5 leading-relaxed">
                {b.addressLine1}<br />
                {[b.city, b.state, b.pincode].filter(Boolean).join(", ")}<br />
                {b.phone && <span>📞 {b.phone}</span>} {b.email && <span className="ml-2">✉ {b.email}</span>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10.5px] uppercase tracking-wider text-white/70 font-semibold">Tax Invoice</div>
              <div className="text-[20px] font-bold font-mono mt-0.5">{inv.number}</div>
              <div className="mt-2 text-[11.5px] text-white/85">
                <div>Date: <span className="font-medium">{formatDateShort(inv.invoiceDate)}</span></div>
                {inv.dueDate && <div>Due: <span className="font-medium">{formatDateShort(inv.dueDate)}</span></div>}
              </div>
              <div className="mt-2 inline-flex">
                <StatusPill status={inv.status} />
              </div>
            </div>
          </div>
          <div className="flex gap-4 mt-3 pt-3 border-t border-white/15 text-[11px]">
            <span><span className="text-white/70">GSTIN:</span> <span className="font-mono font-medium">{b.gstin || "—"}</span></span>
            {b.pan && <span><span className="text-white/70">PAN:</span> <span className="font-mono font-medium">{b.pan}</span></span>}
            <span className="ml-auto"><span className="text-white/70">Supply:</span> <span className="font-medium capitalize">{inv.supplyType === "intra" ? "Intra-state" : "Inter-state"}</span></span>
          </div>
        </div>

        {/* Bill to */}
        <div className="grid sm:grid-cols-2 gap-4 p-6 border-b border-border/40">
          <div>
            <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Bill To</p>
            <p className="text-[14px] font-semibold">{inv.partyName}</p>
            {inv.partyGstin && <p className="text-[11.5px] text-muted-foreground font-mono mt-0.5">GSTIN: {inv.partyGstin}</p>}
            {inv.partyStateCode && <p className="text-[11.5px] text-muted-foreground">State Code: {inv.partyStateCode}</p>}
          </div>
          <div className="sm:text-right">
            <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Payment</p>
            <p className="text-[13px] font-semibold tnum">{formatINR(inv.paidAmount)} paid</p>
            <p className="text-[11.5px] text-muted-foreground tnum">Balance: {formatINR(inv.balance)}</p>
          </div>
        </div>

        {/* Items */}
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="text-left font-semibold px-4 py-2.5">#</th>
                <th className="text-left font-semibold px-2 py-2.5">Item</th>
                <th className="text-left font-semibold px-2 py-2.5 w-20">HSN</th>
                <th className="text-right font-semibold px-2 py-2.5 w-16">Qty</th>
                <th className="text-right font-semibold px-2 py-2.5 w-24">Rate</th>
                <th className="text-right font-semibold px-2 py-2.5 w-24">Taxable</th>
                {inv.supplyType === "intra" ? (
                  <>
                    <th className="text-right font-semibold px-2 py-2.5 w-20">CGST</th>
                    <th className="text-right font-semibold px-2 py-2.5 w-20">SGST</th>
                  </>
                ) : (
                  <th className="text-right font-semibold px-2 py-2.5 w-24">IGST</th>
                )}
                <th className="text-right font-semibold px-4 py-2.5 w-24">Total</th>
              </tr>
            </thead>
            <tbody>
              {inv.items.map((it, i) => (
                <tr key={it.id} className="border-b border-border/30">
                  <td className="px-4 py-2.5 text-muted-foreground tnum">{i + 1}</td>
                  <td className="px-2 py-2.5 font-medium">{it.name}</td>
                  <td className="px-2 py-2.5 text-muted-foreground font-mono text-[11px]">{it.hsn || "—"}</td>
                  <td className="px-2 py-2.5 text-right tnum">{it.quantity} {it.unit || ""}</td>
                  <td className="px-2 py-2.5 text-right tnum">{formatINR(it.price)}</td>
                  <td className="px-2 py-2.5 text-right tnum">{formatINR(it.taxable)}</td>
                  {inv.supplyType === "intra" ? (
                    <>
                      <td className="px-2 py-2.5 text-right tnum text-muted-foreground">{formatINR(it.cgst)}<br /><span className="text-[9px]">{it.taxRate / 2}%</span></td>
                      <td className="px-2 py-2.5 text-right tnum text-muted-foreground">{formatINR(it.sgst)}<br /><span className="text-[9px]">{it.taxRate / 2}%</span></td>
                    </>
                  ) : (
                    <td className="px-2 py-2.5 text-right tnum text-muted-foreground">{formatINR(it.igst)}<br /><span className="text-[9px]">{it.taxRate}%</span></td>
                  )}
                  <td className="px-4 py-2.5 text-right tnum font-semibold">{formatINR(it.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="grid sm:grid-cols-2 gap-4 p-6 border-t border-border/40">
          <div className="space-y-2 order-2 sm:order-1">
            {inv.notes && (
              <div>
                <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Notes</p>
                <p className="text-[11.5px] text-muted-foreground leading-relaxed">{inv.notes}</p>
              </div>
            )}
            {inv.terms && (
              <div>
                <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Terms</p>
                <p className="text-[11.5px] text-muted-foreground leading-relaxed">{inv.terms}</p>
              </div>
            )}
            <div className="pt-2 border-t border-border/30">
              <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Amount in Words</p>
              <p className="text-[11.5px] italic">{amountInWords(inv.grandTotal)}</p>
            </div>
          </div>
          <div className="order-1 sm:order-2">
            <div className="rounded-xl bg-muted/30 p-4 space-y-1.5 ml-auto max-w-xs">
              <Row label="Subtotal" value={formatINR(inv.subtotal)} />
              <Row label="Taxable Value" value={formatINR(inv.taxableValue)} />
              {inv.supplyType === "intra" ? (
                <>
                  <Row label="CGST" value={formatINR(inv.cgstTotal)} muted />
                  <Row label="SGST" value={formatINR(inv.sgstTotal)} muted />
                </>
              ) : (
                <Row label="IGST" value={formatINR(inv.igstTotal)} muted />
              )}
              {inv.roundOff !== 0 && <Row label="Round Off" value={`${inv.roundOff > 0 ? "+" : ""}${formatINR(inv.roundOff)}`} muted />}
              <div className="border-t border-border/50 pt-2 mt-1 flex items-center justify-between">
                <span className="text-[13px] font-semibold">Grand Total</span>
                <span className="text-[18px] font-bold tnum text-primary">{formatINR(inv.grandTotal)}</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11.5px] text-muted-foreground">Paid</span>
                <span className="text-[12px] font-medium tnum text-emerald-600">{formatINR(inv.paidAmount)}</span>
              </div>
              {inv.balance > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[11.5px] text-muted-foreground">Balance Due</span>
                  <span className="text-[13px] font-bold tnum text-amber-600">{formatINR(inv.balance)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-muted/20 border-t border-border/40 flex items-center justify-between text-[10.5px] text-muted-foreground">
          <span>This is a computer-generated invoice and does not require a signature.</span>
          <span>Generated by MedBill</span>
        </div>
      </div>
    </div>
  );
}

function useInvoice(id: string) {
  const [data, setData] = React.useState<{ invoice: InvoiceDetail } | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  React.useEffect(() => {
    (async () => {
      try {
        const d = await api<{ invoice: InvoiceDetail }>(`/api/invoices/${id}`);
        setData(d);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);
  return { data, isLoading };
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className={cn(muted ? "text-muted-foreground" : "text-foreground/80")}>{label}</span>
      <span className={cn("tnum font-medium", muted ? "text-muted-foreground" : "text-foreground")}>{value}</span>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    paid: { cls: "bg-emerald-500/90 text-white", icon: <CheckCircle2 className="w-3 h-3" />, label: "PAID" },
    unpaid: { cls: "bg-amber-500/90 text-white", icon: <Clock className="w-3 h-3" />, label: "UNPAID" },
    partial: { cls: "bg-blue-500/90 text-white", icon: <Clock className="w-3 h-3" />, label: "PARTIAL" },
    overdue: { cls: "bg-red-500/90 text-white", icon: <Clock className="w-3 h-3" />, label: "OVERDUE" },
    draft: { cls: "bg-white/20 text-white", icon: <X className="w-3 h-3" />, label: "DRAFT" },
    cancelled: { cls: "bg-white/20 text-white line-through", icon: <X className="w-3 h-3" />, label: "CANCELLED" },
  };
  const s = map[status] || map.draft;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold", s.cls)}>
      {s.icon} {s.label}
    </span>
  );
}
