/**
 * Simple API helpers for wiring the UI to the backend.
 * Uses root-relative /api/* endpoints as requested.
 */

export async function fetchCatalog(): Promise<any[]> {
  try {
    const res = await fetch('/api/catalog');
    if (!res.ok) throw new Error(`fetchCatalog failed (${res.status})`);
    const data = await res.json();
    return data.products || data;
  } catch (err) {
    console.warn('fetchCatalog error:', err);
    return [];
  }
}

export async function fetchOrders(): Promise<any[]> {
  try {
    const res = await fetch('/api/orders');
    if (!res.ok) throw new Error(`fetchOrders failed (${res.status})`);
    const data = await res.json();
    return data.orders || data;
  } catch (err) {
    console.warn('fetchOrders error:', err);
    return [];
  }
}

export async function createPaymentLink(payload: { threadId: string; items: { productId: string; sku: string; qty: number }[]; }): Promise<any> {
  try {
    const res = await fetch('/api/payment-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`createPaymentLink failed (${res.status})`);
    return await res.json();
  } catch (err) {
    console.warn('createPaymentLink error:', err);
    return null;
  }
}

export async function sendMessageApi(threadId: string, content: string): Promise<any> {
  try {
    const res = await fetch('/api/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId, content }),
    });
    if (!res.ok) throw new Error(`sendMessageApi failed (${res.status})`);
    return await res.json();
  } catch (err) {
    console.warn('sendMessageApi error:', err);
    return null;
  }
}

/**
 * Fetch threads from backend. Returns an array of threads or empty array on error.
 */
export async function fetchThreads(): Promise<any[]> {
  try {
    const res = await fetch('/api/threads');
    if (!res.ok) throw new Error(`fetchThreads failed (${res.status})`);
    const data = await res.json();
    return data.threads || data;
  } catch (err) {
    console.warn('fetchThreads error:', err);
    return [];
  }
}
