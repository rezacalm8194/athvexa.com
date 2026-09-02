import PreferencesForm from "@/components/PreferencesForm";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import ServerDashboardNav from "@/components/ServerDashboardNav";
import { getUserPreferences } from "@/lib/userPreferences";
import { t } from "@/lib/i18n";

export default async function PreferencesSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const preferences = await getUserPreferences(session.sub);
  return (
    <main className="min-h-screen bg-ink">
      <ServerDashboardNav
        name={session.name}
        locale={preferences.locale}
        settingsHref={session.role === "PLAYER" ? undefined : "/dashboard/coach/settings"}
      />
      <div className="mx-auto max-w-2xl px-5 py-10">
        <h1 className="font-display text-3xl font-bold text-white">{t(preferences.locale, "settings.title")}</h1>
        <p className="mt-2 text-sm text-smoke-3">{t(preferences.locale, "settings.description")}</p>
        <section className="mt-6 rounded-xl border border-line-1 bg-ink-3 p-6">
          <PreferencesForm settings />
        </section>
      </div>
    </main>
  );
}
