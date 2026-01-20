'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Download, Eye } from 'lucide-react';

type Order = {
  id: string;
  buyer: string;
  product: string;
  date: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
};

const demoOrders: Order[] = [
  {
    id: '1001',
    buyer: 'john@example.com',
    product: 'Digital Marketing Guide',
    date: '2024-01-20',
    amount: 47,
    status: 'completed',
  },
  {
    id: '1002',
    buyer: 'sarah@example.com',
    product: 'Social Media Templates Pack',
    date: '2024-01-19',
    amount: 29,
    status: 'completed',
  },
  {
    id: '1003',
    buyer: 'mike@example.com',
    product: 'Email Course Bundle',
    date: '2024-01-18',
    amount: 97,
    status: 'pending',
  },
  {
    id: '1004',
    buyer: 'lisa@example.com',
    product: 'Digital Marketing Guide',
    date: '2024-01-17',
    amount: 47,
    status: 'completed',
  },
];

export default function OrdersPage() {
  const [orders] = useState<Order[]>(demoOrders);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const getStatusVariant = (status: Order['status']) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Track and manage customer orders and downloads."
      />

      <Card className="rounded-2xl shadow-soft border-orange-50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow
                  key={order.id}
                  className="cursor-pointer hover:bg-accent/50"
                  onClick={() => setSelectedOrder(order)}
                >
                  <TableCell className="font-mono text-sm">
                    #{order.id}
                  </TableCell>
                  <TableCell>{order.buyer}</TableCell>
                  <TableCell className="font-medium">{order.product}</TableCell>
                  <TableCell>{order.date}</TableCell>
                  <TableCell className="font-semibold">
                    ${order.amount}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(order.status)}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(order);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {order.status === 'completed' && (
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Order Details</SheetTitle>
            <SheetDescription>
              Order #{selectedOrder?.id}
            </SheetDescription>
          </SheetHeader>
          {selectedOrder && (
            <div className="space-y-6 py-6">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Buyer Email
                  </label>
                  <p className="text-base font-medium">{selectedOrder.buyer}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Product
                  </label>
                  <p className="text-base font-medium">{selectedOrder.product}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Order Date
                  </label>
                  <p className="text-base">{selectedOrder.date}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Amount
                  </label>
                  <p className="text-2xl font-bold text-primary">
                    ${selectedOrder.amount}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Status
                  </label>
                  <div className="mt-1">
                    <Badge variant={getStatusVariant(selectedOrder.status)}>
                      {selectedOrder.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {selectedOrder.status === 'completed' && (
                <div className="pt-4 space-y-2">
                  <Button className="w-full gap-2 rounded-xl">
                    <Download className="h-4 w-4" />
                    Download Product File
                  </Button>
                  <Button variant="outline" className="w-full rounded-xl">
                    Send Download Link
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
