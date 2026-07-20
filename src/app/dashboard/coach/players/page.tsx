import DashboardNav from "@/components/DashboardNav";
import CoachNav from "@/components/coach/CoachNav";
import PlayersPageView from "@/components/coach/PlayersPageView";
import { getCoachContext } from "@/lib/coachContext";

export default async function PlayersPage() {
  const { session, team, canManageRoles, roleLabel } = await getCoachContext();

  return (
    <main className="min-h-screen bg-ink">
      <DashboardNav name={session.name} roleLabel={roleLabel} settingsHref="/dashboard/coach/settings" />
      <CoachNav />
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
