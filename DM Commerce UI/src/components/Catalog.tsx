import React, { useState } from 'react';
import { Package, Send, Settings } from 'lucide-react';
import { Product } from '../types';
import { useTheme } from './ThemeProvider';

interface CatalogProps {
  products: Product[];
  selectedThreadId: string | null;
  onSendPaymentLink: (threadId: string, productIds: string[]) => void;
  onSendAutoReply: (threadId: string, intent: string, message: string) => void;
}

export function Catalog({ products, selectedThreadId, onSendPaymentLink, onSendAutoReply }: CatalogProps) {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { settings, updateSettings, themeClasses } = useTheme();

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleProductSelect = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSendLink = () => {
    if (selectedThreadId && selectedProducts.length > 0) {
      onSendPaymentLink(selectedThreadId, selectedProducts);
      setSelectedProducts([]);
    }
  };

  const quickActions = [
    { label: 'Reply delivery info', intent: 'delivery', message: 'Standard delivery info' },
    { label: 'Build cart + send payment link', action: 'payment' },
    { label: 'Force mark as paid', action: 'mark_paid' }
  ];

  return (
    <div className={`w-80 ${themeClasses.panel} border-l ${themeClasses.border} flex flex-col animate-fadeIn`}>
      {/* Catalog Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className={`text-lg font-semibold ${themeClasses.text} mb-3 flex items-center gap-2`}>
          <Package className="w-5 h-5" />
          Catalog
        </h2>
        
        <input
          type="text"
          placeholder="Search title or SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full px-3 py-2 border ${themeClasses.border} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white`}
        />
      </div>

      {/* Products */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            onClick={() => handleProductSelect(product.id)}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              selectedProducts.includes(product.id)
                ? 'border-blue-500 bg-blue-50'
                : `border-gray-200 ${themeClasses.hover}`
            }`}
          >
            <div className="flex gap-3">
              <img
                src={product.image}
                alt={product.name}
                className="w-12 h-12 object-cover rounded"
              />
              <div className="flex-1 min-w-0">
                <h3 className={`font-medium ${themeClasses.text} text-sm truncate`}>
                  {product.name}
                </h3>
                <p className={`text-xs ${themeClasses.textSecondary} mb-1`}>
                  {product.sku}
                </p>
                <div className="flex items-center justify-between">
                  <span className={`font-semibold ${themeClasses.text} text-sm`}>
                    €{product.price.toFixed(2)}
                  </span>
                  <span className={`text-xs ${themeClasses.textSecondary}`}>
                    stock {product.stock}
                  </span>
                </div>
              </div>
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (selectedThreadId) {
                  onSendPaymentLink(selectedThreadId, [product.id]);
                }
              }}
              disabled={!selectedThreadId}
              className="w-full mt-2 px-3 py-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white text-xs rounded transition-colors"
            >
              Send link
            </button>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className={`p-4 border-t ${themeClasses.border} bg-gray-50/50`}>
        <h3 className={`text-sm font-medium ${themeClasses.text} mb-3`}>Quick Actions</h3>
        
        <div className="space-y-2">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                if (action.action === 'payment' && selectedProducts.length > 0) {
                  handleSendLink();
                } else if (action.intent && selectedThreadId) {
                  onSendAutoReply(selectedThreadId, action.intent, action.message);
                }
              }}
              disabled={!selectedThreadId || (action.action === 'payment' && selectedProducts.length === 0)}
              className={`w-full px-3 py-2 text-xs rounded transition-colors ${
                action.action === 'payment'
                  ? 'bg-green-500 hover:bg-green-600 text-white disabled:bg-gray-300'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700 disabled:bg-gray-100'
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>

        {selectedProducts.length > 0 && (
          <div className="mt-3 p-2 bg-blue-100 rounded text-xs">
            <p className="font-medium text-blue-800">
              {selectedProducts.length} item{selectedProducts.length > 1 ? 's' : ''} selected
            </p>
            <button
              onClick={() => setSelectedProducts([])}
              className="text-blue-600 hover:text-blue-800 underline mt-1"
            >
              Clear selection
            </button>
          </div>
        )}
      </div>

      {/* Settings */}
      <div className={`p-4 border-t ${themeClasses.border}`}>
        <h3 className={`text-sm font-medium ${themeClasses.text} mb-3 flex items-center gap-2`}>
          <Settings className="w-4 h-4" />
          Settings
        </h3>
        
        <div className="space-y-3">
          <div>
            <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>
              Delivery fee
            </label>
            <input
              type="number"
              step="0.1"
              value={settings.deliveryFee}
              onChange={(e) => updateSettings({ deliveryFee: parseFloat(e.target.value) || 0 })}
              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
            />
          </div>
          
          <div>
            <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>
              ETA (days)
            </label>
            <input
              type="number"
              value={settings.etaDays}
              onChange={(e) => updateSettings({ etaDays: parseInt(e.target.value) || 0 })}
              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
}