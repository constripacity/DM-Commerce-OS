"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useDashboardData } from "@/components/dashboard/dashboard-data-context";
import { formatCurrencyFromCents, formatDate } from "@/lib/format";
import type { OrderWithProduct } from "@/components/dashboard/dashboard-data-context";

export function OrdersTab() {
  const { orders, products, isLoadingOrders } = useDashboardData();
  const [productFilter, setProductFilter] = React.useState<string>("all");
  const [fromDate, setFromDate] = React.useState<string>("");
  const [toDate, setToDate] = React.useState<string>("");

  const columns = React.useMemo<ColumnDef<OrderWithProduct>[]>(
    () => [
      {
        accessorKey: "buyerName",
        header: "Buyer",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.buyerName}</div>
            <div className="text-xs text-muted-foreground">{row.original.buyerEmail}</div>
          </div>
        ),
      },
      {
        accessorKey: "product",
        header: "Product",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.product.title}</div>
            <div className="text-xs text-muted-foreground">{formatCurrencyFromCents(row.original.product.priceCents)}</div>
          </div>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Date",
        cell: ({ row }) => <span>{formatDate(row.original.createdAt)}</span>,
        meta: { className: "w-32" },
      },
      {
        id: "download",
        header: "Delivery",
        cell: ({ row }) => (
          <Button asChild variant="outline" size="sm">
            <a href={row.original.product.filePath} target="_blank" rel="noopener noreferrer">
              Download
            </a>
          </Button>
        ),
        meta: { className: "w-28" },
      },
    ],
    []
  );

  const filteredOrders = React.useMemo(() => {
    return orders.filter((order) => {
      if (productFilter !== "all" && order.productId !== productFilter) {
        return false;
      }
      if (fromDate) {
        const from = new Date(fromDate);
        if (new Date(order.createdAt) < from) return false;
      }
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        if (new Date(order.createdAt) > to) return false;
      }
      return true;
    });
  }, [orders, productFilter, fromDate, toDate]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Orders</h2>
          <p className="text-sm text-muted-foreground">
            Every fake checkout generates an order you can download instantly.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-40">
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by product" />
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
          </div>
          <div className="flex items-center gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground" htmlFor="order-from">
                From
              </label>
              <Input id="order-from" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground" htmlFor="order-to">
                To
              </label>
              <Input id="order-to" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
            </div>
          </div>
          <Button variant="ghost" onClick={() => {
            setProductFilter("all");
            setFromDate("");
            setToDate("");
          }}>
            Clear
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredOrders}
        isLoading={isLoadingOrders}
        emptyMessage="No orders recorded yet"
      />
    </div>
  );
}
