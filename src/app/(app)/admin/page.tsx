import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { AdminPanel } from "@/components/AdminPanel";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/chat");
  const allUsers = await db.select({ id: users.id, email: users.email, name: users.name, role: users.role, status: users.status, createdAt: users.createdAt }).from(users);
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-text mb-6">Admin</h1>
        <AdminPanel initialUsers={allUsers.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))} currentUserId={user.id} />
      </div>
    </div>
  );
}
