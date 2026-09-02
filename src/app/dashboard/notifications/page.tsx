import { redirect } from "next/navigation";
import ServerDashboardNav from "@/components/ServerDashboardNav";
import NotificationsCenter from "@/components/NotificationsCenter";
import { getSession } from "@/lib/session";
import { getUserPreferences } from "@/lib/userPreferences";

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const { locale } = await getUserPreferences(session.sub);

  return (
    <main className="min-h-screen bg-ink">
      <ServerDashboardNav
        name={session.name}
        locale={locale}
        settingsHref={session.role === "PLAYER" ? undefined : "/dashboard/coach/settings"}
      />
      <NotificationsCenter />
    </main>
  );
}
