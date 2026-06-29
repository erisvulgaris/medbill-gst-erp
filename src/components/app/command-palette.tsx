"use client";

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { useAppStore } from "@/lib/store";
import { visibleNavItems } from "@/lib/nav";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Search, Plus, FileText, Package, Users, Receipt, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { formatINR, formatDateShort } from "@/lib/format";
import { cn } from "@/lib/utils";

export function CommandPalette() {
  const { commandOpen, setCommandOpen, openView, business } = useAppStore();
  const [query, setQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<any[]>([]);

  const navItems = React.useMemo(() => visibleNavItems(business?.modules), [business?.modules]);

  React.useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const [inv, parties, products] = await Promise.all([
          api<{ items: any[] }>(`/api/invoices?q=${encodeURIComponent(query)}&limit=4`),
          api<{ items: any[] }>(`/api/parties?q=${encodeURIComponent(query)}`),
          api<{ items: any[] }>(`/api/products?q=${encodeURIComponent(query)}`),
        ]);
        const results = [
          ...inv.items.slice(0, 3).map((i) => ({ type: "invoice", id: i.id, title: i.number, subtitle: i.partyName, value: i.grandTotal, status: i.status, date: i.invoiceDate })),
          ...parties.items.slice(0, 3).map((p) => ({ type: "party", id: p.id, title: p.name, subtitle: p.phone || p.gstin, value: p.outstanding })),
          ...products.items.slice(0, 3).map((p) => ({ type: "product", id: p.id, title: p.name, subtitle: p.sku, value: p.salePrice })),
        ];
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const run = (cb: () => void) => {
    cb();
    setCommandOpen(false);
    setQuery("");
  };

  return (
    <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
      <DialogContent className="p-0 overflow-hidden max-w-2xl gap-0 bg-popover/95 backdrop-blur-xl" showCloseButton={false}>
        <CommandPrimitive className="flex flex-col" shouldFilter={false}>
          <div className="flex items-center gap-3 px-4 h-14 border-b border-border/60">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <CommandPrimitive.Input
              placeholder="Search invoices, parties, products or jump to…"
              value={query}
              onValueChange={setQuery}
              className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-muted-foreground"
              autoFocus
              data-testid="command-input"
            />
            <kbd className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5 font-mono">ESC</kbd>
          </div>
          <CommandPrimitive.List className="max-h-[60vh] overflow-y-auto p-2">
            {/* Quick actions */}
            <CommandPrimitive.Group heading="Quick Actions" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-2 pt-2 pb-1">
              <CommandItem onSelect={() => run(() => openView("sales", { action: "new" }))} icon={<Plus className="w-4 h-4" />} title="Create new invoice" subtitle="Start a GST tax invoice" />
              <CommandItem onSelect={() => run(() => openView("pos"))} icon={<Receipt className="w-4 h-4" />} title="Open POS billing" subtitle="Quick counter sale" />
              <CommandItem onSelect={() => run(() => openView("inventory", { action: "new" }))} icon={<Package className="w-4 h-4" />} title="Add new product" subtitle="Create inventory item" />
              <CommandItem onSelect={() => run(() => openView("parties", { action: "new" }))} icon={<Users className="w-4 h-4" />} title="Add party" subtitle="Customer or supplier" />
            </CommandPrimitive.Group>

            {/* Navigation */}
            {!query && (
              <CommandPrimitive.Group heading="Navigate" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-2 pt-3 pb-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.key}
                      onSelect={() => run(() => openView(item.key))}
                      icon={<Icon className="w-4 h-4" />}
                      title={item.label}
                      subtitle={item.desc}
                      trailing={<ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />}
                    />
                  );
                })}
              </CommandPrimitive.Group>
            )}

            {/* Search results */}
            {query && searchResults.length > 0 && (
              <CommandPrimitive.Group heading="Results" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-2 pt-3 pb-1">
                {searchResults.map((r) => {
                  const icon = r.type === "invoice" ? <FileText className="w-4 h-4" /> : r.type === "party" ? <Users className="w-4 h-4" /> : <Package className="w-4 h-4" />;
                  return (
                    <CommandItem
                      key={`${r.type}-${r.id}`}
                      onSelect={() => run(() => {
                        if (r.type === "invoice") openView("sales", { action: "view", id: r.id });
                        else if (r.type === "party") openView("parties", { action: "view", id: r.id });
                        else openView("inventory", { action: "view", id: r.id });
                      })}
                      icon={icon}
                      title={r.title}
                      subtitle={r.subtitle}
                      trailing={
                        <span className="text-[12px] font-semibold tnum text-muted-foreground">
                          {r.type === "invoice" ? formatINR(r.value) : r.type === "party" ? `Out: ${formatINR(r.value)}` : formatINR(r.value)}
                        </span>
                      }
                    />
                  );
                })}
              </CommandPrimitive.Group>
            )}

            {query && searchResults.length === 0 && (
              <div className="py-10 text-center text-sm text-muted-foreground">No results for “{query}”</div>
            )}
          </CommandPrimitive.List>
        </CommandPrimitive>
      </DialogContent>
    </Dialog>
  );
}

function CommandItem({
  onSelect,
  icon,
  title,
  subtitle,
  trailing,
}: {
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <CommandPrimitive.Item
      onSelect={onSelect}
      className={cn(
        "flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-[13.5px] cursor-pointer transition-colors",
        "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
      )}
    >
      <span className="grid place-items-center w-8 h-8 rounded-lg bg-muted/70 text-muted-foreground shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{title}</div>
        {subtitle && <div className="text-[11.5px] text-muted-foreground truncate">{subtitle}</div>}
      </div>
      {trailing}
    </CommandPrimitive.Item>
  );
}
