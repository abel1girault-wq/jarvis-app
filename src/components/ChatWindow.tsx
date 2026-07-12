// @ts-nocheck
"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MessageBubble } from "@/components/MessageBubble";
import { ChatInput } from "@/components/ChatInput";
import { ModelSelector } from "@/components/ModelSelector";

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

type Conversation = {
  id: string; title: string; model: string;
  provider: string; apiKeyId: string | null;
};

type KeyOption = { id: string; provider: string; label: string };

type Props = {
  conversation: Conversation;
  initialMessages: Message[];
  userKeys: KeyOption[];
  userName: string;
};

export function ChatWindow({ conversation, initialMessages, userKeys, userName }: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [studyMode, setStudyMode] = useState<string | null>(null);
  const [conv, setConv] = useState(conversation);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(conversation.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  const sendMessage = useCallback(async (text: string, mode: string | null) => {
    if (streaming) return;

    const userMsg: Message = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content: { type: "text", text },
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setStreaming(true);
    setStreamingText("");
    setError(null);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: conv.id, message: text, studyMode: mode }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Error ${res.status}`);
      }

      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let accumulated = "";
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.text) { accumulated += parsed.text; setStreamingText(accumulated); }
          } catch (e) {
            if ((e as Error).message !== "Unexpected token") throw e;
          }
        }
      }

      // Add final assistant message
      if (accumulated) {
        const assistantMsg: Message = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: { type: "text", text: accumulated },
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }

      // Auto-update title in header if it changed from "New chat"
      if (title === "New chat") {
        const res2 = await fetch(`/api/conversations/${conv.id}`);
        if (res2.ok) {
          const data = await res2.json();
          if (data.conversation?.title && data.conversation.title !== "New chat") {
            setTitle(data.conversation.title);
            router.refresh();
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setError(msg);
      setMessages((prev) => [...prev, {
        id: `err-${Date.now()}`, role: "assistant",
        content: { type: "error", text: msg }, createdAt: new Date().toISOString(),
      }]);
    } finally {
      setStreaming(false);
      setStreamingText("");
    }
  }, [streaming, conv.id, title, router]);

  async function generateImage(prompt: string) {
    if (streaming) return;
    setStreaming(true);
    setError(null);

    const userMsg: Message = {
      id: `tmp-img-${Date.now()}`,
      role: "user",
      content: { type: "text", text: `🖼️ Generate image: ${prompt}` },
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, conversationId: conv.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Image generation failed.");

      setMessages((prev) => [...prev, {
        id: `img-${Date.now()}`, role: "assistant",
        content: { type: "image", url: data.url, prompt, revised: data.revised },
        createdAt: new Date().toISOString(),
      }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Image generation failed.";
      setError(msg);
    } finally {
      setStreaming(false);
    }
  }

  function stopStreaming() {
    abortRef.current?.abort();
    setStreaming(false);
    setStreamingText("");
  }

  async function saveTitle() {
    setEditingTitle(false);
    await fetch(`/api/conversations/${conv.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    router.refresh();
  }

  // Build the streaming message to display
  const streamingMessage: Message | null = streamingText ? {
    id: "streaming", role: "assistant",
    content: { type: "text", text: streamingText },
    createdAt: new Date().toISOString(),
  } : null;

  const allMessages = streamingMessage ? [...messages, streamingMessage] : messages;

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border bg-surface-raised shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {editingTitle ? (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") setEditingTitle(false); }}
              autoFocus
              className="bg-surface-card border border-accent/50 rounded px-2 py-1 text-sm text-text outline-none max-w-xs"
            />
          ) : (
            <button
              onClick={() => setEditingTitle(true)}
              className="text-sm font-medium text-text truncate hover:text-text-muted transition max-w-sm"
              title="Click to rename"
            >
              {title}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ModelSelector
            provider={conv.provider}
            model={conv.model}
            apiKeyId={conv.apiKeyId}
            userKeys={userKeys}
            conversationId={conv.id}
            onChanged={(p, m, k) => setConv({ ...conv, provider: p, model: m, apiKeyId: k })}
          />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4">
        {allMessages.length === 0 && !streaming && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 pb-20">
            <div className="text-4xl mb-4">✦</div>
            <h2 className="text-lg font-semibold text-text">Hi {userName.split(" ")[0]}! What can I help with?</h2>
            <p className="mt-2 text-sm text-text-muted max-w-sm">Ask anything. Use <code className="bg-surface-raised px-1 rounded text-xs">/image</code> to generate images, or pick a study mode below.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-lg">
              {["Explain how photosynthesis works", "Help me study for my maths test", "What do I have on my calendar today?", "Write a short story about space"].map((suggestion) => (
                <button key={suggestion} onClick={() => sendMessage(suggestion, studyMode)} className="px-3 py-2 bg-surface-card border border-surface-border rounded-lg text-sm text-text-muted hover:text-text hover:border-accent/40 transition">
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {allMessages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isStreaming={msg.id === "streaming"}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Stop button when streaming */}
      {streaming && (
        <div className="flex justify-center pb-2 shrink-0">
          <button onClick={stopStreaming} className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-card border border-surface-border rounded-lg text-xs text-text-muted hover:text-rose-DEFAULT hover:border-rose-DEFAULT/40 transition">
            ⬛ Stop generating
          </button>
        </div>
      )}

      {/* Input */}
      <div className="shrink-0">
        <ChatInput
          onSend={sendMessage}
          onImageRequest={generateImage}
          disabled={streaming}
          studyMode={studyMode}
          onStudyModeChange={setStudyMode}
        />
      </div>
    </div>
  );
}
