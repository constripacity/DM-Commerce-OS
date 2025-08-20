import { MessageIntent } from '../types';

const intentKeywords = {
  price_check: ['price', 'cost', 'how much', 'expensive', '$', '€', '£'],
  availability: ['available', 'stock', 'in stock', 'out of stock', 'have'],
  delivery: ['delivery', 'shipping', 'ship', 'when', 'arrive', 'eta'],
  returns: ['return', 'refund', 'exchange', 'wrong', 'defective'],
  purchase: ['buy', 'order', 'purchase', 'want', 'get', 'take']
};

export function classifyMessage(content: string): MessageIntent {
  const lowerContent = content.toLowerCase();
  
  for (const [intent, keywords] of Object.entries(intentKeywords)) {
    if (keywords.some(keyword => lowerContent.includes(keyword))) {
      return intent as MessageIntent;
    }
  }
  
  return 'general';
}

export function generateAutoReply(intent: MessageIntent, content: string): string {
  const lowerContent = content.toLowerCase();
  
  switch (intent) {
    case 'price_check':
      return "Hi! I'd be happy to help with pricing. Let me check our current prices for you. 💰";
    case 'availability':
      return "Let me check our current stock levels for you! 📦";
    case 'delivery':
      return "Our standard delivery is 2-3 business days. Express delivery available! 🚚";
    case 'returns':
      return "We offer 30-day returns on all items. How can I help with your return? 🔄";
    case 'purchase':
      return "Great choice! I'll help you with your order. What would you like to purchase? 🛒";
    default:
      return "Hi there! How can I help you today? 😊";
  }
}