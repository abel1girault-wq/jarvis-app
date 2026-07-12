// @ts-nocheck
// @ts-nocheck
"use client";
import { useState, useRef, useEffect } from "react";
import { STUDY_MODES } from "@/lib/models";

type Props = {
  onSend: (message: string, studyMode: string | null) => void;
  onImageRequest: (prompt: string) => void;
  disabled: boolean;
  studyMode: string | null;
  onStudyModeChange: (mode: string | null) => void;
};

export function ChatInput({ onSend, onImageRequest, disabled, studyMode, onStudyModeChange }: Props) {
  const [text, setText] = useState("");
  const [showModes, setShowModes] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [text]);

  function submit() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    // Detect /image command
    if (trimmed.toLowerCase().startsWith("/image ")) {
      onImageRequest(trimmed.slice(7).trim());
      setText("");
      return;
    }

    onSend(trimmed, studyMode);
    setText("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const currentMode = STUDY_MODES.find((m) => m.id === studyMode);

  return (
    <div className="border-t border-surface-border bg-surface px-4 pb-4 pt-3">
      {/* Study mode bar */}
      {studyMode && (
        <div className="flex items-center gap-2 mb-2 px-1">
          <span className="text-xs text-accent-hover">{currentMode?.label ?? studyMode}</span>
          <button onClick={() => onStudyModeChange(null)} className="text-xs text-text-dim hover:text-rose-DEFAULT transition">× clear</button>
        </div>
      )}

      <div className="flex flex-col bg-surface-card border border-surface-border rounded-2xl overflow-hidden focus-within:border-accent/50 transition">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          placeholder={disabled ? "Thinking…" : "Message Jarvis… (Shift+Enter for new line, /image to generate an image)"}
          rows={1}
          className="w-full bg-transparent px-4 pt-3 pb-2 text-sm text-text placeholder:text-text-dim resize-none outline-none disabled:opacity-50 max-h-48 overflow-y-auto"
          style={{ scrollbarWidth: "thin" }}
        />

        <div className="flex items-center justify-between px-3 pb-2">
          <div className="flex items-center gap-1">
            {/* Study mode picker */}
            <div className="relative">
              <button
                onClick={() => setShowModes((v) => !v)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-text-muted hover:text-text hover:bg-surface-hover transition"
              >
                📚 Study mode
                <span className="text-text-dim">▾</span>
              </button>
              {showModes && (
                <div className="absolute bottom-full left-0 mb-2 w-52 bg-surface-card border border-surface-border rounded-xl shadow-xl z-50 overflow-hidden">
                  <button
                    onClick={() => { onStudyModeChange(null); setShowModes(false); }}
                    className={`w-full text-left px-3 py-2 text-sm transition ${!studyMode ? "text-accent-hover bg-accent/10" : "text-text-muted hover:text-text hover:bg-surface-hover"}`}
                  >
                    🤖 Normal assistant
                  </button>
                  {STUDY_MODES.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { onStudyModeChange(m.id); setShowModes(false); }}
                      className={`w-full text-left px-3 py-2 text-sm transition ${studyMode === m.id ? "text-accent-hover bg-accent/10" : "text-text-muted hover:text-text hover:bg-surface-hover"}`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => {
                const prompt = prompt("Describe the image you want to generate:");
                if (prompt) onImageRequest(prompt);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-text-muted hover:text-text hover:bg-surface-hover transition"
              title="Generate an image"
            >
              🖼️ Image
            </button>
          </div>

          <button
            onClick={submit}
            disabled={disabled || !text.trim()}
            className="w-8 h-8 flex items-center justify-center bg-accent hover:bg-accent-hover text-white rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed text-sm"
          >
            {disabled ? (
              <span className="animate-spin text-xs">⟳</span>
            ) : (
              <span>↑</span>
            )}
          </button>
        </div>
      </div>
      <p className="text-center text-xs text-text-dim mt-2">AI can make mistakes. Verify important info.</p>
    </div>
  );
}
