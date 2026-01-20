"use client";

import * as React from "react";
import type { Order, Product } from "@prisma/client";

export type { Product };
export type OrderWithProduct = Order & { product: Product };

interface DashboardDataContextValue {
  products: Product[];
  orders: OrderWithProduct[];
  reloadProducts: () => Promise<void>;
  reloadOrders: () => Promise<void>;
  isLoadingProducts: boolean;
  isLoadingOrders: boolean;
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
}

const DashboardDataContext = React.createContext<DashboardDataContextValue | null>(null);

async function requestJSON<T>(input: RequestInfo, init?: RequestInit) {
  const res = await fetch(input, {
    credentials: "include",
    cache: "no-store",
    ...init,
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return (await res.json()) as T;
}

interface DashboardDataProviderProps {
  children: React.ReactNode;
  initialProducts?: Product[];
  initialOrders?: OrderWithProduct[];
}

export function DashboardDataProvider({ children, initialProducts = [], initialOrders = [] }: DashboardDataProviderProps) {
  const [products, setProducts] = React.useState<Product[]>(initialProducts);
  const [orders, setOrders] = React.useState<OrderWithProduct[]>(initialOrders);
  const [isLoadingProducts, setLoadingProducts] = React.useState(!initialProducts.length);
  const [isLoadingOrders, setLoadingOrders] = React.useState(!initialOrders.length);

  const reloadProducts = React.useCallback(async () => {
    setLoadingProducts(true);
    try {
      const data = await requestJSON<Product[]>("/api/products");
      setProducts(data);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const reloadOrders = React.useCallback(async () => {
    setLoadingOrders(true);
    try {
      const data = await requestJSON<OrderWithProduct[]>("/api/orders");
      setOrders(data);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  React.useEffect(() => {
    if (products.length === 0) reloadProducts();
    if (orders.length === 0) reloadOrders();
  }, [reloadProducts, reloadOrders, products.length, orders.length]);

  return (
    <DashboardDataContext.Provider
      value={{ products, orders, reloadProducts, reloadOrders, isLoadingProducts, isLoadingOrders, setProducts }}
    >
      {children}
    </DashboardDataContext.Provider>
  );
}

export function useDashboardData() {
  const context = React.useContext(DashboardDataContext);
  if (!context) {
    throw new Error("useDashboardData must be used within DashboardDataProvider");
  }
  return context;
}