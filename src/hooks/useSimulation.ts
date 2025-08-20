import { useState, useCallback, useEffect } from 'react';
import { Thread, Message, Order, Product } from '../types';
import { classifyMessage, generateAutoReply } from '../utils/messageClassifier';
import { fetchCatalog, createPaymentLink, fetchOrders, sendMessageApi, fetchThreads } from '../api';
import { mockThreads } from '../data/mockData';
import { exportOrdersToCSV, downloadCSV } from '../utils/csvExport';

export function useSimulation() {
  const [threads, setThreads] = useState<Thread[]>(mockThreads);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [paymentLinksSent, setPaymentLinksSent] = useState(0);
  const [ordersPaid, setOrdersPaid] = useState(0);
  const [eventLog, setEventLog] = useState<string[]>([]);

  const appendLog = useCallback((entry: string) => {
    const timestamp = new Date().toISOString();
    setEventLog(prev => [`[${timestamp}] ${entry}`, ...prev].slice(0, 200));
    console.log('EventLog:', entry);
  }, []);

  // Load catalog from backend on mount
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchCatalog();
        setProducts(data);
      } catch (e) {
        console.warn('Error fetching catalog:', e);
      }
    })();
  }, []);

  // Fetch threads from backend on mount; replace local mock threads if backend returns data
  useEffect(() => {
    (async () => {
      try {
        const remote = await fetchThreads();
        if (Array.isArray(remote) && remote.length > 0) {
          setThreads(remote);
          appendLog(`Loaded ${remote.length} threads from backend`);
        } else {
          appendLog('No remote threads found; using local mock threads');
        }
      } catch (e) {
        console.warn('Error fetching threads:', e);
        appendLog('Failed to fetch threads from backend');
      }
    })();
  }, [appendLog]);

  // Poll orders every 10s to keep in sync with backend
  useEffect(() => {
    let id: number | undefined;
    const pollOrders = async () => {
      try {
        const remoteOrders = await fetchOrders();
        if (Array.isArray(remoteOrders)) {
          setOrders(remoteOrders);
          const paidCount = remoteOrders.filter((o: any) => o.status === 'paid').length;
          setOrdersPaid(paidCount);
          appendLog(`Polled orders: ${remoteOrders.length} total, ${paidCount} paid`);
        }
      } catch (e) {
        console.warn('pollOrders failed:', e);
        appendLog('Polling orders failed');
      }
    };
    pollOrders();
    id = window.setInterval(pollOrders, 10000);
    return () => { if (id !== undefined) window.clearInterval(id); };
  }, [appendLog]);

  const simulateIncomingMessage = useCallback(() => {
    const messages = [
      'Hi, do you have this in stock?',
      'What\'s the price for the black tee?',
      'When can you deliver?',
      'I want to buy 2 hoodies',
      'Is the cap still available?',
      'Can I return this item?'
    ];

    const customerNames = ['John D.', 'Sarah M.', 'Mike R.', 'Emma L.', 'Alex K.'];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    const randomName = customerNames[Math.floor(Math.random() * customerNames.length)];
    
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: 'customer',
      content: randomMessage,
      timestamp: new Date(),
      intent: classifyMessage(randomMessage)
    };

    const existingThread = threads.find(t => t.customerName === randomName);
    
    if (existingThread) {
      setThreads(prev => prev.map(thread => 
        thread.id === existingThread.id
          ? {
              ...thread,
              messages: [...thread.messages, newMessage],
              lastMessage: randomMessage,
              lastMessageTime: new Date(),
              unreadCount: thread.unreadCount + 1
            }
          : thread
      ));
      appendLog(`Incoming message from ${randomName}: "${randomMessage}" (existing thread)`);
    } else {
      const newThread: Thread = {
        id: Date.now().toString(),
        customerName: randomName,
        customerPhone: `+4477${Math.floor(Math.random() * 100000)}`,
        lastMessage: randomMessage,
        lastMessageTime: new Date(),
        unreadCount: 1,
        messages: [newMessage]
      };
      
      setThreads(prev => [newThread, ...prev]);
      appendLog(`Incoming message from ${randomName}: "${randomMessage}" (new thread)`);
    }
  }, [threads, appendLog]);

  const sendMessage = useCallback((threadId: string, content: string, isAutoReply = false) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: 'business',
      content,
      timestamp: new Date(),
      isAutoReply
    };

    setThreads(prev => prev.map(thread => 
      thread.id === threadId
        ? {
            ...thread,
            messages: [...thread.messages, newMessage],
            lastMessage: content,
            lastMessageTime: new Date(),
            unreadCount: 0
          }
        : thread
    ));

    appendLog(`Local message added to ${threadId}: "${content}"`);

    // Send to backend and log result
    (async () => {
      try {
        await sendMessageApi(threadId, content);
        appendLog(`Sent message to thread ${threadId}`);
      } catch (e) {
        console.warn('sendMessage failed:', e);
        appendLog(`Failed to send message to ${threadId}`);
      }
    })();
  }, [appendLog]);

  const sendAutoReply = useCallback((threadId: string, intent: string, originalMessage: string) => {
    const reply = generateAutoReply(intent as any, originalMessage);
    sendMessage(threadId, reply, true);
  }, [sendMessage]);

  const simulatePaymentEvent = useCallback((type: 'stripe' | 'paypal') => {
    // Sync orders from backend and update local state (backend is source-of-truth)
    (async () => {
      try {
        const remoteOrders = await fetchOrders();
        if (Array.isArray(remoteOrders)) {
          setOrders(remoteOrders);
          const paidCount = remoteOrders.filter((o: any) => o.status === 'paid').length;
          setOrdersPaid(paidCount);
          appendLog(`Synced orders from backend (${type}): ${remoteOrders.length} orders, ${paidCount} paid`);
        }
      } catch (e) {
        console.warn('simulatePaymentEvent failed:', e);
        appendLog('simulatePaymentEvent failed to sync orders');
      }
    })();
  }, [appendLog]);

  const sendPaymentLink = useCallback((threadId: string, productIds: string[]) => {
    const selectedProducts = products.filter(p => productIds.includes(p.id));
    const payload = { threadId, items: selectedProducts.map(p => ({ productId: p.id, sku: p.sku, qty: 1 })) };

    (async () => {
      try {
        const data = await createPaymentLink(payload);
        // expected response: { url, provider, amount, currency, orderId, order? }
        const linkText = data?.url ? `✅ Order ready. Total: ${data.amount} ${data.currency}. Pay here: ${data.url}` : `💳 Payment Link: ${data?.amount ?? ''}`;
        sendMessage(threadId, linkText);
        setPaymentLinksSent(prev => prev + 1);
        appendLog(`Sent payment link to ${threadId} (${data?.provider ?? 'unknown'})`);
        if (data?.order) {
          setOrders(prev => [data.order, ...prev]);
          appendLog(`Received order ${data.order.id} from payment link creation`);
        } else if (data?.orderId) {
          // minimal order placeholder if backend only returned id
          setOrders(prev => [{ id: data.orderId, threadId, items: payload.items, amount: data.amount, currency: data.currency, status: 'link_sent', createdAt: new Date().toISOString() } as any, ...prev]);
          appendLog(`Created placeholder order ${data.orderId} for ${threadId}`);
        }
      } catch (e) {
        console.warn('sendPaymentLink failed:', e);
        appendLog(`sendPaymentLink failed for ${threadId}`);
        // fallback to local message
        const total = selectedProducts.reduce((sum, p) => sum + p.price, 0);
        const paymentLink = `💳 Payment Link: €${total.toFixed(2)} for ${selectedProducts.map(p => p.name).join(', ')}`;
        sendMessage(threadId, paymentLink);
        setPaymentLinksSent(prev => prev + 1);
      }
    })();
  }, [products, sendMessage, appendLog]);


  const exportOrdersCSV = useCallback(() => {
    try {
      const csv = exportOrdersToCSV(orders);
      downloadCSV(csv, `orders-${new Date().toISOString()}.csv`);
      appendLog('Exported orders CSV');
    } catch (e) {
      console.warn('exportOrdersCSV failed:', e);
      appendLog('Export orders CSV failed');
    }
  }, [orders, appendLog]);

  const forceMarkPaid = useCallback(async (orderId: string) => {
    // local update for demo parity
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'paid' } : o));
    setOrdersPaid(prev => prev + 1);
    appendLog(`Order ${orderId} marked as paid (local)`);

    // best-effort backend call
    try {
      await fetch(`/api/orders/${orderId}/mark-paid`, { method: 'POST' });
      appendLog(`Requested backend to mark order ${orderId} as paid`);
    } catch (e) {
      console.warn('forceMarkPaid backend call failed:', e);
    }
  }, [appendLog]);

  const markThreadAsRead = useCallback((threadId: string) => {
    setThreads(prev => prev.map(thread => 
      thread.id === threadId
        ? { ...thread, unreadCount: 0 }
        : thread
    ));
    appendLog(`Marked thread ${threadId} as read`);
  }, [appendLog]);

  return {
    threads,
    products,
    orders,
    eventLog,
    paymentLinksSent,
    ordersPaid,
    simulateIncomingMessage,
    sendMessage,
    sendAutoReply,
    simulatePaymentEvent,
    sendPaymentLink,
    exportOrdersCSV,
    forceMarkPaid,
    appendLog,
    markThreadAsRead
  };
}
