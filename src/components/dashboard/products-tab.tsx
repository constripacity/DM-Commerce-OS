"use client";

import * as React from "react";
import type { ColumnFiltersState, ColumnDef, SortingState } from "@tanstack/react-table";
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import type { Product } from "@prisma/client";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Box, Download, Edit, FileText, Filter, Percent, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useDashboardData } from "@/components/dashboard/dashboard-data-context";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrencyFromCents } from "@/lib/format";
import { checkoutSchema } from "@/lib/validators";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface ProductCommandHandles {
  openCreate: () => void;
  openCheckoutTest: () => void;
}

interface ProductsTabProps {
  onRegisterCommands?: (handles: ProductCommandHandles | null) => void;
}

type CheckoutFormValues = z.infer<typeof checkoutSchema.omit({ productId: true })>;
type ProductFormValues = {
  title: string;
  description: string;
  price: string;
  filePath: string;
};

type ProductRow = Product & { createdLabel: string };

type SavedView = {
  name: string;
  sorting: SortingState;
  filters: ColumnFiltersState;
  globalFilter: string;
};

interface FileOption {
  path: string;
  size: number;
}

const productFormSchema = z.object({
  title: z.string().min(2).max(80),
  description: z.string().min(10).max(500),
  price: z
    .string()
    .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), { message: "Use a valid price" }),
  filePath: z.string().startsWith("/files/", { message: "Path must begin with /files/" }),
});

const STORAGE_KEY = "dm-os-product-views";

export function ProductsTab({ onRegisterCommands }: ProductsTabProps) {
  const { products, setProducts, reloadOrders, isLoadingProducts } = useDashboardData();
  const { toast } = useToast();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [checkoutOpen, setCheckoutOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);
  const [checkoutProduct, setCheckoutProduct] = React.useState<Product | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [checkoutSubmitting, setCheckoutSubmitting] = React.useState(false);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "createdLabel", desc: true }]);
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [savedViews, setSavedViews] = React.useState<SavedView[]>([]);
  const [activeView, setActiveView] = React.useState<string | null>(null);
  const [fileOptions, setFileOptions] = React.useState<FileOption[]>([]);

  const productForm = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: { title: "", description: "", price: "29", filePath: "/files/creator-guide.pdf" },
  });

  const checkoutForm = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema.omit({ productId: true })),
    defaultValues: { buyerEmail: "", buyerName: "" },
  });

  const rows: ProductRow[] = React.useMemo(
    () =>
      products.map((product) => ({
        ...product,
        createdLabel: format(new Date(product.createdAt), "PP") ?? "",
      })),
    [products]
  );

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: SavedView[] = JSON.parse(stored);
        setSavedViews(parsed);
      } catch (error) {
        console.error("Failed to parse saved views", error);
      }
    }
  }, []);

  React.useEffect(() => {
    async function loadFiles() {
      try {
        const res = await fetch("/api/files");
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as FileOption[];
        setFileOptions(data);
      } catch (error) {
        console.warn("Unable to load file options", error);
      }
    }
    loadFiles();
  }, []);

  React.useEffect(() => {
    if (!onRegisterCommands) return;
    const handles: ProductCommandHandles = {
      openCreate: () => {
        openCreateDrawer();
      },
      openCheckoutTest: () => {
        const primary = products[0];
        if (primary) {
          openCheckoutModal(primary);
        } else {
          toast({ title: "No products yet", description: "Create a product before running the demo." });
        }
      },
    };
    onRegisterCommands(handles);
    return () => onRegisterCommands(null);
  }, [onRegisterCommands, products, toast]);

  React.useEffect(() => {
    const handle = () => {
      const primary = products[0];
      if (primary) {
        openCheckoutModal(primary);
      } else {
        toast({ title: "No products available", description: "Create a product first." });
      }
    };
    window.addEventListener("dm-open-checkout", handle);
    return () => window.removeEventListener("dm-open-checkout", handle);
  }, [products, toast, openCheckoutModal]);

  const columns = React.useMemo<ColumnDef<ProductRow>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border"
            checked={table.getIsAllPageRowsSelected()}
            onChange={(event) => table.toggleAllPageRowsSelected(event.target.checked)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border"
            checked={row.getIsSelected()}
            onChange={(event) => row.toggleSelected(event.target.checked)}
            aria-label={`Select ${row.original.title}`}
          />
        ),
        enableSorting: false,
        enableColumnFilter: false,
        size: 40,
      },
      {
        accessorKey: "title",
        header: "Product",
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="font-medium text-foreground">{row.original.title}</p>
            <p className="text-xs text-muted-foreground">{row.original.description}</p>
          </div>
        ),
      },
      {
        accessorKey: "priceCents",
        header: "Price",
        cell: ({ row }) => <span className="font-medium">{formatCurrencyFromCents(row.original.priceCents)}</span>,
      },
      {
        accessorKey: "filePath",
        header: "Delivery",
        cell: ({ row }) => (
          <Badge variant="secondary" className="font-mono text-xs">
            {row.original.filePath.replace("/files/", "")}
          </Badge>
        ),
      },
      {
        accessorKey: "createdLabel",
        header: "Created",
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2 justify-end">
            <Button variant="ghost" size="icon" onClick={() => openEditDrawer(row.original)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => openCheckoutModal(row.original)}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleDelete(row.original)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { columnFilters, sorting, rowSelection, globalFilter },
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: true,
    globalFilterFn: "includesString",
  });

  const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original);

  function openCreateDrawer() {
    setEditingProduct(null);
    productForm.reset({ title: "", description: "", price: "29", filePath: "/files/creator-guide.pdf" });
    setDrawerOpen(true);
  }

  function openEditDrawer(product: ProductRow) {
    setEditingProduct(product);
    productForm.reset({
      title: product.title,
      description: product.description,
      price: (product.priceCents / 100).toFixed(2),
      filePath: product.filePath,
    });
    setDrawerOpen(true);
  }

  const openCheckoutModal = React.useCallback(
    (product: Product) => {
      setCheckoutProduct(product);
      checkoutForm.reset({ buyerEmail: "", buyerName: "" });
      setCheckoutOpen(true);
    },
    [checkoutForm]
  );

  async function submitProduct(values: ProductFormValues) {
    setSubmitting(true);
    const payload = {
      title: values.title,
      description: values.description,
      priceCents: Math.round(parseFloat(values.price) * 100),
      filePath: values.filePath,
    };

    try {
      if (editingProduct) {
        const res = await fetch(`/api/products/${editingProduct.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        const updated: Product = await res.json();
        setProducts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        toast({ title: "Product updated", description: `${updated.title} saved successfully.` });
      } else {
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        const created: Product = await res.json();
        setProducts((prev) => [created, ...prev]);
        toast({ title: "Product created", description: `${created.title} added to your catalog.` });
      }
      setDrawerOpen(false);
      setEditingProduct(null);
    } catch (error) {
      toast({
        title: "Unable to save product",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(product: Product) {
    if (!window.confirm(`Delete ${product.title}?`)) return;
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setProducts((prev) => prev.filter((item) => item.id !== product.id));
      toast({ title: "Product removed", description: `${product.title} deleted.` });
    } catch (error) {
      toast({
        title: "Unable to delete",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  }

  async function submitCheckout(values: CheckoutFormValues) {
    if (!checkoutProduct) return;
    setCheckoutSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, productId: checkoutProduct.id }),
      });
      if (!res.ok) throw new Error(await res.text());
      await reloadOrders();
      toast({
        title: "Order recorded",
        description: `${values.buyerName} now has access to ${checkoutProduct.title}.`,
      });
      setCheckoutOpen(false);
    } catch (error) {
      toast({
        title: "Checkout failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setCheckoutSubmitting(false);
    }
  }

  function exportCsv() {
    const header = ["Title", "Description", "Price", "File", "Created"];
    const rows = table.getFilteredRowModel().rows.map((row) => [
      row.original.title,
      row.original.description,
      formatCurrencyFromCents(row.original.priceCents),
      row.original.filePath,
      row.original.createdLabel,
    ]);
    const csv = [header, ...rows]
      .map((line) => line.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "products.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "Export ready", description: "Downloaded products.csv" });
  }

  function persistViews(next: SavedView[]) {
    setSavedViews(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  }

  function saveCurrentView() {
    const name = window.prompt("Name this view", "My filter");
    if (!name) return;
    const next: SavedView = {
      name,
      sorting,
      filters: columnFilters,
      globalFilter,
    };
    persistViews([...savedViews.filter((view) => view.name !== name), next]);
    setActiveView(name);
    toast({ title: "View saved", description: `${name} stored locally.` });
  }

  function applyView(viewName: string) {
    const view = savedViews.find((item) => item.name === viewName);
    if (!view) return;
    setSorting(view.sorting);
    setColumnFilters(view.filters);
    setGlobalFilter(view.globalFilter);
    setActiveView(viewName);
  }

  function deleteView(viewName: string) {
    persistViews(savedViews.filter((view) => view.name !== viewName));
    if (activeView === viewName) {
      setActiveView(null);
    }
  }

  async function applyPriceDelta() {
    if (!selectedRows.length) return;
    const input = window.prompt("Adjust price by % (e.g., 10 for +10%)", "5");
    if (!input) return;
    const delta = parseFloat(input);
    if (Number.isNaN(delta)) {
      toast({ title: "Invalid percentage", variant: "destructive" });
      return;
    }
    for (const product of selectedRows) {
      const newPrice = Math.max(0, Math.round(product.priceCents * (1 + delta / 100)));
      try {
        const res = await fetch(`/api/products/${product.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: product.title,
            description: product.description,
            priceCents: newPrice,
            filePath: product.filePath,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        const updated: Product = await res.json();
        setProducts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } catch (error) {
        toast({ title: "Price update failed", description: error instanceof Error ? error.message : "", variant: "destructive" });
      }
    }
    toast({ title: "Prices updated", description: `Applied ${delta}% to ${selectedRows.length} products.` });
    setRowSelection({});
  }

  async function moveFiles() {
    if (!selectedRows.length) return;
    if (!fileOptions.length) {
      toast({ title: "No files available", description: "Add PDFs under /public/files first.", variant: "destructive" });
      return;
    }
    const choice = window.prompt(
      `Move selected products to which file?\n${fileOptions.map((file) => `${file.path} (${Math.round(file.size / 1024)}kb)`).join("\n")}`,
      fileOptions[0]?.path
    );
    if (!choice) return;
    for (const product of selectedRows) {
      try {
        const res = await fetch(`/api/products/${product.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: product.title,
            description: product.description,
            priceCents: product.priceCents,
            filePath: choice,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        const updated: Product = await res.json();
        setProducts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } catch (error) {
        toast({ title: "File move failed", description: error instanceof Error ? error.message : "", variant: "destructive" });
      }
    }
    toast({ title: "Files moved", description: `${selectedRows.length} products now point to ${choice}` });
    setRowSelection({});
  }

  async function deleteSelected() {
    if (!selectedRows.length) return;
    if (!window.confirm(`Delete ${selectedRows.length} selected products?`)) return;
    for (const product of selectedRows) {
      await handleDelete(product);
    }
    setRowSelection({});
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Product library</h2>
          <p className="text-sm text-muted-foreground">Manage micro-offers, pricing experiments, and delivery files.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={saveCurrentView}>
            <Filter className="h-4 w-4" /> Save view
          </Button>
          <Button className="gap-2" onClick={openCreateDrawer}>
            <Plus className="h-4 w-4" /> New product
          </Button>
        </div>
      </div>
      <div className="glass-panel rounded-2xl border p-4 shadow-subtle">
        <div className="flex flex-wrap items-center gap-3 pb-4">
          <Input
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder="Quick search products"
            className="w-full max-w-sm"
          />
          <div className="ml-auto flex items-center gap-2">
            <select
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={activeView ?? ""}
              onChange={(event) => {
                const value = event.target.value;
                if (!value) {
                  setActiveView(null);
                  return;
                }
                applyView(value);
              }}
            >
              <option value="">All products</option>
              {savedViews.map((view) => (
                <option key={view.name} value={view.name}>
                  {view.name}
                </option>
              ))}
            </select>
            {activeView ? (
              <Button variant="ghost" size="sm" onClick={() => deleteView(activeView)}>
                Remove view
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={exportCsv} className="gap-2">
              <FileText className="h-4 w-4" /> Export CSV
            </Button>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="bg-muted/40 text-xs uppercase tracking-wide">
                      {header.isPlaceholder ? null : (
                        <div
                          className={cn(
                            "flex items-center gap-1",
                            header.column.getCanSort() ? "cursor-pointer select-none" : undefined
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getIsSorted() === "asc" ? (
                            <span>↑</span>
                          ) : header.column.getIsSorted() === "desc" ? (
                            <span>↓</span>
                          ) : null}
                        </div>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoadingProducts ? (
                <TableRow>
                  <TableCell colSpan={columns.length}>
                    <div className="space-y-2 p-6">
                      <Skeleton className="h-6 w-40" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="transition hover:bg-muted/40">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length}>
                    <EmptyState
                      icon={Box}
                      title="No products yet"
                      description="Create your first digital product to start the DM funnel."
                      action={
                        <Button onClick={openCreateDrawer} className="mt-2">
                          <Plus className="h-4 w-4" /> Create product
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {table.getPageCount() > 1 ? (
          <div className="flex items-center justify-between pt-4 text-sm text-muted-foreground">
            <span>
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {selectedRows.length ? (
        <div className="glass-panel flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-subtle">
          <span className="font-medium text-foreground">{selectedRows.length} selected</span>
          <Button variant="ghost" size="sm" className="gap-2" onClick={applyPriceDelta}>
            <Percent className="h-4 w-4" /> Adjust price
          </Button>
          <Button variant="ghost" size="sm" className="gap-2" onClick={moveFiles}>
            <FileText className="h-4 w-4" /> Move file
          </Button>
          <Button variant="ghost" size="sm" className="gap-2 text-destructive" onClick={deleteSelected}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setRowSelection({})}>
            Clear selection
          </Button>
        </div>
      ) : null}

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{editingProduct ? "Edit product" : "Create product"}</DrawerTitle>
            <DrawerDescription>Fine-tune copy, pricing, and delivery assets.</DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <Form {...productForm}>
              <form className="space-y-4" onSubmit={productForm.handleSubmit(submitProduct)}>
                <FormField
                  control={productForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Creator Playbook" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={productForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea rows={4} placeholder="Short pitch for the offer" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={productForm.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price (USD)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={productForm.control}
                    name="filePath"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery file</FormLabel>
                        <FormControl>
                          <select
                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                            value={field.value}
                            onChange={field.onChange}
                          >
                            {fileOptions.map((file) => (
                              <option key={file.path} value={file.path}>
                                {file.path.replace("/files/", "")} ({Math.round(file.size / 1024)}kb)
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-3">
                  <p className="text-sm font-medium text-muted-foreground">Preview</p>
                  <div className="rounded-lg border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
                    File path will resolve to <code className="font-mono">{productForm.watch("filePath")}</code>. Ensure the PDF
                    lives under <code className="font-mono">/public/files</code>.
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="ghost" onClick={() => setDrawerOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Saving..." : "Save changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
          <DrawerFooter />
        </DrawerContent>
      </Drawer>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run checkout simulator</DialogTitle>
            <DialogDescription>
              Capture a mock order to experience the hand-off flow. No external payments are processed.
            </DialogDescription>
          </DialogHeader>
          <Form {...checkoutForm}>
            <form className="space-y-4" onSubmit={checkoutForm.handleSubmit(submitCheckout)}>
              <FormField
                control={checkoutForm.control}
                name="buyerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Buyer name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jamie Creator" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={checkoutForm.control}
                name="buyerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="demo@example.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setCheckoutOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={checkoutSubmitting}>
                  {checkoutSubmitting ? "Processing..." : "Record order"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
