import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './components/ThemeProvider';
import { Header } from './components/Header';
import { Inbox } from './components/Inbox';
import { ChatView } from './components/ChatView';
import { Catalog } from './components/Catalog';
import { EventLog } from './components/EventLog';
import { useSimulation } from './hooks/useSimulation';

function AppContent() {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const {
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
    markThreadAsRead,
    appendLog
  } = useSimulation();

  const selectedThread = threads.find(t => t.id === selectedThreadId) || null;

  useEffect(() => {
    let interval: number | undefined;
    
    if (isSimulationRunning) {
      interval = window.setInterval(() => {
        if (isDemoMode) {
          // deterministic/demo: always produce visible actions each tick
          simulateIncomingMessage();
          simulatePaymentEvent(Math.random() < 0.5 ? 'stripe' : 'paypal');
        } else {
          if (Math.random() < 0.3) {
            simulateIncomingMessage();
          }
          if (Math.random() < 0.1) {
            simulatePaymentEvent(Math.random() < 0.5 ? 'stripe' : 'paypal');
          }
        }
      }, 3000);
    }
    
    return () => {
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, [isSimulationRunning, isDemoMode, simulateIncomingMessage, simulatePaymentEvent]);

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
    setIsSimulationRunning(prev => {
      const next = !prev;
      appendLog(next ? 'Simulation started' : 'Simulation stopped');
      return next;
    });
  };

  const handleToggleDemo = () => {
    setIsDemoMode(prev => {
      const next = !prev;
      appendLog(next ? 'Demo mode enabled' : 'Demo mode disabled');
      return next;
    });
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-orange-50 to-pink-50">
      <Header
        onSimulateMessage={simulateIncomingMessage}
        onSimulatePayment={simulatePaymentEvent}
        onStartSimulation={handleStartSimulation}
        isSimulationRunning={isSimulationRunning}
        onToggleDemo={handleToggleDemo}
        isDemoMode={isDemoMode}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <Inbox
          threads={threads}
          selectedThreadId={selectedThreadId}
          onSelectThread={handleSelectThread}
          paymentLinksSent={paymentLinksSent}
          ordersPaid={ordersPaid}
          onExportCSV={exportOrdersCSV}
          orders={orders}
          onForceMarkPaid={forceMarkPaid}
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
        
        <EventLog entries={eventLog} />
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
