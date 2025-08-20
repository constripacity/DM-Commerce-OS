import { useState, useCallback } from 'react';
import { Thread, Message, Order, Product } from '../types';
import { mockThreads, mockProducts, mockOrders } from '../data/mockData';
import { classifyMessage, generateAutoReply } from '../utils/messageClassifier';

export function useSimulation() {
  const [threads, setThreads] = useState<Thread[]>(mockThreads);
  const [products] = useState<Product[]>(mockProducts);
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [paymentLinksSent, setPaymentLinksSent] = useState(0);
  const [ordersPaid, setOrdersPaid] = useState(0);

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
    }
  }, [threads]);

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
  }, []);

  const sendAutoReply = useCallback((threadId: string, intent: string, originalMessage: string) => {
    const reply = generateAutoReply(intent as any, originalMessage);
    sendMessage(threadId, reply, true);
  }, [sendMessage]);

  const simulatePaymentEvent = useCallback((type: 'stripe' | 'paypal') => {
    if (threads.length === 0) return;
    
    const randomThread = threads[Math.floor(Math.random() * threads.length)];
    const randomProducts = products.slice(0, Math.floor(Math.random() * 3) + 1);
    
    const newOrder: Order = {
      id: `ORD-${Date.now()}`,
      threadId: randomThread.id,
      customerName: randomThread.customerName,
      customerPhone: randomThread.customerPhone,
      products: randomProducts.map(p => ({
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        quantity: Math.floor(Math.random() * 3) + 1,
        price: p.price
      })),
      total: randomProducts.reduce((sum, p) => sum + p.price, 0),
      status: 'paid',
      paymentMethod: type,
      createdAt: new Date()
    };

    setOrders(prev => [...prev, newOrder]);
    setOrdersPaid(prev => prev + 1);
    
    const paymentMessage = `✅ Payment received via ${type.charAt(0).toUpperCase() + type.slice(1)}! Order ${newOrder.id} confirmed. Total: €${newOrder.total.toFixed(2)}`;
    sendMessage(randomThread.id, paymentMessage);
  }, [threads, products, sendMessage]);

  const sendPaymentLink = useCallback((threadId: string, productIds: string[]) => {
    const selectedProducts = products.filter(p => productIds.includes(p.id));
    const total = selectedProducts.reduce((sum, p) => sum + p.price, 0);
    
    const paymentLink = `💳 Payment Link: €${total.toFixed(2)} for ${selectedProducts.map(p => p.name).join(', ')}`;
    sendMessage(threadId, paymentLink);
    setPaymentLinksSent(prev => prev + 1);
  }, [products, sendMessage]);

  const markThreadAsRead = useCallback((threadId: string) => {
    setThreads(prev => prev.map(thread => 
      thread.id === threadId
        ? { ...thread, unreadCount: 0 }
        : thread
    ));
  }, []);

  return {
    threads,
    products,
    orders,
    paymentLinksSent,
    ordersPaid,
    simulateIncomingMessage,
    sendMessage,
    sendAutoReply,
    simulatePaymentEvent,
    sendPaymentLink,
    markThreadAsRead
  };
}