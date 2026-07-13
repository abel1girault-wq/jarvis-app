// @ts-nocheck
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PendingPage() {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.user?.status === "APPROVED") {
        router.push("/chat");
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [router]);

  return (
    <main className="flex h-full items-center justify-center bg-surface px-6">
      <div className="max-w-md text-center">
        <div className="text-4xl mb-4">⏳</div>
        <h1 className="text-2xl font-bold text-l-text dark:text-d-text">Waiting for approval</h1>
        <p className="mt-3 text-l-muted dark:text-d-muted">An admin needs to approve your account. This page will automatically redirect you once approved.</p>
        <div className="mt-4 flex justify-center gap-1">
          <div className="w-2 h-2 rounded-full bg-accent-DEFAULT animate-bounce" style={{animationDelay:"0ms"}}></div>
          <div className="w-2 h-2 rounded-full bg-accent-DEFAULT animate-bounce" style={{animationDelay:"150ms"}}></div>
          <div className="w-2 h-2 rounded-full bg-accent-DEFAULT animate-bounce" style={{animationDelay:"300ms"}}></div>
        </div>
      </div>
    </main>
  );
}
