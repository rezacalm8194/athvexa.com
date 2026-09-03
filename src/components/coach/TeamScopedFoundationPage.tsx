import Link from "next/link";
import ServerDashboardNav from "@/components/ServerDashboardNav";
import CoachNav from "@/components/coach/CoachNav";
import { teamRoleLabel } from "@/lib/teamContext";
import type { Locale } from "@/lib/i18n";

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
  return (
    <main className="min-h-screen bg-ink">
      <ServerDashboardNav
        name={sessionName}
        locale={locale}
        settingsHref="/dashboard/coach/settings"
      />
      <CoachNav locale={locale} />
      <section className="mx-auto max-w-[1280px] px-6 py-8">
        <div className="eyebrow">Team workspace</div>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-wide text-white">{team.name}</h1>
        <p className="mt-2 text-sm text-smoke-3">
          {section} is team-scoped and ready for migration. Your access is verified as {teamRoleLabel(membershipRole)}.
        </p>
        <div className="card mt-8 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold text-white">{section}</h2>
              <p className="mt-1 text-sm text-smoke-3">
                Existing coach tools are unchanged while the multi-team foundation is introduced.
              </p>
            </div>
            <Link href={legacyHref} className="btn-primary justify-center !px-4 !py-3 text-sm">
              Open current {section.toLowerCase()}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
