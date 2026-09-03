import { notFound, redirect } from "next/navigation";
import ServerDashboardNav from "@/components/ServerDashboardNav";
import CoachNav from "@/components/coach/CoachNav";
import TeamProfileSettings from "@/components/coach/TeamProfileSettings";
import { getSession } from "@/lib/session";
import { requireTeamMembership, teamRoleLabel } from "@/lib/teamContext";
import { getUserPreferences } from "@/lib/userPreferences";

export default async function TeamSettingsPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "PLAYER") redirect("/dashboard/player");
  const { locale } = await getUserPreferences(session.sub);

  const membership = await requireTeamMembership(session.sub, teamId);
  if (!membership) notFound();

  const canEdit = session.role === "COACH" || session.role === "ASSISTANT" || membership.role === "OWNER" || membership.role === "HEAD_COACH";

  return (
    <main className="min-h-screen bg-ink">
      <ServerDashboardNav name={session.name} locale={locale} settingsHref="/dashboard/coach/settings" />
      <CoachNav locale={locale} />
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
