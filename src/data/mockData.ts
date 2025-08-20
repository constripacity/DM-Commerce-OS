import { Thread, Product, Order } from '../types';

export const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Black Tee — M',
    sku: 'TSHIRT-BLK-M',
    price: 29.90,
    stock: 18,
    image: 'https://images.pexels.com/photos/1020585/pexels-photo-1020585.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Clothing'
  },
  {
    id: '2',
    name: 'Black Tee — L',
    sku: 'TSHIRT-BLK-L',
    price: 29.90,
    stock: 8,
    image: 'https://images.pexels.com/photos/1020585/pexels-photo-1020585.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Clothing'
  },
  {
    id: '3',
    name: 'White Tee — M',
    sku: 'TSHIRT-WHT-M',
    price: 27.50,
    stock: 25,
    image: 'https://images.pexels.com/photos/1656684/pexels-photo-1656684.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Clothing'
  },
  {
    id: '4',
    name: 'Hoodie Grey — M',
    sku: 'HOODIE-GRY-M',
    price: 59.00,
    stock: 12,
    image: 'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Clothing'
  },
  {
    id: '5',
    name: 'Cap Navy — OS',
    sku: 'CAP-NVY-OS',
    price: 19.50,
    stock: 40,
    image: 'https://images.pexels.com/photos/1124465/pexels-photo-1124465.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Accessories'
  },
  {
    id: '6',
    name: 'Sneakers Black — 42',
    sku: 'SNEAK-42-BLK',
    price: 89.00,
    stock: 7,
    image: 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Footwear'
  },
  {
    id: '7',
    name: 'Tote Bag — Organic',
    sku: 'BAG-TOTE-STD',
    price: 15.00,
    stock: 50,
    image: 'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Accessories'
  },
  {
    id: '8',
    name: 'Sunglasses — Classic',
    sku: 'SUNGL-STD',
    price: 34.00,
    stock: 27,
    image: 'https://images.pexels.com/photos/46710/pexels-photo-46710.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Accessories'
  },
  {
    id: '9',
    name: 'Socks — 6 Pack',
    sku: 'SOCK-6PACK',
    price: 17.00,
    stock: 60,
    image: 'https://images.pexels.com/photos/7679720/pexels-photo-7679720.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Clothing'
  },
  {
    id: '10',
    name: 'Leather Belt',
    sku: 'BELT-LTHR',
    price: 24.00,
    stock: 14,
    image: 'https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Accessories'
  }
];

export const mockThreads: Thread[] = [
  {
    id: '1',
    customerName: 'Aisha B.',
    customerPhone: '+447712345',
    lastMessage: 'hi, price black tee',
    lastMessageTime: new Date('2024-01-20T12:16:35'),
    unreadCount: 1,
    messages: [
      {
        id: '1',
        sender: 'customer',
        content: 'hi, price black tee',
        timestamp: new Date('2024-01-20T12:16:35'),
        intent: 'price_check'
      }
    ]
  }
];

export const mockOrders: Order[] = [];