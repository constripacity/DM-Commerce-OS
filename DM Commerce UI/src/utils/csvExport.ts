import { Order } from '../types';

export function exportOrdersToCSV(orders: Order[]): string {
  const headers = [
    'Order ID',
    'Customer Name',
    'Customer Phone',
    'Products',
    'Total',
    'Status',
    'Payment Method',
    'Created At'
  ];

  const escapeCSV = (value: string): string => {
    if (value.includes('"') || value.includes(',') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const rows = orders.map(order => [
    escapeCSV(order.id),
    escapeCSV(order.customerName),
    escapeCSV(order.customerPhone),
    escapeCSV(order.products.map(p => `${p.productName} (${p.quantity}x)`).join('; ')),
    escapeCSV(`€${order.total.toFixed(2)}`),
    escapeCSV(order.status),
    escapeCSV(order.paymentMethod),
    escapeCSV(order.createdAt.toISOString())
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}