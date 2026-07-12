// @ts-nocheck
"use client";
import { useState, useRef, useEffect } from "react";

type Props = {
  onSend: (text: string) => void;
  onImageRequest: (prompt: string) => void;
  disabled: boolean;
  isRecording: boolean;
  onToggleMic: () => void;
};

export function ChatInput({ onSend, onImageRequest, disabled, isRecording, onToggleMic }: Props) {
  const [text, setText] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const ta = ref.current; if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 180) + "px";
  }, [text]);

  function submit() {
    const t = text.trim(); if (!t || disabled) return;
    if (t.toLowerCase().startsWith("/image ")) { onImageRequest(t.slice(7).trim()); setText(""); return; }
    onSend(t); setText("");
  }

  function onKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
  }

  return (
    <div className="px-4 pb-6 pt-2">
      <div className="max-w-chat mx-auto">
        <div className="flex flex-col bg-l-card dark:bg-d-card border border-l-border dark:border-d-border rounded-2xl shadow-sm focus-within:border-l-muted dark:focus-within:border-d-muted transition overflow-hidden">
          <textarea ref={ref} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey}
            disabled={disabled && !isRecording} rows={1}
            placeholder={isRecording ? "Listening... press mic again to stop" : "Message Jarvis... (/image to generate a picture)"}
            className="w-full bg-transparent px-4 pt-3.5 pb-2 text-sm text-l-text dark:text-d-text placeholder:text-l-dim dark:placeholder:text-d-dim resize-none outline-none max-h-44 overflow-y-auto"
          />
          <div className="flex items-center justify-between px-3 pb-2.5">
            <div className="flex items-center gap-1">
              <button type="button" onClick={onToggleMic}
                title={isRecording ? "Stop recording" : "Start voice input"}
                className={"p-2 rounded-xl transition " + (isRecording ? "bg-red-500 text-white recording-pulse" : "text-l-muted dark:text-d-muted hover:bg-l-hover dark:hover:bg-d-hover")}>
                {isRecording ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="9" y="2" width="6" height="12" rx="3"/>
                    <path d="M5 10a7 7 0 0 0 14 0M12 19v3M9 22h6"/>
                  </svg>
                )}
              </button>
              <button type="button" onClick={() => { const p = window.prompt("Describe the image:"); if (p) onImageRequest(p); }}
                title="Generate image" className="p-2 rounded-xl text-l-muted dark:text-d-muted hover:bg-l-hover dark:hover:bg-d-hover transition">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M20 15l-5-5L5 20"/>
                </svg>
              </button>
            </div>
            <button type="button" onClick={submit} disabled={disabled || !text.trim()}
              className="w-8 h-8 flex items-center justify-center bg-l-text dark:bg-d-text text-l-bg dark:text-d-bg rounded-lg disabled:opacity-30 transition hover:opacity-80">
              {disabled ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
              )}
            </button>
          </div>
        </div>
        <p className="text-center text-xs text-l-dim dark:text-d-dim mt-2">Jarvis can make mistakes. Verify important info.</p>
      </div>
    </div>
  );
}
