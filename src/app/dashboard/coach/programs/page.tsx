import DashboardNav from "@/components/DashboardNav";
import CoachNav from "@/components/coach/CoachNav";
import ProgramsPageView from "@/components/coach/ProgramsPageView";
import { getCoachContext } from "@/lib/coachContext";

export default async function ProgramsPage() {
  const { session, team, roleLabel } = await getCoachContext();

  return (
    <main className="min-h-screen bg-ink">
      <DashboardNav name={session.name} roleLabel={roleLabel} settingsHref="/dashboard/coach/settings" />
      <CoachNav />
      <div className="mx-auto max-w-[1280px] px-6 py-8">
        <div className="mb-6">
          <div className="eyebrow">{team?.name ?? "Team"}</div>
          <h1 className="font-display text-3xl font-extrabold tracking-wide text-white">Training programs</h1>
          <p className="mt-1 text-sm text-smoke-3">
            Build structured programs with sessions and a duration, then assign them to your players.
          </p>
        </div>
        <ProgramsPageView />
      </div>
    </main>
  );
}
