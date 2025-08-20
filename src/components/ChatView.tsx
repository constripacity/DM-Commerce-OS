import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Thread, Message } from '../types';
import { useTheme } from './ThemeProvider';
import { formatDistanceToNow } from 'date-fns';

interface ChatViewProps {
  thread: Thread | null;
  onSendMessage: (threadId: string, content: string) => void;
}

export function ChatView({ thread, onSendMessage }: ChatViewProps) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { settings, themeClasses } = useTheme();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread?.messages]);

  const handleSend = () => {
    if (message.trim() && thread) {
      onSendMessage(thread.id, message);
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!thread) {
    return (
      <div className={`flex-1 ${themeClasses.panel} flex items-center justify-center animate-fadeIn`}>
        <div className="text-center">
          <div className={`w-16 h-16 ${themeClasses.accent.replace('hover:', '')} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <Send className="w-8 h-8 text-white" />
          </div>
          <h3 className={`text-lg font-medium ${themeClasses.text} mb-2`}>Select a conversation</h3>
          <p className={`${themeClasses.textSecondary} text-sm`}>Choose a thread from the inbox to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 ${themeClasses.panel} flex flex-col animate-fadeIn`}>
      {/* Chat Header */}
      <div className={`p-4 border-b ${themeClasses.border} bg-white/50`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-lg font-semibold ${themeClasses.text}`}>{thread.customerName}</h2>
            <p className={`text-sm ${themeClasses.textSecondary}`}>Thread #{thread.id.slice(-4)} • {thread.customerPhone}</p>
          </div>
          <div className="text-right">
            <p className={`text-xs ${themeClasses.textSecondary}`}>
              Last active {formatDistanceToNow(thread.lastMessageTime, { addSuffix: true })}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {thread.messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'business' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                msg.sender === 'business'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              } ${msg.isAutoReply ? 'border-2 border-blue-300' : ''}`}
            >
              <p className="text-sm">{msg.content}</p>
              <div className="flex items-center justify-between mt-1">
                <p className={`text-xs ${
                  msg.sender === 'business' ? 'text-green-100' : 'text-gray-500'
                }`}>
                  {formatDistanceToNow(msg.timestamp, { addSuffix: true })}
                </p>
                {msg.isAutoReply && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded ml-2">
                    Auto
                  </span>
                )}
              </div>
              {msg.intent && (
                <div className="mt-1">
                  <span className={`text-xs px-2 py-1 rounded ${
                    msg.sender === 'business' ? 'bg-green-600' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {msg.intent.replace('_', ' ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className={`p-4 border-t ${themeClasses.border} bg-white/50`}>
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a reply..."
            className={`flex-1 px-3 py-2 border ${themeClasses.border} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white`}
          />
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className={`px-4 py-2 ${themeClasses.accent} text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}