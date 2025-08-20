import { useEffect, useState } from "react";

function formatCurrency(amount, currency) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("orders")) || [];
      setOrders(stored);
    } catch {
      setOrders([]);
    }
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-2">Active Orders</h1>
      <p className="mb-4 text-sm text-gray-600">Overview of orders currently in the system.</p>
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left">
            <th className="border-b p-2">Order ID</th>
            <th className="border-b p-2">Customer</th>
            <th className="border-b p-2">Status</th>
            <th className="border-b p-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(o => (
            <tr key={o.id} className="odd:bg-gray-50">
              <td className="border-b p-2 font-mono text-xs">{o.id}</td>
              <td className="border-b p-2">{o.customer}</td>
              <td className="border-b p-2 capitalize">{o.status}</td>
              <td className="border-b p-2">{formatCurrency(o.amount, o.currency)}</td>
            </tr>
          ))}
          {orders.length === 0 && (
            <tr>
              <td colSpan="4" className="p-4 text-center text-sm text-gray-500">No active orders.</td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="mt-4">
        <a href="/" className="text-sm underline">Back to sandbox</a>
      </div>
    </div>
  );
}

