"use client";

import { useEffect, useState } from "react";
import AuthShell from "@/components/AuthShell";
import AcceptInviteCard from "@/components/AcceptInviteCard";
import RegisterForm from "@/components/RegisterForm";
import { roleLabel, t, type Locale } from "@/lib/i18n";

type InvitePayload =
  | {
      ok: true;
      token: string;
      role: "PLAYER" | "ASSISTANT" | "COACH";
      teamLabel: string;
      isStaff: boolean;
      signedIn: boolean;
      sessionRole: string | null;
      alreadyMember: boolean;
    }
  | { ok: false; status: string };

export default function InviteLanding({ token, locale }: { token: string; locale: Locale }) {
  const [payload, setPayload] = useState<InvitePayload | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/invite/public/${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as InvitePayload | null;
        if (!cancelled) {
          if (!data) setError(true);
          else setPayload(data);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!payload && !error) {
    return (
      <AuthShell title="ATHVEXA" subtitle={t(locale, "auth.invitePlayerSubtitle")}>
        <div className="h-10 animate-pulse rounded-md bg-white/10" />
      </AuthShell>
    );
  }

  if (error || !payload || !payload.ok) {
    const status = payload && !payload.ok ? payload.status : "missing";
    const expired = status === "expired";
    const used = status === "accepted";
    return (
      <AuthShell
        title={t(
          locale,
          used ? "auth.inviteUsedTitle" : expired ? "auth.inviteExpiredTitle" : "auth.inviteInvalidTitle"
        )}
        subtitle={t(
          locale,
          used ? "auth.inviteUsedSubtitle" : expired ? "auth.inviteExpiredSubtitle" : "auth.inviteInvalidSubtitle"
        )}
      >
        <a href={used ? "/login?next=/dashboard/player" : "/register"} className="btn-primary block text-center">
          {used ? t(locale, "auth.signIn") : t(locale, "auth.createAccountInstead")}
        </a>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t(locale, payload.isStaff ? "auth.inviteJoinStaff" : "auth.inviteJoinPlayer", { team: payload.teamLabel })}
      subtitle={
        payload.signedIn
          ? t(locale, "auth.inviteSignedInSubtitle", { team: payload.teamLabel })
          : payload.isStaff
            ? t(locale, "auth.inviteStaffSubtitle", { role: roleLabel(payload.role, locale) })
            : t(locale, "auth.invitePlayerSubtitle")
      }
    >
      {payload.signedIn && payload.role === "PLAYER" ? (
        <AcceptInviteCard
          token={payload.token}
          locale={locale}
          teamLabel={payload.teamLabel}
          alreadyMember={payload.alreadyMember}
        />
      ) : (
        <RegisterForm locale={locale} inviteToken={payload.token} inviteRole={payload.role} />
      )}
    </AuthShell>
  );
}
