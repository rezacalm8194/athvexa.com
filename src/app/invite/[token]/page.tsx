import AuthShell from "@/components/AuthShell";
import AcceptInviteCard from "@/components/AcceptInviteCard";
import RegisterForm from "@/components/RegisterForm";
import { db, ensureDatabase } from "@/lib/db";
import { findInviteByToken } from "@/lib/inviteActions";
import { roleLabel, t } from "@/lib/i18n";
import { inviteStatus } from "@/lib/invites";
import { getSession } from "@/lib/session";
import { getRequestLocale } from "@/lib/userPreferences";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const rawToken = (await params).token;
  const locale = await getRequestLocale();
  await ensureDatabase();
  const session = await getSession();
  const invite = await findInviteByToken(rawToken);
  const status = invite ? inviteStatus(invite) : "missing";

  console.info("[invite] lookup", {
    rawToken,
    found: Boolean(invite),
    status,
    useCount: invite?.useCount,
    maxUses: invite?.maxUses,
    expiresAt: invite?.expiresAt,
  });

  if (!invite || status === "revoked" || status === "expired" || status === "missing") {
    const expired = status === "expired";
    return (
      <AuthShell
        title={t(locale, expired ? "auth.inviteExpiredTitle" : "auth.inviteInvalidTitle")}
        subtitle={t(locale, expired ? "auth.inviteExpiredSubtitle" : "auth.inviteInvalidSubtitle")}
      >
        <a href="/register" className="btn-primary block text-center">
          {t(locale, "auth.createAccountInstead")}
        </a>
      </AuthShell>
    );
  }

  if (status === "accepted") {
    return (
      <AuthShell title={t(locale, "auth.inviteUsedTitle")} subtitle={t(locale, "auth.inviteUsedSubtitle")}>
        <a href="/login?next=/dashboard/player" className="btn-primary block text-center">
          {t(locale, "auth.signIn")}
        </a>
      </AuthShell>
    );
  }

  const token = invite.token;
  const role = invite.role === "COACH" ? "COACH" : invite.role === "ASSISTANT" ? "ASSISTANT" : "PLAYER";
  const team =
    invite.team ??
    (invite.teamId
      ? await db.team.findUnique({ where: { id: invite.teamId }, select: { name: true } })
      : await db.team.findFirst({ where: { coachId: invite.coachId }, orderBy: { createdAt: "asc" }, select: { name: true } }));
  const teamLabel = team?.name ?? invite.coach.name;
  const isStaff = role === "ASSISTANT" || role === "COACH";
  const alreadyMember = Boolean(
    session &&
      invite.teamId &&
      (await db.teamMember.findUnique({ where: { teamId_userId: { teamId: invite.teamId, userId: session.sub } } }))
  );

  return (
    <AuthShell
      title={t(locale, isStaff ? "auth.inviteJoinStaff" : "auth.inviteJoinPlayer", { team: teamLabel })}
      subtitle={
        session
          ? t(locale, "auth.inviteSignedInSubtitle", { team: teamLabel })
          : isStaff
            ? t(locale, "auth.inviteStaffSubtitle", { role: roleLabel(role, locale) })
            : t(locale, "auth.invitePlayerSubtitle")
      }
    >
      {session && role === "PLAYER" ? (
        <AcceptInviteCard token={token} locale={locale} teamLabel={teamLabel} alreadyMember={alreadyMember} />
      ) : (
        <RegisterForm locale={locale} inviteToken={token} inviteRole={role} />
      )}
    </AuthShell>
  );
}
