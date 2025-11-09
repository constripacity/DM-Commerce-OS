'use client';

import { useState, useRef, useEffect } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type Message = {
  id: string;
  role: 'prospect' | 'system';
  content: string;
  timestamp: Date;
};

const demoScripts = [
  { category: 'Greeting', name: 'Initial Response', badge: 'default' },
  { category: 'Pitch', name: 'Product Introduction', badge: 'default' },
  { category: 'Qualify', name: 'Interest Check', badge: 'secondary' },
  { category: 'Checkout', name: 'Payment Link', badge: 'default' },
];

export default function DMStudioPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'system',
      content: 'Welcome to DM Studio! Type a message containing "GUIDE" to trigger the keyword flow.',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [currentState, setCurrentState] = useState<string>('Idle');
  const [linkedProduct, setLinkedProduct] = useState<string>('Digital Marketing Guide - $47');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'prospect',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputValue('');

    setTimeout(() => {
      let response = '';
      let newState = currentState;

      if (inputValue.toLowerCase().includes('guide')) {
        response = "Thanks for your interest! I'd love to share my Digital Marketing Guide with you. It's helped hundreds of entrepreneurs like yourself. Can I ask what specific area you're looking to improve?";
        newState = 'Keyword detected';
      } else if (currentState === 'Keyword detected') {
        response = "Perfect! This guide covers exactly that. It's normally $97, but I'm offering it at $47 for a limited time. Would you like me to send you the checkout link?";
        newState = 'Qualifying';
      } else if (currentState === 'Qualifying') {
        response = "Great! Here's your secure checkout link: https://checkout.demo/guide-47\n\nOnce payment is confirmed, you'll receive instant access to the guide. Any questions?";
        newState = 'Ready to Checkout';
      } else {
        response = "Thanks for your message! I'm here to help. Feel free to ask anything about the guide.";
      }

      setCurrentState(newState);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'system',
          content: response,
          timestamp: new Date(),
        },
      ]);
    }, 800);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="DM Studio"
        description="Interactive DM simulator with keyword triggers and automated flows."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-3 rounded-2xl shadow-soft border-orange-50">
          <CardHeader>
            <CardTitle className="text-base">Campaign & Scripts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Active Campaign</label>
              <Select defaultValue="guide">
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="guide">Marketing Guide Campaign</SelectItem>
                  <SelectItem value="course">Course Launch</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Keyword Trigger</label>
              <div className="px-3 py-2 rounded-xl bg-accent border text-sm font-mono">
                GUIDE
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium block">Available Scripts</label>
              {demoScripts.map((script, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">{script.category}</p>
                    <p className="text-sm truncate">{script.name}</p>
                  </div>
                  <Badge variant={script.badge as any} className="text-xs">
                    Auto
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-6 rounded-2xl shadow-soft border-orange-50 flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Chat Simulation</CardTitle>
              <Badge variant="secondary">Demo Mode</Badge>
            </div>
            <CardDescription>
              Type messages to simulate a DM conversation
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            <ScrollArea className="flex-1 px-6" ref={scrollRef}>
              <div className="space-y-4 py-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex gap-3',
                      message.role === 'prospect' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {message.role === 'system' && (
                      <div className="rounded-xl bg-primary/10 p-2 shrink-0">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'rounded-2xl px-4 py-3 max-w-[80%]',
                        message.role === 'prospect'
                          ? 'bg-muted text-foreground'
                          : 'bg-primary/5 text-foreground border border-primary/10'
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {message.timestamp.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {message.role === 'prospect' && (
                      <div className="rounded-xl bg-muted p-2 shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="border-t p-4">
              <div className="flex gap-2">
                <Input
                  placeholder='Type a DM containing the keyword "GUIDE" to start...'
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="rounded-xl"
                />
                <Button
                  onClick={handleSend}
                  size="icon"
                  className="rounded-xl shrink-0"
                  disabled={!inputValue.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs">Enter</kbd> to send
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 rounded-2xl shadow-soft border-orange-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Inspector</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Current State</label>
              <div className="px-3 py-2 rounded-xl bg-accent border">
                <p className="text-sm font-medium">{currentState}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Linked Product</label>
              <div className="px-3 py-2 rounded-xl bg-primary/5 border border-primary/20">
                <p className="text-sm">{linkedProduct}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Next Action</label>
              <div className="space-y-2">
                {currentState === 'Idle' && (
                  <p className="text-sm text-muted-foreground">
                    Waiting for keyword trigger in prospect message
                  </p>
                )}
                {currentState === 'Keyword detected' && (
                  <p className="text-sm text-muted-foreground">
                    Send qualification question to gauge interest
                  </p>
                )}
                {currentState === 'Qualifying' && (
                  <p className="text-sm text-muted-foreground">
                    Provide checkout link and handle objections
                  </p>
                )}
                {currentState === 'Ready to Checkout' && (
                  <p className="text-sm text-muted-foreground">
                    Answer questions and confirm payment
                  </p>
                )}
              </div>
            </div>

            <div className="pt-4 space-y-2">
              <Button variant="outline" size="sm" className="w-full rounded-xl">
                View Full Script
              </Button>
              <Button variant="ghost" size="sm" className="w-full rounded-xl">
                Reset Conversation
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
