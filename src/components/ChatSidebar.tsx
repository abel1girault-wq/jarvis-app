// @ts-nocheck
"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "@/hooks/useTheme";

function timeAgo(iso) {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "just now"; if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days === 1) return "yesterday"; if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function groupByDate(convs) {
  const now = Date.now(); const DAY = 86400000;
  const groups = [
    { label: "Today", items: [] }, { label: "Yesterday", items: [] },
    { label: "This week", items: [] }, { label: "Older", items: [] },
  ];
  for (const c of convs) {
    const age = now - new Date(c.updatedAt).getTime();
    if (age < DAY) groups[0].items.push(c);
    else if (age < 2*DAY) groups[1].items.push(c);
    else if (age < 7*DAY) groups[2].items.push(c);
    else groups[3].items.push(c);
  }
  return groups.filter(g => g.items.length > 0);
}

export function ChatSidebar({ user }) {
  const router = useRouter(); const pathname = usePathname();
  const { isDark, toggle } = useTheme();
  const [convs, setConvs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false); // mobile drawer

  const load = useCallback(async () => {
    const r = await fetch("/api/conversations");
    if (r.ok) { const d = await r.json(); setConvs(d.conversations ?? []); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { load(); setOpen(false); }, [pathname, load]);

  async function newChat() {
    setLoading(true);
    try {
      const r = await fetch("/api/conversations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gemini-2.0-flash", provider: "GOOGLE" }),
      });
      if (r.ok) { const d = await r.json(); router.push(`/chat/${d.conversation.id}`); setTimeout(load, 300); }
    } finally { setLoading(false); setOpen(false); }
  }

  async function del(e, id) {
    e.preventDefault(); e.stopPropagation();
    setConvs(p => p.filter(c => c.id !== id));
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (pathname === `/chat/${id}`) router.push("/chat");
  }

  const filtered = search ? convs.filter(c => c.title.toLowerCase().includes(search.toLowerCase())) : convs;
  const groups = groupByDate(filtered);
  const activeId = pathname.startsWith("/chat/") ? pathname.split("/chat/")[1] : null;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-base">✦</span>
          <span className="font-semibold text-l-text dark:text-d-text text-sm">Jarvis</span>
        </div>
        <button onClick={() => setOpen(false)} className="md:hidden p-1 text-l-muted dark:text-d-muted">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <div className="px-3 pb-2 shrink-0">
        <button onClick={newChat} disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-accent-DEFAULT hover:bg-accent-hover text-white rounded-xl py-2.5 text-sm font-medium transition disabled:opacity-50">
          <span className="text-base leading-none">+</span><span>New chat</span>
        </button>
      </div>

      <div className="px-3 pb-2 shrink-0">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-l-bg dark:bg-d-card border border-l-border dark:border-d-border">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-l-muted dark:text-d-muted shrink-0"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
            className="flex-1 bg-transparent text-sm text-l-text dark:text-d-text placeholder:text-l-dim dark:placeholder:text-d-dim outline-none min-w-0" />
        </div>
      </div>

      <div className="px-2 pb-2 shrink-0 space-y-0.5">
        {[{ href: "/study", label: "Study tools" }, { href: "/settings", label: "Settings" }].map(l => (
          <Link key={l.href} href={l.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${pathname.startsWith(l.href) ? "bg-l-hover dark:bg-d-hover text-l-text dark:text-d-text" : "text-l-muted dark:text-d-muted hover:bg-l-hover dark:hover:bg-d-hover hover:text-l-text dark:hover:text-d-text"}`}>
            {l.label}
          </Link>
        ))}
        {user.role === "ADMIN" && (
          <Link href="/admin" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-l-muted dark:text-d-muted hover:bg-l-hover dark:hover:bg-d-hover transition">Admin</Link>
        )}
      </div>

      <div className="h-px bg-l-border dark:bg-d-border mx-3 mb-2 shrink-0" />

      <div className="flex-1 overflow-y-auto px-2 min-h-0">
        {convs.length === 0 && !search && <p className="text-xs text-l-dim dark:text-d-dim text-center py-8">No chats yet</p>}
        {groups.map(g => (
          <div key={g.label} className="mb-3">
            <p className="text-[10px] font-semibold text-l-dim dark:text-d-dim uppercase tracking-wider px-3 py-1">{g.label}</p>
            {g.items.map(c => {
              const active = activeId === c.id;
              return (
                <div key={c.id} className={`group relative flex items-center rounded-lg mb-0.5 transition ${active ? "bg-l-hover dark:bg-d-hover" : "hover:bg-l-hover dark:hover:bg-d-hover"}`}>
                  <Link href={`/chat/${c.id}`} className="flex-1 min-w-0 px-3 py-2.5" onClick={() => setOpen(false)}>
                    <p className={`text-sm truncate ${active ? "text-l-text dark:text-d-text font-medium" : "text-l-muted dark:text-d-muted"}`}>{c.title}</p>
                    <p className="text-xs text-l-dim dark:text-d-dim mt-0.5">{timeAgo(c.updatedAt)}</p>
                  </Link>
                  <button onClick={e => del(e, c.id)} className="shrink-0 mr-2 p-1 rounded text-l-dim dark:text-d-dim hover:text-red-500 transition opacity-0 group-hover:opacity-100">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="shrink-0 px-3 py-3 border-t border-l-border dark:border-d-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-accent-DEFAULT flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">{user.name[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-l-text dark:text-d-text truncate">{user.name}</p>
          </div>
          <button onClick={toggle} className="p-1.5 rounded-lg text-l-muted dark:text-d-muted hover:bg-l-hover dark:hover:bg-d-hover transition">
            {isDark
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            }
          </button>
          <button onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; }}
            className="p-1.5 rounded-lg text-l-muted dark:text-d-muted hover:bg-l-hover dark:hover:bg-d-hover transition">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger button - shown when sidebar is closed */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 p-2 bg-l-card dark:bg-d-card border border-l-border dark:border-d-border rounded-lg text-l-text dark:text-d-text shadow-sm"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
      </button>

      {/* Mobile overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar - drawer on mobile, fixed on desktop */}
      <aside className={`
        fixed md:relative inset-y-0 left-0 z-50
        flex flex-col w-72 md:w-64 h-full
        bg-l-sidebar dark:bg-d-sidebar border-r border-l-border dark:border-d-border
        overflow-hidden shrink-0
        transition-transform duration-300
        ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        <SidebarContent />
      </aside>
    </>
  );
}
