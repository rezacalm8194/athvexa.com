import { redirect } from "next/navigation";
import DashboardNav from "@/components/DashboardNav";
import NotificationsCenter from "@/components/NotificationsCenter";
import { getSession } from "@/lib/session";

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const settingsHref = session.role === "PLAYER" ? undefined : "/dashboard/coach/settings";

  return (
    <main className="min-h-screen bg-ink">
      <DashboardNav name={session.name} roleLabel={session.role === "PLAYER" ? "Player" : session.role === "COACH" ? "Coach" : "Assistant coach"} settingsHref={settingsHref} />
      <NotificationsCenter />
    </main>
  );
}
