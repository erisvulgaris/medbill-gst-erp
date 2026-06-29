# 06 — Component Library

> **Status:** Source of truth for reusable components
> **Related:** `05_DESIGN_SYSTEM.md`, `07_UI_SCREEN_SPECIFICATION.md`

## 1. Component Tiers

MedBill has three component tiers:

| Tier | Location | Description |
|------|----------|-------------|
| **UI Primitives** | `src/components/ui/` | shadcn/ui (Radix-based) — vendored, don't modify |
| **App Components** | `src/components/app/` | MedBill-specific (sidebar, editors, viewers) |
| **Views** | `src/components/views/` | One per major screen (12 total) |

## 2. UI Primitives (shadcn/ui)

Available components (48 files in `src/components/ui/`):

### 2.1 Layout
- `Card`, `CardContent`, `CardHeader`, `CardTitle`, `CardDescription`, `CardFooter`
- `Separator`
- `ScrollArea`
- `ResizablePanel`

### 2.2 Forms
- `Button`, `Input`, `Textarea`, `Label`
- `Select`, `Checkbox`, `Switch`, `RadioGroup`
- `Slider`, `Toggle`, `ToggleGroup`
- `Form` (react-hook-form integration)
- `InputOTP`

### 2.3 Overlays
- `Dialog`, `AlertDialog`
- `Sheet` (side drawer)
- `Popover`, `HoverCard`
- `Tooltip`
- `DropdownMenu`, `ContextMenu`, `Menubar`
- `Command` (cmdk)
- `Drawer` (vaul)

### 2.4 Data Display
- `Table`, `Th`, `Td`, `Tr`
- `Badge`
- `Avatar`, `AvatarFallback`
- `Progress`
- `Skeleton`
- `Calendar`

### 2.5 Navigation
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- `NavigationMenu`
- `Breadcrumb`
- `Pagination`
- `Sidebar` (shadcn sidebar — not used, we have custom)

### 2.6 Feedback
- `Toast`, `Toaster`, `SonnerToaster`
- `Alert`, `AlertDialog`
- `Chart` (recharts wrapper)

## 3. App Components (MedBill-Specific)

### 3.1 Shell Components
| Component | File | Purpose |
|-----------|------|---------|
| `Sidebar` | `app/sidebar.tsx` | Desktop nav, collapsible, glass |
| `Topbar` | `app/topbar.tsx` | Search, notifications, theme toggle |
| `MobileBottomNav` | `app/mobile-bottom-nav.tsx` | 5-tab mobile nav, safe-area |
| `CommandPalette` | `app/command-palette.tsx` | ⌘K global search |
| `Onboarding` | `app/onboarding.tsx` | 4-step setup wizard |
| `ErrorBoundary` | `app/error-boundary.tsx` | View-level error catch |
| `ThemeProvider` | `components/theme-provider.tsx` | next-themes wrapper |
| `QueryProvider` | `components/query-provider.tsx` | TanStack Query client |

### 3.2 Feature Components
| Component | File | Purpose |
|-----------|------|---------|
| `InvoiceEditor` | `app/invoice-editor.tsx` | Create/edit invoice with live GST |
| `InvoiceViewer` | `app/invoice-viewer.tsx` | Printable invoice + collect payment |
| `QuotationEditor` | `app/quotation-editor.tsx` | Create quotation |
| `QuotationViewer` | `app/quotation-viewer.tsx` | View + convert to invoice |
| `PartyStatement` | `app/party-statement.tsx` | Party ledger with running balance |

### 3.3 Planned Extractions (FRONTEND_AUDIT §1.1)
| Component | Used in | Priority |
|-----------|---------|---------|
| `StatusBadge` | dashboard, sales, quotations, reports | P1 |
| `StatCard` | inventory, parties, purchases, expenses, reports, audit, quotations | P1 |
| `Field` | inventory, parties, settings, editors | P1 |
| `Row` | invoice-viewer, reports, quotation-viewer | P2 |
| `DocumentEditor` | invoice-editor, quotation-editor (shared) | P1 |

## 4. Component Patterns

### 4.1 Stat Card
```tsx
<Card className="p-4 shadow-card border-border/50">
  <div className={cn("grid place-items-center w-8 h-8 rounded-lg mb-2", accentBg)}>
    <Icon className="w-4 h-4" />
  </div>
  <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
  <p className="text-[18px] font-bold tnum tracking-tight mt-0.5">{value}</p>
</Card>
```

### 4.2 Status Badge
```tsx
const STATUS_COLORS = {
  paid: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  unpaid: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
  partial: "bg-blue-500/12 text-blue-700 dark:text-blue-300",
  overdue: "bg-red-500/12 text-red-700 dark:text-red-300",
};
<span className={cn("text-[10.5px] font-semibold px-1.5 py-0.5 rounded-md capitalize", STATUS_COLORS[status])}>
  {status}
</span>
```

### 4.3 Form Field
```tsx
<div className="space-y-1.5">
  <Label className="text-[11.5px] font-medium text-foreground/80">
    {label}{required && <span className="text-destructive"> *</span>}
  </Label>
  {children}
  {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
</div>
```

### 4.4 Money Input
```tsx
<div className="relative">
  <IndianRupee className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
  <Input type="number" className="pl-8 tnum" placeholder="0.00" />
</div>
```

### 4.5 Empty State
```tsx
<div className="py-20 text-center">
  <div className="grid place-items-center w-14 h-14 rounded-2xl bg-muted mx-auto mb-4">
    <Icon className="w-6 h-6 text-muted-foreground" />
  </div>
  <p className="text-[14px] font-semibold">No items found</p>
  <p className="text-[12.5px] text-muted-foreground mt-1">{helperText}</p>
  <Button className="mt-4 gap-1.5 bg-primary hover:bg-primary/90">
    <Plus className="w-4 h-4" /> {ctaLabel}
  </Button>
</div>
```

### 4.6 Loading Skeleton
```tsx
<div className="p-5 space-y-5">
  <Skeleton className="h-9 w-64" />
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
  </div>
  <Skeleton className="h-80 rounded-xl" />
</div>
```

## 5. View Components

### 5.1 Structure
Every view:
1. `'use client'` directive
2. Named export matching `XView` (e.g., `DashboardView`)
3. `data-testid="{view-name}-view"` on root
4. Uses `useAppStore` for navigation (if needed)
5. Uses `useQuery` for data fetching
6. Shows Skeleton while loading
7. Shows EmptyState when no data
8. Responsive (mobile-first)

### 5.2 List
| View | Key | Data Source |
|------|-----|-------------|
| `DashboardView` | `dashboard` | `GET /api/dashboard` |
| `SalesView` | `sales` | `GET /api/invoices` |
| `PosView` | `pos` | `GET /api/products` |
| `PurchasesView` | `purchases` | `GET /api/purchases` |
| `InventoryView` | `inventory` | `GET /api/products` |
| `PartiesView` | `parties` | `GET /api/parties` |
| `QuotationsView` | `quotations` | `GET /api/quotations` |
| `ExpensesView` | `expenses` | `GET /api/expenses` |
| `ReportsView` | `reports` | `GET /api/reports` |
| `GstView` | `gst` | `GET /api/gst` |
| `AuditView` | `audit` | `GET /api/audit` |
| `SettingsView` | `settings` | `GET /api/business` |

## 6. Props Conventions

- Always type props with an `interface` or `type`
- Callback props: `on<Action>` (e.g., `onSaved`, `onCancel`, `onBack`)
- Boolean props: `isOpen`, `isLoading` (not `open`, `loading`)
- Children: `React.ReactNode`

## 7. Accessibility

All components must:
- Have `aria-label` on icon-only buttons
- Support keyboard navigation (Radix handles this)
- Have visible focus rings (`outline-ring/50`)
- Use semantic HTML (`<main>`, `<header>`, `<nav>`, `<section>`)
- Have `data-testid` on interactive elements for testing

## 8. Adding a New Component

1. Create file in `src/components/app/{name}.tsx`
2. Add `'use client'` if it uses hooks/browser APIs
3. Export as named export
4. Add `data-testid`
5. Document in this file (§3)
6. Add to `06_COMPONENT_LIBRARY.md` if reusable
7. Write tests if it has logic (§16_TESTING_GUIDE)
