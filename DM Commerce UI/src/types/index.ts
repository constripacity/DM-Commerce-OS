export interface Message {
  id: string;
  sender: 'customer' | 'business';
  content: string;
  timestamp: Date;
  intent?: MessageIntent;
  isAutoReply?: boolean;
}

export interface Thread {
  id: string;
  customerName: string;
  customerPhone: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  messages: Message[];
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  image: string;
  category: string;
}

export interface Order {
  id: string;
  threadId: string;
  customerName: string;
  customerPhone: string;
  products: OrderItem[];
  total: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered';
  paymentMethod: 'stripe' | 'paypal';
  createdAt: Date;
}

export interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  price: number;
}

export type MessageIntent = 'price_check' | 'availability' | 'delivery' | 'returns' | 'purchase' | 'general';

export type Theme = 'sunset' | 'sky' | 'dark';

export interface AppSettings {
  theme: Theme;
  showEmojis: boolean;
  autoReply: boolean;
  deliveryFee: number;
  etaDays: number;
}