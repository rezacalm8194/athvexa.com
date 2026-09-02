import { notFound, redirect } from "next/navigation";
import TeamScopedFoundationPage from "@/components/coach/TeamScopedFoundationPage";
import { getSession } from "@/lib/session";
import { requireTeamMembership } from "@/lib/teamContext";
import { getUserPreferences } from "@/lib/userPreferences";

export default async function TeamReportsPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "PLAYER") redirect("/dashboard/player");

  const membership = await requireTeamMembership(session.sub, teamId);
  if (!membership) notFound();
  const { locale } = await getUserPreferences(session.sub);

  return (
    <TeamScopedFoundationPage
      sessionName={session.name}
      sessionRole={session.role}
      locale={locale}
      team={membership.team}
      membershipRole={membership.role}
      section="Reports"
      legacyHref="/dashboard/coach/reports"
    />
  );
}
