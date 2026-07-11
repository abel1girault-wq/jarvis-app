import { getCurrentUser } from "@/lib/auth";
import { SettingsClient } from "@/components/SettingsClient";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  return <SettingsClient user={{ name: user!.name, email: user!.email }} />;
}
