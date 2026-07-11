import { redirect, notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversations, messages, apiKeys } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { ChatWindow } from "@/components/ChatWindow";

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [conv] = await db.select().from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, user.id))).limit(1);
  if (!conv) notFound();

  const msgs = await db.select().from(messages)
    .where(eq(messages.conversationId, id)).orderBy(messages.createdAt);

  const userKeys = await db.select({ id: apiKeys.id, provider: apiKeys.provider, label: apiKeys.label })
    .from(apiKeys).where(eq(apiKeys.userId, user.id));

  return (
    <ChatWindow
      conversation={{ id: conv.id, title: conv.title, model: conv.model, provider: conv.provider, apiKeyId: conv.apiKeyId ?? null }}
      initialMessages={msgs.map((m) => ({ id: m.id, role: m.role, content: m.content, createdAt: m.createdAt.toISOString() }))}
      userKeys={userKeys}
      userName={user.name}
    />
  );
}
