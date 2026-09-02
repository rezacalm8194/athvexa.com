import ServerDashboardNav from "@/components/ServerDashboardNav";
import CoachNav from "@/components/coach/CoachNav";
import PlayersPageView from "@/components/coach/PlayersPageView";
import { getCoachContext } from "@/lib/coachContext";
import { coachPlayerProfileHref } from "@/lib/coachRoutes";
import { getUserPreferences } from "@/lib/userPreferences";
import { redirect } from "next/navigation";

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ playerId?: string | string[] }>;
}) {
  const { playerId } = await searchParams;
  const legacyPlayerId = Array.isArray(playerId) ? playerId[0] : playerId;
  if (legacyPlayerId) redirect(coachPlayerProfileHref(legacyPlayerId));

  const { session, team, canManageRoles } = await getCoachContext();
  const { locale } = await getUserPreferences(session.sub);

  return (
    <main className="min-h-screen bg-ink">
      <ServerDashboardNav name={session.name} locale={locale} settingsHref="/dashboard/coach/settings" />
      <CoachNav locale={locale} />
      <div className="mx-auto max-w-[1280px] px-6 py-8">
        <div className="mb-6">
          <div className="eyebrow">{team?.name ?? "Team"}</div>
          <h1 className="font-display text-3xl font-extrabold tracking-wide text-white">Players</h1>
          <p className="mt-1 text-sm text-smoke-3">Everyone on your roster, with today&apos;s readiness at a glance.</p>
        </div>
        <PlayersPageView canManageRoles={canManageRoles} />
      </div>
    </main>
  );
}
