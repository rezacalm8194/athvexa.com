import DashboardNav from "@/components/DashboardNav";
import CoachNav from "@/components/coach/CoachNav";
import InvitePanel from "@/components/coach/InvitePanel";
import { getCoachContext } from "@/lib/coachContext";

export default async function InvitationsPage() {
  const { session, canManageRoles, roleLabel } = await getCoachContext();

  return (
    <main className="min-h-screen bg-ink">
      <DashboardNav name={session.name} roleLabel={roleLabel} settingsHref="/dashboard/coach/settings" />
      <CoachNav />
      <div className="mx-auto max-w-[1280px] px-6 py-8">
        <div className="mb-6">
          <div className="eyebrow">Team access</div>
          <h1 className="font-display text-3xl font-extrabold tracking-wide text-white">Invitations</h1>
          <p className="mt-1 text-sm text-smoke-3">
            Send, track, revoke and regenerate invite links for players and assistant coaches.
          </p>
        </div>
        <div className="max-w-2xl">
          <InvitePanel coachName={session.name} canManageRoles={canManageRoles} />
        </div>
      </div>
    </main>
  );
}
