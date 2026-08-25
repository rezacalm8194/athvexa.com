import { notFound, redirect } from "next/navigation";
import TeamScopedFoundationPage from "@/components/coach/TeamScopedFoundationPage";
import { getSession } from "@/lib/session";
import { requireTeamMembership } from "@/lib/teamContext";

export default async function TeamAssessmentsPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "PLAYER") redirect("/dashboard/player");

  const membership = await requireTeamMembership(session.sub, teamId);
  if (!membership) notFound();

  return (
    <TeamScopedFoundationPage
      sessionName={session.name}
      sessionRole={session.role}
      team={membership.team}
      membershipRole={membership.role}
      section="Assessments"
      legacyHref="/dashboard/coach/assessments"
    />
  );
}
