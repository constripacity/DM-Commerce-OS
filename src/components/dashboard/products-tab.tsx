"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Product } from "@prisma/client";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDashboardData } from "@/components/dashboard/dashboard-data-context";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrencyFromCents } from "@/lib/format";
import { checkoutSchema } from "@/lib/validators";

const productFormSchema = z.object({
  title: z.string().min(2).max(80),
  description: z.string().min(10).max(500),
  price: z
    .string()
    .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), {
      message: "Use a valid price like 29 or 29.00",
    }),
  filePath: z
    .string()
    .startsWith("/files/", { message: "Path must begin with /files/" })
    .regex(/\.pdf$/, { message: "File must be a PDF" }),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

const checkoutFormSchema = checkoutSchema.omit({ productId: true });

type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

type ProductRow = Product;

export function ProductsTab() {
  const { products, setProducts, isLoadingProducts, reloadOrders } = useDashboardData();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [checkoutOpen, setCheckoutOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);
  const [checkoutProduct, setCheckoutProduct] = React.useState<Product | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [checkoutSubmitting, setCheckoutSubmitting] = React.useState(false);

  const productForm = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      title: "",
      description: "",
      price: "29",
      filePath: "/files/creator-guide.pdf",
    },
  });

  const checkoutForm = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      buyerName: "",
      buyerEmail: "",
    },
  });

  const resetDialog = () => {
    setEditingProduct(null);
    productForm.reset({
      title: "",
      description: "",
      price: "29",
      filePath: "/files/creator-guide.pdf",
    });
  };

  const openCreateDialog = () => {
    resetDialog();
    setDialogOpen(true);
  };

  const openEditDialog = React.useCallback(
    (product: Product) => {
      setEditingProduct(product);
      productForm.reset({
        title: product.title,
        description: product.description,
        price: (product.priceCents / 100).toFixed(2),
        filePath: product.filePath,
      });
      setDialogOpen(true);
    },
    [productForm]
  );

  const submitProduct = async (values: ProductFormValues) => {
    setSubmitting(true);
    const body = {
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
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(await res.text());
        const updated: Product = await res.json();
        setProducts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        toast({ title: "Product updated", description: `${updated.title} saved successfully.` });
      } else {
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(await res.text());
        const created: Product = await res.json();
        setProducts((prev) => [created, ...prev]);
        toast({ title: "Product created", description: `${created.title} added to your catalog.` });
      }
      setDialogOpen(false);
      resetDialog();
    } catch (error) {
      toast({
        title: "Unable to save product",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = React.useCallback(
    async (product: Product) => {
      const confirmed = window.confirm(`Delete ${product.title}?`);
      if (!confirmed) return;
      try {
        const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error(await res.text());
        setProducts((prev) => prev.filter((item) => item.id !== product.id));
        toast({ title: "Product removed", description: `${product.title} deleted.` });
      } catch (error) {
        toast({
          title: "Unable to delete",
          description:
            error instanceof Error && error.message.includes("existing orders")
              ? "Delete related orders first to remove this product."
              : error instanceof Error
              ? error.message
              : "Please try again.",
          variant: "destructive",
        });
      }
    },
    [setProducts, toast]
  );

  const openCheckout = React.useCallback(
    (product: Product) => {
      setCheckoutProduct(product);
      checkoutForm.reset({
        buyerName: "",
        buyerEmail: "",
      });
      setCheckoutOpen(true);
    },
    [checkoutForm]
  );

  const submitCheckout = async (values: CheckoutFormValues) => {
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
  };

  const columns = React.useMemo<ColumnDef<ProductRow>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Product",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.title}</div>
            <div className="text-xs text-muted-foreground">{row.original.filePath}</div>
          </div>
        ),
      },
      {
        accessorKey: "priceCents",
        header: "Price",
        cell: ({ row }) => <span>{formatCurrencyFromCents(row.original.priceCents)}</span>,
        meta: { className: "w-32" },
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => (
          <p className="line-clamp-2 text-sm text-muted-foreground">{row.original.description}</p>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => openCheckout(row.original)}>
              Checkout
            </Button>
            <Button variant="ghost" size="sm" onClick={() => openEditDialog(row.original)}>
              Edit
            </Button>
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(row.original)}>
              Delete
            </Button>
          </div>
        ),
        meta: { className: "w-[240px]" },
      },
    ],
    [handleDelete, openCheckout, openEditDialog]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">Products</h2>
          <p className="text-sm text-muted-foreground">
            Upload digital files, set pricing, and simulate the purchase flow.
          </p>
        </div>
        <Button onClick={openCreateDialog}>New product</Button>
      </div>
      <DataTable columns={columns} data={products} isLoading={isLoadingProducts} emptyMessage="No products yet" />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit product" : "Create product"}</DialogTitle>
            <DialogDescription>
              Provide a descriptive title, price, and file path inside <code>/public/files</code>.
            </DialogDescription>
          </DialogHeader>
          <Form {...productForm}>
            <form className="space-y-4" onSubmit={productForm.handleSubmit(submitProduct)}>
              <FormField
                control={productForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Creator DM Guide" {...field} />
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
                      <Textarea rows={4} placeholder="What transformation does this product unlock?" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={productForm.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (USD)</FormLabel>
                      <FormControl>
                        <Input type="text" inputMode="decimal" placeholder="29.00" {...field} />
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
                      <FormLabel>File path</FormLabel>
                      <FormControl>
                        <Input placeholder="/files/creator-guide.pdf" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving..." : editingProduct ? "Save changes" : "Create product"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Simulate checkout</DialogTitle>
            <DialogDescription>
              Record a sandbox order for {checkoutProduct?.title ?? "this product"}.
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
                      <Input placeholder="Taylor Demo" {...field} />
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
                    <FormLabel>Buyer email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="taylor@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={checkoutSubmitting}>
                  {checkoutSubmitting ? "Recording..." : "Complete checkout"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
