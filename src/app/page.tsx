import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
export default async function HomePage() {
  const user = await getCurrentUser();
  if (user?.status === "APPROVED") redirect("/chat");
  if (user) redirect("/pending");
  return (
    <main className="flex h-full flex-col items-center justify-center px-6 bg-surface">
      <div className="max-w-lg text-center">
        <div className="mb-6 text-5xl"></div>
        <h1 className="text-4xl font-bold text-text tracking-tight">Jarvis</h1>
        <p className="mt-3 text-lg text-text-muted">Chat with Claude, Gemini, GPT and more. Study smarter with Google Classroom. Never miss a deadline.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm text-text-dim">
          {[" Streaming chat", " Image generation", " Google Calendar", " Google Classroom", " Study tools"].map((f) => <span key={f}>{f}</span>)}
        </div>
        <div className="mt-10 flex justify-center gap-3">
          <Link href="/register" className="px-6 py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover transition">Get started</Link>
          <Link href="/login" className="px-6 py-2.5 bg-surface-card text-text-muted rounded-lg font-medium hover:text-text border border-surface-border transition">Log in</Link>
        </div>
      </div>
    </main>
  );
}
