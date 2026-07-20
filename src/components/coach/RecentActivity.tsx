import { relativeTime } from "@/lib/format";
import { ClipboardCheckIcon } from "@/components/icons";

type Activity = {
  id: string;
  playerName: string;
  score: number;
  updatedAt: string;
  tone: "good" | "warn" | "bad";
};

const toneColor: Record<Activity["tone"], string> = {
  good: "#4CAF50",
  warn: "#FFC107",
  bad: "#E02020",
};

export default function RecentActivity({ items, loading }: { items: Activity[] | null; loading: boolean }) {
  return (
    <div className="card p-5">
      <h2 className="mb-3 font-display text-lg font-bold tracking-wide text-white">Recent activity</h2>

      {loading && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-md bg-white/5" />
          ))}
        </div>
      )}

      {!loading && items && items.length === 0 && (
        <p className="rounded-md border border-dashed border-line-1 px-3 py-4 text-center text-xs text-smoke-3">
          Check-ins from your players will show up here.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {items?.map((item) => (
          <li key={item.id} className="flex items-start gap-2.5 text-sm">
            <span
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${toneColor[item.tone]}22`, color: toneColor[item.tone] }}
            >
              <ClipboardCheckIcon className="h-3.5 w-3.5" />
            </span>
            <span className="text-smoke-4">
              <span className="font-semibold text-white">{item.playerName}</span> logged a readiness score of{" "}
              <span className="font-semibold text-white">{item.score}</span>
              <span className="block text-[11px] text-smoke-3">{relativeTime(item.updatedAt)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
