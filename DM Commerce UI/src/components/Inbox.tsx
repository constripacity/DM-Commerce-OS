import React from 'react';
import { Thread } from '../types';
import { useTheme } from './ThemeProvider';
import { formatDistanceToNow } from 'date-fns';

interface InboxProps {
  threads: Thread[];
  selectedThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  paymentLinksSent: number;
  ordersPaid: number;
}

export function Inbox({ threads, selectedThreadId, onSelectThread, paymentLinksSent, ordersPaid }: InboxProps) {
  const { themeClasses } = useTheme();
  const conversionRate = paymentLinksSent > 0 ? Math.round((ordersPaid / paymentLinksSent) * 100) : 0;

  return (
    <div className={`w-80 ${themeClasses.panel} border-r ${themeClasses.border} flex flex-col animate-fadeIn`}>
      <div className="p-4 border-b border-gray-200">
        <h2 className={`text-lg font-semibold ${themeClasses.text} mb-3`}>Inbox</h2>
        
        <div className="space-y-2 text-sm">
          <div className={`flex justify-between ${themeClasses.textSecondary}`}>
            <span>{threads.length} threads • {threads.reduce((sum, t) => sum + t.unreadCount, 0)} messages</span>
          </div>
          
          <div className="flex gap-4 text-xs">
            <button className="px-2 py-1 bg-gray-100 rounded text-gray-600 hover:bg-gray-200 transition-colors">
              Clear
            </button>
            <button className="px-2 py-1 bg-gray-100 rounded text-gray-600 hover:bg-gray-200 transition-colors">
              Simulate Tick
            </button>
          </div>
        </div>
        
        <div className={`mt-4 p-3 rounded-lg bg-gray-50 border ${themeClasses.border}`}>
          <h3 className={`text-sm font-medium ${themeClasses.text} mb-2`}>Metrics (live)</h3>
          <div className="space-y-1 text-xs">
            <div className={`flex justify-between ${themeClasses.textSecondary}`}>
              <span>Payment links sent:</span>
              <span className="font-medium">{paymentLinksSent}</span>
            </div>
            <div className={`flex justify-between ${themeClasses.textSecondary}`}>
              <span>Orders paid:</span>
              <span className="font-medium">{ordersPaid}</span>
            </div>
            <div className={`flex justify-between ${themeClasses.textSecondary}`}>
              <span>Conversion (links → paid):</span>
              <span className="font-medium">{conversionRate}%</span>
            </div>
          </div>
          
          <button className="w-full mt-3 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors">
            Export orders CSV
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {threads.map((thread) => (
          <div
            key={thread.id}
            onClick={() => onSelectThread(thread.id)}
            className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${
              selectedThreadId === thread.id 
                ? `${themeClasses.accent.replace('bg-', 'bg-').replace('hover:', '')} text-white` 
                : themeClasses.hover
            }`}
          >
            <div className="flex justify-between items-start mb-1">
              <h3 className={`font-medium ${selectedThreadId === thread.id ? 'text-white' : themeClasses.text}`}>
                {thread.customerName}
              </h3>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${selectedThreadId === thread.id ? 'text-white/80' : themeClasses.textSecondary}`}>
                  {formatDistanceToNow(thread.lastMessageTime, { addSuffix: true })}
                </span>
                {thread.unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                    {thread.unreadCount}
                  </span>
                )}
              </div>
            </div>
            <p className={`text-sm ${selectedThreadId === thread.id ? 'text-white/80' : themeClasses.textSecondary} truncate`}>
              {thread.lastMessage}
            </p>
            <p className={`text-xs ${selectedThreadId === thread.id ? 'text-white/60' : 'text-gray-400'} mt-1`}>
              {thread.customerPhone}
            </p>
          </div>
        ))}
        
        {threads.length === 0 && (
          <div className="p-8 text-center">
            <p className={`${themeClasses.textSecondary} text-sm`}>No conversations yet</p>
            <p className={`${themeClasses.textSecondary} text-xs mt-1`}>Simulate some messages to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}