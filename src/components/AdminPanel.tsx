"use client";
import { useState } from "react";

type UserRow = { id: string; email: string; name: string; role: "USER" | "ADMIN"; status: "PENDING" | "APPROVED" | "REJECTED"; createdAt: string };
const STATUS_STYLES: Record<string, string> = { PENDING: "bg-amber-soft text-amber-DEFAULT border-amber-DEFAULT/30", APPROVED: "bg-emerald-soft text-emerald-DEFAULT border-emerald-DEFAULT/30", REJECTED: "bg-rose-soft text-rose-DEFAULT border-rose-DEFAULT/30" };

export function AdminPanel({ initialUsers, currentUserId }: { initialUsers: UserRow[]; currentUserId: string }) {
  const [users, setUsers] = useState(initialUsers);

  async function setStatus(id: string, status: string) {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, status: status as UserRow["status"] } : u));
    await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
  }

  const pending = users.filter((u) => u.status === "PENDING");
  const others = users.filter((u) => u.status !== "PENDING");

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div>
          <h2 className="text-xs uppercase tracking-wide text-amber-DEFAULT mb-3">⏳ Awaiting approval ({pending.length})</h2>
          <div className="space-y-2">
            {pending.map((u) => <UserCard key={u.id} u={u} currentUserId={currentUserId} onStatus={setStatus} />)}
          </div>
        </div>
      )}
      <div>
        <h2 className="text-xs uppercase tracking-wide text-text-muted mb-3">All users</h2>
        <div className="space-y-2">
          {others.map((u) => <UserCard key={u.id} u={u} currentUserId={currentUserId} onStatus={setStatus} />)}
        </div>
      </div>
    </div>
  );
}

function UserCard({ u, currentUserId, onStatus }: { u: UserRow; currentUserId: string; onStatus: (id: string, status: string) => void }) {
  const isMe = u.id === currentUserId;
  return (
    <div className="flex items-center justify-between bg-surface-card border border-surface-border rounded-xl px-4 py-3">
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-text">{u.name}</p>
          <span className={`inline-flex px-2 py-0.5 rounded border text-xs font-medium ${STATUS_STYLES[u.status]}`}>{u.status}</span>
          {u.role === "ADMIN" && <span className="text-xs text-accent-hover bg-accent/10 px-2 py-0.5 rounded border border-accent/30">Admin</span>}
          {isMe && <span className="text-xs text-text-dim">You</span>}
        </div>
        <p className="text-xs text-text-dim mt-0.5">{u.email} · Joined {new Date(u.createdAt).toLocaleDateString()}</p>
      </div>
      {!isMe && (
        <div className="flex gap-2 shrink-0 ml-4">
          {u.status !== "APPROVED" && <button onClick={() => onStatus(u.id, "APPROVED")} className="px-3 py-1.5 bg-emerald-soft border border-emerald-DEFAULT/30 text-emerald-DEFAULT rounded-lg text-xs hover:bg-emerald-DEFAULT/20 transition">Approve</button>}
          {u.status !== "REJECTED" && <button onClick={() => onStatus(u.id, "REJECTED")} className="px-3 py-1.5 bg-rose-soft border border-rose-DEFAULT/30 text-rose-DEFAULT rounded-lg text-xs hover:bg-rose-DEFAULT/20 transition">Reject</button>}
        </div>
      )}
    </div>
  );
}
