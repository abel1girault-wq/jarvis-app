import { getCurrentUser } from "@/lib/auth";
import { StudyDashboard } from "@/components/StudyDashboard";

export default async function StudyPage() {
  const user = await getCurrentUser();
  return <StudyDashboard userName={user!.name} />;
}
