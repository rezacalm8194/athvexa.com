"use client";

import { UsersIcon } from "@/components/icons";
import { t, type Locale } from "@/lib/i18n";

export default function EmptyRosterState({
  teamName,
  locale,
  onInvite,
}: {
  teamName: string | null;
  locale: Locale;
  onInvite?: () => void;
}) {
  const title = teamName
    ? t(locale, "coach.dashboard.emptyRosterTitleNamed", { team: teamName })
    : t(locale, "coach.dashboard.emptyRosterTitle");

  return (
    <div className="card flex flex-col items-center gap-4 px-6 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red/10 text-red">
        <UsersIcon className="h-7 w-7" />
      </div>
      <div className="max-w-md">
        <h2 className="font-display text-xl font-bold tracking-wide text-white">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-smoke-3">{t(locale, "coach.dashboard.emptyRosterBody")}</p>
      </div>
      {onInvite ? (
        <button type="button" onClick={onInvite} className="btn-primary !px-5 !py-3 text-sm">
          {t(locale, "coach.dashboard.inviteFirstPlayer")}
        </button>
      ) : (
        <a href="/dashboard/coach/players" className="btn-primary !px-5 !py-3 text-sm">
          {t(locale, "coach.dashboard.inviteFirstPlayer")}
        </a>
      )}
    </div>
  );
}
