"use client";

import * as React from "react";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { Calendar, Download, Filter, Info, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useDashboardData } from "@/components/dashboard/dashboard-data-context";
import type { OrderWithProduct } from "@/components/dashboard/dashboard-data-context";
import { formatCurrencyFromCents, formatDate } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface OrderRow extends OrderWithProduct {
  status: "demo" | "delivered";
}

function deriveStatus(order: OrderWithProduct): "demo" | "delivered" {
  const created = new Date(order.createdAt);
  const hoursOld = (Date.now() - created.getTime()) / 1000 / 3600;
  return hoursOld <= 24 ? "demo" : "delivered";
}

export function OrdersTab() {
  const { orders, products, isLoadingOrders } = useDashboardData();
  const [productFilter, setProductFilter] = React.useState<string>("all");
  const [fromDate, setFromDate] = React.useState<string>("");
  const [toDate, setToDate] = React.useState<string>("");
  const [search, setSearch] = React.useState<string>("");
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "createdAt", desc: true }]);
  const [detailOrder, setDetailOrder] = React.useState<OrderRow | null>(null);

  const rows = React.useMemo<OrderRow[]>(
    () =>
      orders
        .filter((order) => {
          if (productFilter !== "all" && order.productId !== productFilter) return false;
          if (fromDate) {
            const from = new Date(fromDate);
            if (new Date(order.createdAt) < from) return false;
          }
          if (toDate) {
            const to = new Date(toDate);
            to.setHours(23, 59, 59, 999);
            if (new Date(order.createdAt) > to) return false;
          }
          if (search) {
            const lower = search.toLowerCase();
            const matches =
              order.buyerName.toLowerCase().includes(lower) ||
              order.buyerEmail.toLowerCase().includes(lower) ||
              order.product.title.toLowerCase().includes(lower);
            if (!matches) return false;
          }
          return true;
        })
        .map((order) => ({ ...order, status: deriveStatus(order) })),
    [orders, productFilter, fromDate, toDate, search]
  );

  const columns = React.useMemo<ColumnDef<OrderRow>[]>(
    () => [
      {
        accessorKey: "buyerName",
        header: "Buyer",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-foreground">{row.original.buyerName}</p>
            <p className="text-xs text-muted-foreground/70">{row.original.buyerEmail}</p>
          </div>
        ),
      },
      {
        accessorKey: "product",
        header: "Product",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.product.title}</p>
            <p className="font-mono text-xs text-muted-foreground/70">{formatCurrencyFromCents(row.original.product.priceCents)}</p>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            variant={row.original.status === "demo" ? "secondary" : "default"}
            className={cn(
              "text-[10px]",
              row.original.status === "delivered" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
            )}
          >
            {row.original.status === "demo" ? "Demo" : "Delivered"}
          </Badge>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Date",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDate(row.original.createdAt)}</span>,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end opacity-0 transition-opacity [tr:hover_&]:opacity-100">
            <Button variant="outline" size="sm" onClick={() => setDetailOrder(row.original)} className="gap-2 border-border/50">
              <Info className="h-3.5 w-3.5" /> View
            </Button>
          </div>
        ),
      },
    ],
    [setDetailOrder]
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Orders</h2>
          <p className="mt-1 text-sm text-muted-foreground/70">Inspect the fake checkout trail and download purchased files instantly.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/50 bg-card/80 px-5 py-3 shadow-lg shadow-black/20 backdrop-blur-sm">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search buyer or product"
          className="w-full max-w-xs border-border/50 bg-background/50"
        />
        <Select value={productFilter} onValueChange={setProductFilter}>
          <SelectTrigger className="w-40 border-border/50 bg-background/50">
            <SelectValue placeholder="Product" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All products</SelectItem>
            {products.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/70" htmlFor="orders-from">
            From
          </label>
          <Input id="orders-from" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="border-border/50 bg-background/50" />
          <label className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/70" htmlFor="orders-to">
            To
          </label>
          <Input id="orders-to" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="border-border/50 bg-background/50" />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          onClick={() => {
            setProductFilter("all");
            setFromDate("");
            setToDate("");
            setSearch("");
          }}
        >
          <RefreshCcw className="mr-1 h-3.5 w-3.5" /> Reset
        </Button>
      </div>

      {/* Table card */}
      <div className="rounded-xl border border-border/50 bg-card/80 p-5 shadow-lg shadow-black/20 backdrop-blur-sm">
        <div className="flex items-center gap-3 pb-4 text-sm text-muted-foreground/70">
          <Filter className="h-4 w-4" />
          Showing <span className="font-mono font-bold text-foreground">{rows.length}</span> of <span className="font-mono font-bold text-foreground">{orders.length}</span> orders
        </div>
        <div className="overflow-hidden rounded-lg border border-border/40">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-border/40 hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="bg-muted/30 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/70">
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
                            <span className="text-primary">↑</span>
                          ) : header.column.getIsSorted() === "desc" ? (
                            <span className="text-primary">↓</span>
                          ) : null}
                        </div>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoadingOrders ? (
                <TableRow>
                  <TableCell colSpan={columns.length}>
                    <div className="space-y-2 p-6">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row, idx) => (
                  <TableRow
                    key={row.id}
                    className={cn(
                      "cursor-pointer border-border/30 transition-colors hover:bg-muted/30",
                      idx % 2 === 1 && "bg-muted/10"
                    )}
                    onClick={() => setDetailOrder(row.original)}
                    data-sim={idx === 0 ? "orders-latest-row" : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length}>
                    <EmptyState
                      icon={Calendar}
                      title="No orders yet"
                      description="Trigger a fake checkout from the Products tab to see the fulfillment view."
                      action={
                        <Button className="mt-2" variant="outline" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                          Back to overview
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
              <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="border-border/50">
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="border-border/50">
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Detail drawer — PRESERVE data-sim="order-detail-drawer" */}
      <Drawer open={Boolean(detailOrder)} onOpenChange={(open) => !open && setDetailOrder(null)}>
        <DrawerContent>
          {detailOrder ? (
            <>
              <DrawerHeader data-sim="order-detail-drawer">
                <DrawerTitle>Order details</DrawerTitle>
                <DrawerDescription>Manual delivery preview for your fake checkout flow.</DrawerDescription>
              </DrawerHeader>
              <div className="grid gap-4 px-6 py-4">
                <div className="rounded-lg border border-border/40 bg-background/40 p-4">
                  <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/70">Buyer</p>
                  <p className="mt-1 text-sm font-medium">{detailOrder.buyerName}</p>
                  <p className="text-sm text-muted-foreground/70">{detailOrder.buyerEmail}</p>
                </div>
                <div className="rounded-lg border border-border/40 bg-background/40 p-4">
                  <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/70">Product</p>
                  <p className="mt-1 text-sm font-medium">{detailOrder.product.title}</p>
                  <p className="font-mono text-sm text-muted-foreground/70">{formatCurrencyFromCents(detailOrder.product.priceCents)}</p>
                </div>
                <div className="rounded-lg border border-border/40 bg-background/40 p-4">
                  <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/70">Created</p>
                  <p className="mt-1 text-sm">{formatDate(detailOrder.createdAt)}</p>
                  <Badge
                    variant={detailOrder.status === "demo" ? "secondary" : "default"}
                    className={cn(
                      "mt-2 w-fit text-[10px]",
                      detailOrder.status === "delivered" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    )}
                  >
                    {detailOrder.status === "demo" ? "Demo" : "Delivered"}
                  </Badge>
                </div>
              </div>
              <DrawerFooter className="flex items-center justify-between gap-2 px-6 py-4">
                <a href={detailOrder.product.filePath} target="_blank" rel="noopener noreferrer" className="w-full">
                  <Button variant="default" className="w-full gap-2">
                    <Download className="h-4 w-4" /> Download file
                  </Button>
                </a>
              </DrawerFooter>
            </>
          ) : null}
        </DrawerContent>
      </Drawer>
    </section>
  );
}
