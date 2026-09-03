import { relativeTime } from "@/lib/format";
import Link from "next/link";
import { ClipboardCheckIcon, UsersIcon } from "@/components/icons";
import { t, type Locale } from "@/lib/i18n";

type Activity = {
  id: string;
  kind?: "CHECK_IN" | "ASSISTANT_ACTIVITY";
  playerId?: string;
  playerName?: string;
  score?: number;
  title?: string;
  description?: string;
  actionHref?: string | null;
  updatedAt: string;
  tone: "good" | "warn" | "bad" | "neutral";
};

const toneColor: Record<Activity["tone"], string> = {
  good: "#4CAF50",
  warn: "#FFC107",
  bad: "#E02020",
  neutral: "#8a8f98",
};

export default function RecentActivity({
  items,
  loading,
  locale,
}: {
  items: Activity[] | null;
  loading: boolean;
  locale: Locale;
}) {
  return (
    <div className="card p-5">
      <h2 className="mb-3 font-display text-lg font-bold tracking-wide text-white">{t(locale, "coach.dashboard.recentActivity")}</h2>

      {loading && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-md bg-white/5" />
          ))}
        </div>
      )}

      {!loading && items && items.length === 0 && (
        <p className="rounded-md border border-dashed border-line-1 px-3 py-4 text-center text-xs text-smoke-3">
          {t(locale, "coach.dashboard.activityEmpty")}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {items?.map((item) => (
          <li key={item.id} className="flex items-start gap-2.5 text-sm">
            <span
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${toneColor[item.tone]}22`, color: toneColor[item.tone] }}
            >
              {item.kind === "ASSISTANT_ACTIVITY" ? <UsersIcon className="h-3.5 w-3.5" /> : <ClipboardCheckIcon className="h-3.5 w-3.5" />}
            </span>
            <span className="text-smoke-4">
              {item.kind === "ASSISTANT_ACTIVITY" ? (
                <>
                  <span className="block font-semibold text-white">{item.title}</span>
                  <span>{item.description}</span>
                  {item.actionHref ? (
                    <Link href={item.actionHref} className="ml-1 font-medium text-red hover:text-red-glow">
                      {t(locale, "coach.dashboard.review")}
                    </Link>
                  ) : null}
                </>
              ) : (
                <>
                  {item.actionHref ? (
                    <Link href={item.actionHref} className="font-semibold text-red transition-colors hover:text-red-glow">
                      {item.playerName}
                    </Link>
                  ) : (
                    <span className="font-semibold text-white">{item.playerName}</span>
                  )}{" "}
                  {t(locale, "coach.dashboard.loggedScore")} <span className="font-semibold text-white">{item.score}</span>
                </>
              )}
              <span className="block text-[11px] text-smoke-3">{relativeTime(item.updatedAt, locale)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
