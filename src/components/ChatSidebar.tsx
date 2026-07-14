"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";

type Conv = { id: string; title: string; model: string; provider: string; updatedAt: string; pinned: boolean };
type User = { id: string; name: string; email: string; role: string };

function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "just now"; if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const DOT: Record<string, string> = { GOOGLE: "bg-blue-400", ANTHROPIC: "bg-amber-400", OPENAI: "bg-emerald-DEFAULT", GROQ: "bg-orange-400", CUSTOM: "bg-purple-400" };

export function ChatSidebar({ user }: { user: User }) {
  const router = useRouter(); const pathname = usePathname();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/conversations");
    if (r.ok) { const d = await r.json(); setConvs(d.conversations); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { load(); }, [pathname, load]);

  async function newChat() {
    setLoading(true);
    try {
      const r = await fetch("/api/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "gemini-2.0-flash", provider: "GOOGLE" }) });
      if (r.ok) { const d = await r.json(); router.push(`/chat/${d.conversation.id}`); load(); }
    } finally { setLoading(false); }
  }

  async function del(e: React.MouseEvent, id: string) {
    e.preventDefault(); e.stopPropagation();
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    setConvs((p) => p.filter((c) => c.id !== id));
    if (pathname === `/chat/${id}`) router.push("/chat");
  }

  if (collapsed) return (
    <aside className="flex flex-col items-center w-12 border-r border-surface-border bg-surface-raised py-4 gap-4 shrink-0">
      <button onClick={() => setCollapsed(false)} className="text-text-muted hover:text-text transition text-lg"></button>
      <button onClick={newChat} className="text-accent hover:text-accent-hover transition text-xl font-light">+</button>
    </aside>
  );

  return (
    <aside className="flex flex-col w-64 border-r border-surface-border bg-surface-raised overflow-hidden shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border shrink-0">
        <div className="flex items-center gap-2"><span className="text-base"></span><span className="font-semibold text-text text-sm">Jarvis</span></div>
        <button onClick={() => setCollapsed(true)} className="text-text-dim hover:text-text-muted transition text-xs px-1">‹</button>
      </div>

      <div className="px-3 py-2 shrink-0">
        <button onClick={newChat} disabled={loading} className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white rounded-lg py-2 text-sm font-medium transition disabled:opacity-50">
          <span className="text-base leading-none">+</span><span>New chat</span>
        </button>
      </div>

      <div className="px-3 pb-2 space-y-0.5 shrink-0">
        {[{ href: "/study", label: " Study tools" }, { href: "/settings", label: " Settings" }].map((l) => (
          <Link key={l.href} href={l.href} className={`flex items-center px-3 py-2 rounded-lg text-sm transition ${pathname.startsWith(l.href) ? "bg-surface-hover text-text" : "text-text-muted hover:text-text hover:bg-surface-hover"}`}>{l.label}</Link>
        ))}
        {user.role === "ADMIN" && <Link href="/admin" className={`flex items-center px-3 py-2 rounded-lg text-sm transition ${pathname.startsWith("/admin") ? "bg-surface-hover text-text" : "text-text-muted hover:text-text hover:bg-surface-hover"}`}> Admin</Link>}
      </div>

      <div className="h-px bg-surface-border mx-3 mb-1 shrink-0" />

      <div className="flex-1 overflow-y-auto px-2 pb-2 min-h-0">
        {convs.length === 0 && <p className="text-xs text-text-dim text-center py-6">No chats yet</p>}
        {convs.map((c) => {
          const active = pathname === `/chat/${c.id}`;
          return (
            <Link key={c.id} href={`/chat/${c.id}`} className={`group flex items-start gap-2 px-3 py-2.5 rounded-lg text-sm transition relative ${active ? "bg-surface-hover text-text" : "text-text-muted hover:text-text hover:bg-surface-hover"}`}>
              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${DOT[c.provider] ?? "bg-text-dim"}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm leading-tight">{c.title}</p>
                <p className="text-xs text-text-dim mt-0.5">{timeAgo(c.updatedAt)}</p>
              </div>
              <button onClick={(e) => del(e, c.id)} className="opacity-0 group-hover:opacity-100 text-text-dim hover:text-rose-DEFAULT transition shrink-0 text-base leading-none">×</button>
            </Link>
          );
        })}
      </div>

      <div className="px-4 py-3 border-t border-surface-border shrink-0">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm text-text truncate">{user.name}</p>
            <p className="text-xs text-text-dim truncate">{user.email}</p>
          </div>
          <LogoutButton className="ml-2 shrink-0" />
        </div>
      </div>
    </aside>
  );
}
