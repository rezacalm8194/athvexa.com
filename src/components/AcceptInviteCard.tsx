"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Locale } from "@/lib/i18n";

export default function AcceptInviteCard({
  token,
  locale,
  teamLabel,
  alreadyMember,
}: {
  token: string;
  locale: Locale;
  teamLabel: string;
  alreadyMember: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (alreadyMember) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-smoke-3">{t(locale, "auth.inviteAlreadyMember", { team: teamLabel })}</p>
        <a href="/dashboard/player" className="btn-primary block text-center">
          {t(locale, "auth.inviteOpenDashboard")}
        </a>
      </div>
    );
  }

  async function accept() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? t(locale, "auth.inviteAcceptFailed"));
        return;
      }
      router.push("/dashboard/player");
      router.refresh();
    } catch {
      setError(t(locale, "auth.inviteAcceptFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-smoke-3">{t(locale, "auth.inviteAcceptHint", { team: teamLabel })}</p>
      {error ? <p className="text-sm text-red-glow">{error}</p> : null}
      <button type="button" className="btn-primary" disabled={loading} onClick={() => void accept()}>
        {loading ? t(locale, "auth.inviteAccepting") : t(locale, "auth.inviteAccept")}
      </button>
    </div>
  );
}
