import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { conversations } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
export default async function ChatIndexPage() {
  const user = await getCurrentUser();
  const [latest] = await db.select({ id: conversations.id }).from(conversations).where(eq(conversations.userId, user!.id)).orderBy(desc(conversations.updatedAt)).limit(1);
  if (latest) redirect(`/chat/${latest.id}`);
  return (
    <div className="flex h-full flex-col items-center justify-center text-center px-6">
      <div className="text-5xl mb-4"></div>
      <h2 className="text-xl font-semibold text-text">Start a conversation</h2>
      <p className="mt-2 text-text-muted text-sm max-w-sm">Click <strong className="text-text">New chat</strong> in the sidebar to begin. Ask anything.</p>
    </div>
  );
}
