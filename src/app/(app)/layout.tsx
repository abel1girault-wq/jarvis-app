import { redirect } from "next/navigation";
import { getCurrentUser, toPublicUser } from "@/lib/auth";
import { ChatSidebar } from "@/components/ChatSidebar";
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.status !== "APPROVED") redirect("/pending");
  return (
    <div className="flex h-full overflow-hidden">
      <ChatSidebar user={toPublicUser(user)} />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
