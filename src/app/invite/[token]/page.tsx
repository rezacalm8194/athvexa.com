import AuthShell from "@/components/AuthShell";
import RegisterForm from "@/components/RegisterForm";
import { db, ensureDatabase } from "@/lib/db";
import { roleLabel, t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/userPreferences";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const locale = await getRequestLocale();
  await ensureDatabase();
  const invite = await db.invite.findUnique({
    where: { token },
    include: { coach: { select: { name: true } } },
  });

  const isValid = Boolean(invite && !invite.revoked && invite.useCount < invite.maxUses && invite.expiresAt > new Date());

  if (!invite || !isValid) {
    return (
      <AuthShell title={t(locale, "auth.inviteInvalidTitle")} subtitle={t(locale, "auth.inviteInvalidSubtitle")}>
        <a href="/register" className="btn-primary block text-center">
          {t(locale, "auth.createAccountInstead")}
        </a>
      </AuthShell>
    );
  }

  const role = invite.role === "COACH" ? "COACH" : invite.role === "ASSISTANT" ? "ASSISTANT" : "PLAYER";
  const team = invite.teamId
    ? await db.team.findUnique({ where: { id: invite.teamId }, select: { name: true } })
    : await db.team.findFirst({ where: { coachId: invite.coachId }, orderBy: { createdAt: "asc" }, select: { name: true } });
  const teamLabel = team?.name ?? invite.coach.name;
  const isStaff = role === "ASSISTANT" || role === "COACH";

  return (
    <AuthShell
      title={t(locale, isStaff ? "auth.inviteJoinStaff" : "auth.inviteJoinPlayer", { team: teamLabel })}
      subtitle={
        isStaff
          ? t(locale, "auth.inviteStaffSubtitle", { role: roleLabel(role, locale) })
          : t(locale, "auth.invitePlayerSubtitle")
      }
    >
      <RegisterForm locale={locale} inviteToken={token} inviteRole={role} />
    </AuthShell>
  );
}
