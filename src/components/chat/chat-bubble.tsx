"use client";

import * as React from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { Bot, User } from "lucide-react";
import { VariableChip } from "@/components/chat/variable-chip";
import { cn } from "@/lib/utils";

interface ChatBubbleProps {
  role: "assistant" | "user";
  text: string;
  timestamp?: string;
}

export function ChatBubble({ role, text, timestamp }: ChatBubbleProps) {
  const formatted = React.useMemo(() => text.replace(/\{\{([^}]+)\}\}/g, "`{{$1}}`"), [text]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn("flex items-start gap-3", role === "assistant" ? "justify-start" : "justify-end")}
    >
      {role === "assistant" ? (
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Bot className="h-4 w-4" />
        </span>
      ) : null}
      <div
        className={cn(
          "max-w-lg rounded-2xl border px-4 py-3 text-sm leading-relaxed shadow-subtle",
          role === "assistant"
            ? "bg-surface text-foreground"
            : "bg-primary text-primary-foreground border-primary"
        )}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSanitize]}
          components={{
            code({ inline, children }) {
              const value = String(children);
              if (inline && /\{\{.*\}\}/.test(value)) {
                return <VariableChip label={value.replace(/`/g, "")} />;
              }
              return <code className="rounded bg-muted px-1 py-0.5 text-xs">{value}</code>;
            },
            p({ children }) {
              return <p className="whitespace-pre-wrap break-words">{children}</p>;
            },
          }}
        >
          {formatted}
        </ReactMarkdown>
        {timestamp ? <p className="mt-2 text-xs text-muted-foreground/80">{timestamp}</p> : null}
      </div>
      {role === "user" ? (
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
          <User className="h-4 w-4" />
        </span>
      ) : null}
    </motion.div>
  );
}
