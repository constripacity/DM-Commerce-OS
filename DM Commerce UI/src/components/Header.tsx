import React from 'react';
import { MessageSquare, CreditCard, ShoppingBag, ToggleLeft, ToggleRight, Smile, Zap } from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface HeaderProps {
  onSimulateMessage: () => void;
  onSimulatePayment: (type: 'stripe' | 'paypal') => void;
  onStartSimulation: () => void;
  isSimulationRunning: boolean;
}

export function Header({ onSimulateMessage, onSimulatePayment, onStartSimulation, isSimulationRunning }: HeaderProps) {
  const { settings, updateSettings, themeClasses } = useTheme();

  return (
    <div className={`${themeClasses.panel} border-b ${themeClasses.border} p-4 animate-fadeIn`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className={`text-2xl font-bold ${themeClasses.text} flex items-center gap-2`}>
            <MessageSquare className="w-8 h-8" />
            DM Commerce OS — Sandbox
          </h1>
          <p className={`${themeClasses.textSecondary} text-sm`}>
            Fake chats • Fake payments • Real product thinking
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateSettings({ showEmojis: !settings.showEmojis })}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${themeClasses.hover} transition-colors`}
            >
              <Smile className="w-4 h-4" />
              {settings.showEmojis ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            </button>
            
            <select
              value={settings.theme}
              onChange={(e) => updateSettings({ theme: e.target.value as any })}
              className={`px-3 py-1 rounded-lg border ${themeClasses.border} bg-transparent ${themeClasses.text} text-sm`}
            >
              <option value="sunset">Sunset</option>
              <option value="sky">Sky</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onSimulateMessage}
          className="flex items-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          WhatsApp
        </button>
        
        <button
          onClick={() => onSimulatePayment('stripe')}
          className="flex items-center gap-2 px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <CreditCard className="w-4 h-4" />
          Stripe
        </button>
        
        <button
          onClick={() => onSimulatePayment('paypal')}
          className="flex items-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <ShoppingBag className="w-4 h-4" />
          PayPal
        </button>
        
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={() => updateSettings({ autoReply: !settings.autoReply })}
            className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              settings.autoReply ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {settings.autoReply ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            Auto-Reply
          </button>
          
          <button
            onClick={onStartSimulation}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isSimulationRunning 
                ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                : 'bg-orange-100 text-orange-800 hover:bg-orange-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            {isSimulationRunning ? 'Stop Simulation' : 'Start Simulation'}
          </button>
        </div>
      </div>
    </div>
  );
}