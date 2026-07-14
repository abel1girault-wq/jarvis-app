"use client";
import { useState, useRef, useEffect } from "react";
import { PROVIDERS } from "@/lib/models";

type KeyOption = { id: string; provider: string; label: string };

type Props = {
  provider: string;
  model: string;
  apiKeyId: string | null;
  userKeys: KeyOption[];
  conversationId: string;
  onChanged: (provider: string, model: string, apiKeyId: string | null) => void;
};

export function ModelSelector({ provider, model, apiKeyId, userKeys, conversationId, onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(provider);
  const [selectedModel, setSelectedModel] = useState(model);
  const [selectedKeyId, setSelectedKeyId] = useState(apiKeyId);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const currentProvider = PROVIDERS.find((p) => p.id === selectedProvider);
  const currentModel = currentProvider?.models.find((m) => m.id === selectedModel);
  const availableKeys = userKeys.filter((k) => k.provider === selectedProvider);

  async function applyChange(prov: string, mod: string, keyId: string | null) {
    await fetch(`/api/conversations/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: prov, model: mod, apiKeyId: keyId }),
    });
    onChanged(prov, mod, keyId);
    setOpen(false);
  }

  function selectProvider(p: typeof PROVIDERS[0]) {
    setSelectedProvider(p.id);
    setSelectedModel(p.models[0]?.id ?? "");
    const firstKey = userKeys.find((k) => k.provider === p.id);
    setSelectedKeyId(firstKey?.id ?? null);
  }

  const providerColor = currentProvider?.color ?? "#6366F1";
  const shortName = currentModel?.name ?? selectedModel;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-raised hover:bg-surface-hover border border-surface-border rounded-lg text-xs text-text-muted hover:text-text transition"
      >
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: providerColor }} />
        <span className="max-w-[120px] truncate">{shortName}</span>
        <span className="text-text-dim"></span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-surface-card border border-surface-border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="p-3 border-b border-surface-border">
            <p className="text-xs text-text-dim uppercase tracking-wide">Choose a model</p>
          </div>

          {/* Provider tabs */}
          <div className="flex gap-1 p-2 border-b border-surface-border overflow-x-auto">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => selectProvider(p)}
                className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition ${selectedProvider === p.id ? "bg-accent/20 text-accent-hover border border-accent/30" : "text-text-muted hover:text-text hover:bg-surface-hover"}`}
              >
                {p.name.split(" ")[0]}
              </button>
            ))}
          </div>

          {/* Models for selected provider */}
          <div className="max-h-52 overflow-y-auto p-2">
            {currentProvider?.models.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedModel(m.id)}
                className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-lg text-sm transition ${selectedModel === m.id ? "bg-accent/20 text-text" : "text-text-muted hover:text-text hover:bg-surface-hover"}`}
              >
                <span>{m.name}</span>
                {m.notes && <span className="text-xs text-emerald-DEFAULT ml-2 shrink-0">{m.notes}</span>}
              </button>
            ))}
            {(currentProvider?.models.length ?? 0) === 0 && (
              <p className="text-xs text-text-dim px-3 py-2">No preset models — type the model name when chatting.</p>
            )}
          </div>

          {/* Key selector if user has multiple */}
          {availableKeys.length > 1 && (
            <div className="p-2 border-t border-surface-border">
              <p className="text-xs text-text-dim mb-1.5 px-1">API key:</p>
              {availableKeys.map((k) => (
                <button
                  key={k.id}
                  onClick={() => setSelectedKeyId(k.id)}
                  className={`w-full text-left px-3 py-1.5 rounded text-xs transition ${selectedKeyId === k.id ? "bg-accent/20 text-accent-hover" : "text-text-muted hover:text-text"}`}
                >
                  {k.label}
                </button>
              ))}
            </div>
          )}

          <div className="p-2 border-t border-surface-border">
            <button
              onClick={() => applyChange(selectedProvider, selectedModel, selectedKeyId)}
              className="w-full bg-accent hover:bg-accent-hover text-white rounded-lg py-2 text-sm font-medium transition"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
