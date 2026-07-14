"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { PROVIDERS } from "@/lib/models";

type KeyRow = { id: string; provider: string; label: string; baseUrl: string | null; last4: string };
type GoogleStatus = { connected: boolean; email: string | null; name: string | null };
type User = { name: string; email: string };

export function SettingsClient({ user }: { user: User }) {
  const searchParams = useSearchParams();
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [google, setGoogle] = useState<GoogleStatus>({ connected: false, email: null, name: null });
  const [tab, setTab] = useState<"keys" | "google">("keys");
  const [providerIdx, setProviderIdx] = useState(0);
  const [label, setLabel] = useState(PROVIDERS[0].name);
  const [keyValue, setKeyValue] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const googleStatus = searchParams.get("google");
  useEffect(() => {
    if (googleStatus === "connected") setSuccess("Google connected successfully!");
    if (googleStatus === "error") setError("Failed to connect Google. Please try again.");
  }, [googleStatus]);

  useEffect(() => {
    fetch("/api/keys").then((r) => r.json()).then((d) => setKeys(d.keys ?? []));
    fetch("/api/google/status").then((r) => r.json()).then(setGoogle);
  }, []);

  const provider = PROVIDERS[providerIdx];
  const isOther = provider.id === "CUSTOM" && provider.models.length === 0;

  function onProviderChange(idx: number) {
    const p = PROVIDERS[idx];
    setProviderIdx(idx); setLabel(p.name);
    setBaseUrl(p.baseUrl ?? ""); setKeyValue(""); setError(null);
  }

  async function saveKey(e: React.FormEvent) {
    e.preventDefault(); setError(null); setSaving(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: provider.id, label: label.trim(), key: keyValue.trim(), baseUrl: baseUrl.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Couldn't save."); return; }
      setSuccess("Key saved!");
      setKeyValue("");
      const res2 = await fetch("/api/keys");
      const d2 = await res2.json();
      setKeys(d2.keys ?? []);
      setTimeout(() => setSuccess(null), 3000);
    } finally { setSaving(false); }
  }

  async function deleteKey(id: string) {
    await fetch(`/api/keys/${id}`, { method: "DELETE" });
    setKeys((prev) => prev.filter((k) => k.id !== id));
  }

  async function disconnectGoogle() {
    await fetch("/api/google/status", { method: "DELETE" });
    setGoogle({ connected: false, email: null, name: null });
    setSuccess("Google disconnected.");
    setTimeout(() => setSuccess(null), 3000);
  }

  const PROVIDER_COLORS: Record<string, string> = {
    GOOGLE: "#4285F4", ANTHROPIC: "#D4A574", OPENAI: "#10A37F", GROQ: "#F97316", CUSTOM: "#8B5CF6",
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text">Settings</h1>
          <p className="text-sm text-text-muted mt-1">Signed in as <span className="text-text">{user.name}</span> ({user.email})</p>
        </div>

        {(error || success) && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm border ${error ? "bg-rose-soft border-rose-DEFAULT/30 text-rose-DEFAULT" : "bg-emerald-soft border-emerald-DEFAULT/30 text-emerald-DEFAULT"}`}>
            {error ?? success}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-surface-card border border-surface-border rounded-xl p-1 w-fit">
          {[{ id: "keys", label: " API Keys" }, { id: "google", label: " Google" }].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id as "keys" | "google")} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t.id ? "bg-accent/20 text-accent-hover" : "text-text-muted hover:text-text"}`}>{t.label}</button>
          ))}
        </div>

        {/* API Keys Tab */}
        {tab === "keys" && (
          <div className="space-y-6">
            {keys.length > 0 && (
              <div>
                <h2 className="text-xs uppercase tracking-wide text-text-muted mb-3">Saved keys</h2>
                <div className="space-y-2">
                  {keys.map((k) => (
                    <div key={k.id} className="flex items-center justify-between bg-surface-card border border-surface-border rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PROVIDER_COLORS[k.provider] ?? "#6366F1" }} />
                        <div>
                          <p className="text-sm text-text">{k.label}</p>
                          <p className="text-xs text-text-dim font-mono">•••• {k.last4}{k.baseUrl ? ` · ${k.baseUrl}` : ""}</p>
                        </div>
                      </div>
                      <button onClick={() => deleteKey(k.id)} className="text-text-dim hover:text-rose-DEFAULT transition text-sm px-2 py-1 rounded">Remove</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-surface-card border border-surface-border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-text mb-4">Add an API key</h2>
              <form onSubmit={saveKey} className="space-y-4">
                {/* Provider picker */}
                <div>
                  <label className="block text-xs uppercase tracking-wide text-text-muted mb-2">Provider</label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {PROVIDERS.map((p, i) => (
                      <button key={p.id} type="button" onClick={() => onProviderChange(i)} className={`text-left px-3 py-2.5 rounded-lg border text-xs transition ${providerIdx === i ? "border-accent/60 bg-accent/10 text-accent-hover" : "border-surface-border text-text-muted hover:text-text hover:border-text-dim"}`}>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                          <span className="truncate">{p.name.split(" ")[0]}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {provider.docsUrl && (
                  <p className="text-xs text-text-dim">
                    Get a key at{" "}
                    <a href={provider.docsUrl} target="_blank" rel="noreferrer" className="text-accent-hover hover:underline">{provider.docsUrl.replace("https://", "")}</a>
                    {provider.keyHint.includes("FREE") && <span className="text-emerald-DEFAULT ml-1">— free tier available</span>}
                  </p>
                )}

                <div>
                  <label className="block text-xs uppercase tracking-wide text-text-muted mb-1.5">Label</label>
                  <input value={label} onChange={(e) => setLabel(e.target.value)} required className="w-full bg-surface-raised border border-surface-border rounded-lg px-3 py-2.5 text-sm text-text focus:border-accent outline-none transition" />
                </div>

                {isOther && (
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-text-muted mb-1.5">Base URL</label>
                    <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} required placeholder="https://..." className="w-full bg-surface-raised border border-surface-border rounded-lg px-3 py-2.5 text-sm text-text focus:border-accent outline-none transition" />
                  </div>
                )}

                <div>
                  <label className="block text-xs uppercase tracking-wide text-text-muted mb-1.5">API Key</label>
                  <input type="password" value={keyValue} onChange={(e) => setKeyValue(e.target.value)} required placeholder={provider.keyPlaceholder} className="w-full bg-surface-raised border border-surface-border rounded-lg px-3 py-2.5 text-sm text-text font-mono focus:border-accent outline-none transition" />
                </div>

                <button type="submit" disabled={saving} className="w-full bg-accent hover:bg-accent-hover text-white rounded-lg py-2.5 text-sm font-medium transition disabled:opacity-50">
                  {saving ? "Saving…" : "Save key"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Google Tab */}
        {tab === "google" && (
          <div className="space-y-4">
            <div className="bg-surface-card border border-surface-border rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-text">Google Account</h2>
                  <p className="text-sm text-text-muted mt-1">
                    {google.connected
                      ? `Connected as ${google.email}. Jarvis can now read your Calendar and Classroom.`
                      : "Connect your Google account to see Calendar events and Classroom assignments — Jarvis will automatically reference them in chat."}
                  </p>
                </div>
                {google.connected && (
                  <div className="shrink-0 ml-4 w-3 h-3 rounded-full bg-emerald-DEFAULT" />
                )}
              </div>

              {google.connected ? (
                <button onClick={disconnectGoogle} className="mt-4 px-4 py-2 border border-rose-DEFAULT/40 text-rose-DEFAULT rounded-lg text-sm hover:bg-rose-soft transition">
                  Disconnect Google
                </button>
              ) : (
                <a href="/api/google/auth" className="mt-4 inline-flex px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition">
                  Connect Google
                </a>
              )}
            </div>

            {!process.env.NEXT_PUBLIC_URL && (
              <div className="bg-amber-soft border border-amber-DEFAULT/30 rounded-xl p-4">
                <p className="text-sm text-amber-DEFAULT font-medium">Google OAuth setup required</p>
                <p className="text-xs text-text-muted mt-1">To use Google Calendar and Classroom, you need to set up a Google Cloud project. See the README for step-by-step instructions — it takes about 10 minutes.</p>
              </div>
            )}

            <div className="bg-surface-card border border-surface-border rounded-xl p-5">
              <h3 className="font-medium text-text text-sm mb-2">What Jarvis can access</h3>
              <ul className="space-y-2 text-sm text-text-muted">
                {[" Read your Google Calendar events (read-only)", " See your Google Classroom courses and assignments (read-only)", " Your name and email to identify your account"].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-emerald-DEFAULT mt-0.5"></span>
                    <span>{item.slice(3)}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-text-dim mt-3">Jarvis never writes to your calendar or posts to Classroom. Read-only access only.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
