import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './components/ThemeProvider';
import { Header } from './components/Header';
import { Inbox } from './components/Inbox';
import { ChatView } from './components/ChatView';
import { Catalog } from './components/Catalog';
import { useSimulation } from './hooks/useSimulation';

function AppContent() {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  
  const {
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
  } = useSimulation();

  const selectedThread = threads.find(t => t.id === selectedThreadId) || null;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isSimulationRunning) {
      interval = setInterval(() => {
        if (Math.random() < 0.3) {
          simulateIncomingMessage();
        }
        if (Math.random() < 0.1) {
          simulatePaymentEvent(Math.random() < 0.5 ? 'stripe' : 'paypal');
        }
      }, 3000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSimulationRunning, simulateIncomingMessage, simulatePaymentEvent]);

  const handleSelectThread = (threadId: string) => {
    setSelectedThreadId(threadId);
    markThreadAsRead(threadId);
  };

  const handleSendMessage = (threadId: string, content: string) => {
    sendMessage(threadId, content);
  };

  const handleSendAutoReply = (threadId: string, intent: string, message: string) => {
    sendAutoReply(threadId, intent, message);
  };

  const handleStartSimulation = () => {
    setIsSimulationRunning(!isSimulationRunning);
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-orange-50 to-pink-50">
      <Header
        onSimulateMessage={simulateIncomingMessage}
        onSimulatePayment={simulatePaymentEvent}
        onStartSimulation={handleStartSimulation}
        isSimulationRunning={isSimulationRunning}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <Inbox
          threads={threads}
          selectedThreadId={selectedThreadId}
          onSelectThread={handleSelectThread}
          paymentLinksSent={paymentLinksSent}
          ordersPaid={ordersPaid}
        />
        
        <ChatView
          thread={selectedThread}
          onSendMessage={handleSendMessage}
        />
        
        <Catalog
          products={products}
          selectedThreadId={selectedThreadId}
          onSendPaymentLink={sendPaymentLink}
          onSendAutoReply={handleSendAutoReply}
        />
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;