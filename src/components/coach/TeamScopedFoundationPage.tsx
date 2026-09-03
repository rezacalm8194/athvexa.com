import Link from "next/link";
import ServerDashboardNav from "@/components/ServerDashboardNav";
import CoachNav from "@/components/coach/CoachNav";
import { teamRoleLabel, t, type Locale } from "@/lib/i18n";

type Props = {
  sessionName: string;
  sessionRole: string;
  locale: Locale;
  team: {
    id: string;
    name: string;
    sport?: string | null;
  };
  membershipRole: string;
  section: string;
  legacyHref: string;
};

export default function TeamScopedFoundationPage({
  sessionName,
  sessionRole: _sessionRole,
  locale,
  team,
  membershipRole,
  section,
  legacyHref,
}: Props) {
  const roleLabel = teamRoleLabel(membershipRole, locale);

  return (
    <main className="min-h-screen bg-ink">
      <ServerDashboardNav
        name={sessionName}
        locale={locale}
        settingsHref="/dashboard/coach/settings"
      />
      <CoachNav locale={locale} />
      <section className="mx-auto max-w-[1280px] px-6 py-8">
        <div className="eyebrow">{t(locale, "coach.teamScoped.eyebrow")}</div>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-wide text-white">{team.name}</h1>
        <p className="mt-2 text-sm text-smoke-3">
          {t(locale, "coach.teamScoped.body", { section, role: roleLabel })}
        </p>
        <div className="card mt-8 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold text-white">{section}</h2>
              <p className="mt-1 text-sm text-smoke-3">{t(locale, "coach.teamScoped.cardBody")}</p>
            </div>
            <Link href={legacyHref} className="btn-primary justify-center !px-4 !py-3 text-sm">
              {t(locale, "coach.teamScoped.openCurrent", { section: section.toLowerCase() })}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
