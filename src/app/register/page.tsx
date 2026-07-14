"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true);
    try {
      const res = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }
      router.push(data.user.status === "APPROVED" ? "/chat" : "/pending"); router.refresh();
    } finally { setLoading(false); }
  }

  return (
    <main className="flex h-full items-center justify-center bg-surface px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-3xl mb-2"></div>
          <h1 className="text-2xl font-bold text-text">Create your account</h1>
          <p className="mt-1 text-sm text-text-muted">Accounts need admin approval before sign-in.</p>
        </div>
        <div className="bg-surface-card border border-surface-border rounded-xl p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wide text-text-muted mb-1.5">Name</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-surface-raised border border-surface-border rounded-lg px-3 py-2.5 text-sm text-text focus:border-accent outline-none transition" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-text-muted mb-1.5">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-surface-raised border border-surface-border rounded-lg px-3 py-2.5 text-sm text-text focus:border-accent outline-none transition" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-text-muted mb-1.5">Password</label>
              <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-surface-raised border border-surface-border rounded-lg px-3 py-2.5 text-sm text-text focus:border-accent outline-none transition" />
            </div>
            {error && <p className="text-rose-DEFAULT text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="w-full bg-accent hover:bg-accent-hover text-white rounded-lg py-2.5 text-sm font-medium transition disabled:opacity-50">
              {loading ? "Creating…" : "Create account"}
            </button>
          </form>
        </div>
        <p className="mt-4 text-center text-sm text-text-muted">Already have one? <Link href="/login" className="text-accent-hover hover:underline">Log in</Link></p>
      </div>
    </main>
  );
}
