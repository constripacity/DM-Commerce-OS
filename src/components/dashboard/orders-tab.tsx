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
            <p className="text-xs text-muted-foreground">{row.original.buyerEmail}</p>
          </div>
        ),
      },
      {
        accessorKey: "product",
        header: "Product",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.product.title}</p>
            <p className="text-xs text-muted-foreground">{formatCurrencyFromCents(row.original.product.priceCents)}</p>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.status === "demo" ? "secondary" : "default"}>
            {row.original.status === "demo" ? "Demo" : "Delivered"}
          </Badge>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Date",
        cell: ({ row }) => <span>{formatDate(row.original.createdAt)}</span>,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setDetailOrder(row.original)} className="gap-2">
              <Info className="h-4 w-4" /> View
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Orders</h2>
          <p className="text-sm text-muted-foreground">Inspect the fake checkout trail and download purchased files instantly.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search buyer or product"
            className="w-full max-w-xs"
          />
          <div className="flex items-center gap-2">
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger className="w-40">
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
            <label className="text-xs font-medium text-muted-foreground" htmlFor="orders-from">
              From
            </label>
            <Input id="orders-from" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
            <label className="text-xs font-medium text-muted-foreground" htmlFor="orders-to">
              To
            </label>
            <Input id="orders-to" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setProductFilter("all");
                setFromDate("");
                setToDate("");
                setSearch("");
              }}
            >
              <RefreshCcw className="mr-1 h-4 w-4" /> Reset
            </Button>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-2xl border p-4 shadow-subtle">
        <div className="flex items-center gap-3 pb-4 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          Showing {rows.length} of {orders.length} orders
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
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer transition hover:bg-muted/40"
                    onClick={() => setDetailOrder(row.original)}
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

      <Drawer open={Boolean(detailOrder)} onOpenChange={(open) => !open && setDetailOrder(null)}>
        <DrawerContent>
          {detailOrder ? (
            <>
              <DrawerHeader>
                <DrawerTitle>Order details</DrawerTitle>
                <DrawerDescription>Manual delivery preview for your fake checkout flow.</DrawerDescription>
              </DrawerHeader>
              <div className="grid gap-4 px-6 py-4">
                <div>
                  <p className="text-xs text-muted-foreground">Buyer</p>
                  <p className="text-sm font-medium">{detailOrder.buyerName}</p>
                  <p className="text-sm text-muted-foreground">{detailOrder.buyerEmail}</p>
                </div>
                <div className="grid gap-1">
                  <p className="text-xs text-muted-foreground">Product</p>
                  <p className="text-sm font-medium">{detailOrder.product.title}</p>
                  <p className="text-sm text-muted-foreground">{formatCurrencyFromCents(detailOrder.product.priceCents)}</p>
                </div>
                <div className="grid gap-1">
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm">{formatDate(detailOrder.createdAt)}</p>
                  <Badge variant={detailOrder.status === "demo" ? "secondary" : "default"} className="w-fit">
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
