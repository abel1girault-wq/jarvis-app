import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";
export default async function PendingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.status === "APPROVED") redirect("/chat");
  return (
    <main className="flex h-full items-center justify-center bg-surface px-6">
      <div className="max-w-md text-center">
        <div className="text-4xl mb-4">{user.status === "REJECTED" ? "🚫" : "⏳"}</div>
        <h1 className="text-2xl font-bold text-text">{user.status === "REJECTED" ? "Account not approved" : `Hi ${user.name}!`}</h1>
        <p className="mt-3 text-text-muted">{user.status === "REJECTED" ? "Your account wasn't approved." : "Your account is waiting for admin approval. Check back soon."}</p>
        <div className="mt-6"><LogoutButton /></div>
      </div>
    </main>
  );
}
