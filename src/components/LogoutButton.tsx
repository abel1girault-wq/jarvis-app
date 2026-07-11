"use client";
import { useRouter } from "next/navigation";
export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  async function onClick() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login"); router.refresh();
  }
  return <button onClick={onClick} className={`text-sm text-text-muted hover:text-rose-DEFAULT transition ${className ?? ""}`}>Log out</button>;
}
