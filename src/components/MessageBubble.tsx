"use client";
import { useEffect, useRef } from "react";
import { renderMarkdown } from "@/lib/markdown";

type MessageContent =
  | { type: "text"; text: string }
  | { type: "image"; url: string; prompt: string; revised?: string }
  | { type: "error"; text: string };

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: MessageContent;
  createdAt: string;
};

export function MessageBubble({ message, isStreaming }: { message: Message; isStreaming?: boolean }) {
  const isUser = message.role === "user";
  const content = message.content;

  if (content.type === "image") {
    return (
      <div className={`flex gap-3 px-4 py-4 ${isUser ? "justify-end" : "justify-start"}`}>
        <div className="max-w-lg">
          <img
            src={content.url}
            alt={content.prompt}
            className="rounded-xl border border-surface-border w-full max-w-md"
            loading="lazy"
          />
          {content.revised && content.revised !== content.prompt && (
            <p className="mt-2 text-xs text-text-dim italic">"{content.revised}"</p>
          )}
        </div>
      </div>
    );
  }

  if (content.type === "error") {
    return (
      <div className="flex gap-3 px-4 py-3">
        <div className="w-7 h-7 rounded-full bg-rose-soft flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-rose-DEFAULT text-xs">!</span>
        </div>
        <div className="bg-rose-soft border border-rose-DEFAULT/20 rounded-xl px-4 py-3 max-w-2xl">
          <p className="text-rose-DEFAULT text-sm">{content.text}</p>
        </div>
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="flex justify-end px-4 py-2 message-enter">
        <div className="bg-accent/20 border border-accent/30 rounded-2xl rounded-br-sm px-4 py-3 max-w-2xl">
          <p className="text-text text-sm whitespace-pre-wrap leading-relaxed">{content.text}</p>
        </div>
      </div>
    );
  }

  // Assistant message with markdown
  const html = renderMarkdown(content.text);

  return (
    <div className="flex gap-3 px-4 py-3 message-enter group">
      <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-accent text-xs font-bold">✦</span>
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <div
          className={`prose-chat text-text text-sm max-w-none ${isStreaming ? "streaming-cursor" : ""}`}
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {!isStreaming && (
          <div className="mt-2 opacity-0 group-hover:opacity-100 transition flex gap-2">
            <CopyButton text={content.text} />
          </div>
        )}
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const copied = useRef(false);
  return (
    <button
      onClick={async () => {
        if (copied.current) return;
        await navigator.clipboard.writeText(text);
        copied.current = true;
        setTimeout(() => { copied.current = false; }, 2000);
      }}
      className="text-xs text-text-dim hover:text-text-muted transition px-2 py-1 rounded bg-surface-raised border border-surface-border"
    >
      Copy
    </button>
  );
}
