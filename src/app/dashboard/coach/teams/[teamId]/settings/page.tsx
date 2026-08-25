import { notFound, redirect } from "next/navigation";
import DashboardNav from "@/components/DashboardNav";
import CoachNav from "@/components/coach/CoachNav";
import TeamProfileSettings from "@/components/coach/TeamProfileSettings";
import { getSession } from "@/lib/session";
import { requireTeamMembership, teamRoleLabel } from "@/lib/teamContext";

export default async function TeamSettingsPage({ params }: { params: { teamId: string } }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "PLAYER") redirect("/dashboard/player");

  const membership = await requireTeamMembership(session.sub, params.teamId);
  if (!membership) notFound();

  const canEdit = session.role === "COACH" || session.role === "ASSISTANT" || membership.role === "OWNER" || membership.role === "HEAD_COACH";

  return (
    <main className="min-h-screen bg-ink">
      <DashboardNav
        name={session.name}
        roleLabel={session.role === "COACH" ? "Coach" : "Assistant coach"}
        settingsHref="/dashboard/coach/settings"
      />
      <CoachNav />
      <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-red">Team settings</p>
          <h1 className="mt-2 font-display text-3xl font-black text-white sm:text-4xl">{membership.team.name}</h1>
          <p className="mt-2 max-w-2xl text-sm text-smoke-3">Edit this team's public identity and core sport context.</p>
        </div>
        <TeamProfileSettings
          team={membership.team}
          ownerName={session.name}
          roleLabel={teamRoleLabel(membership.role)}
          canEdit={canEdit}
        />
      </section>
    </main>
  );
}
