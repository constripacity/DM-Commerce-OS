"use client";

import * as React from "react";
import { AnimatePresence } from "framer-motion";
import { ChatBubble } from "@/components/chat/chat-bubble";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type DMFlowStage } from "@/lib/stateMachines/dmFlow";

export interface ChatMessageItem {
  id: string;
  role: "assistant" | "user";
  text: string;
  timestamp?: string;
  stage?: DMFlowStage;
}

interface ChatWindowProps {
  messages: ChatMessageItem[];
}

export function ChatWindow({ messages }: ChatWindowProps) {
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <ScrollArea className="h-[520px] rounded-2xl border bg-surface p-4">
      <div className="flex flex-col gap-4">
        <AnimatePresence initial={false}>
          {messages.map((message, idx) => (
            <ChatBubble
              key={message.id}
              role={message.role}
              text={message.text}
              timestamp={message.timestamp}
              data-sim={idx === messages.length - 1 ? "dm-latest-message" : undefined}
            />
          ))}
        </AnimatePresence>
        <div ref={endRef} />
      </div>
    </ScrollArea>
  );
}
