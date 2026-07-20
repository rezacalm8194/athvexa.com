import AuthShell from "@/components/AuthShell";
import RegisterForm from "@/components/RegisterForm";
import { db } from "@/lib/db";

export default async function InvitePage({ params }: { params: { token: string } }) {
  const invite = await db.invite.findUnique({
    where: { token: params.token },
    include: { coach: { select: { name: true } } },
  });

  const isValid = Boolean(invite && !invite.usedAt && invite.expiresAt > new Date());

  if (!invite || !isValid) {
    return (
      <AuthShell
        title="This invite link isn't valid"
        subtitle="It may have expired or already been used. Ask your coach to send a new one."
      >
        <a href="/register" className="btn-primary block text-center">
          Create an account instead
        </a>
      </AuthShell>
    );
  }

  const role = invite.role === "ASSISTANT" ? "ASSISTANT" : "PLAYER";
  const team = await db.team.findUnique({ where: { coachId: invite.coachId }, select: { name: true } });
  const teamLabel = team?.name ?? invite.coach.name;

  return (
    <AuthShell
      title={
        role === "ASSISTANT"
          ? `Join ${teamLabel}'s staff on Athvexa`
          : `Join ${teamLabel} on Athvexa`
      }
      subtitle={
        role === "ASSISTANT"
          ? "Create your assistant coach account to help manage the roster."
          : "Create your player account to get today's training and check in."
      }
    >
      <RegisterForm inviteToken={params.token} inviteRole={role} />
    </AuthShell>
  );
}
