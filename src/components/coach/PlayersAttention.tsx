import Link from "next/link";
import { AlertIcon, CheckCircleIcon } from "@/components/icons";
import { coachPlayerProfileHref } from "@/lib/coachRoutes";
import { t, type Locale } from "@/lib/i18n";

type AttentionPlayer = {
  id: string;
  name: string;
  loggedToday: boolean;
  score: number;
  label: string;
};

export default function PlayersAttention({
  players,
  loading,
  locale,
}: {
  players: AttentionPlayer[] | null;
  loading: boolean;
  locale: Locale;
}) {
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold tracking-wide text-white">{t(locale, "coach.dashboard.attentionTitle")}</h2>
        <Link href="/dashboard/coach/players" className="text-xs font-medium text-red hover:text-red-glow">
          {t(locale, "coach.dashboard.viewAll")}
        </Link>
      </div>

      {loading && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-md bg-white/5" />
          ))}
        </div>
      )}

      {!loading && players && players.length === 0 && (
        <div className="flex items-center gap-2.5 rounded-md border border-dashed border-line-1 px-3.5 py-4 text-sm text-smoke-3">
          <CheckCircleIcon className="h-4 w-4 shrink-0 text-[#4CAF50]" />
          {t(locale, "coach.dashboard.allGoodToday")}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {players?.map((p) => (
          <Link
            key={p.id}
            href={coachPlayerProfileHref(p.id)}
            className="flex cursor-pointer items-center gap-3 rounded-md border border-white/5 bg-ink-3 p-3 transition-colors hover:border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red/60"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-red/15 text-xs font-bold text-red">
              {p.name.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-white">{p.name}</div>
              <div className="flex items-center gap-1 text-[11px] text-red-glow">
                <AlertIcon className="h-3 w-3" />
                {p.loggedToday ? p.label : t(locale, "coach.dashboard.hasntCheckedIn")}
              </div>
            </div>
            {p.loggedToday && <div className="font-display text-xl font-black text-white">{p.score}</div>}
          </Link>
        ))}
      </div>
    </div>
  );
}
