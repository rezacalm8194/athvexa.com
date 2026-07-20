"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/coach/shared/StatusBadge";

type Detail = {
  id: string;
  name: string;
  description: string | null;
  goal: string | null;
  durationWeeks: number;
  sessionsPerWeek: number;
  startDate: string | null;
  endDate: string | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  sessions: { id: string; title: string; day: string; durationMinutes: number | null; intensity: string; notes: string | null }[];
  assignedPlayers: { id: string; name: string; email: string }[];
};

const STATUS_TONE = { DRAFT: "neutral", ACTIVE: "good", ARCHIVED: "warn" } as const;

export default function ProgramDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/coach/programs/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setDetail(data.program))
      .catch(() => setError(true));
  }, [id]);

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/70 p-4 py-8" onClick={onClose}>
      <div className="w-full max-w-xl rounded-lg border border-white/10 bg-ink-3 p-5 shadow-2xl sm:p-6" onClick={(e) => e.stopPropagation()}>
        {error && <p className="text-sm text-red-glow">Could not load this program.</p>}
        {!detail && !error && <div className="h-32 animate-pulse rounded-md bg-white/5" />}
        {detail && (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold text-white">{detail.name}</h2>
                {detail.goal && <p className="mt-0.5 text-sm text-smoke-3">{detail.goal}</p>}
              </div>
              <StatusBadge label={detail.status} tone={STATUS_TONE[detail.status]} />
            </div>
            {detail.description && <p className="mt-3 text-sm text-paper">{detail.description}</p>}

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <div className="eyebrow">Duration</div>
                <div className="mt-0.5 text-white">{detail.durationWeeks}w</div>
              </div>
              <div>
                <div className="eyebrow">Per week</div>
                <div className="mt-0.5 text-white">{detail.sessionsPerWeek}</div>
              </div>
              <div>
                <div className="eyebrow">Start</div>
                <div className="mt-0.5 text-white">{detail.startDate ?? "—"}</div>
              </div>
              <div>
                <div className="eyebrow">End</div>
                <div className="mt-0.5 text-white">{detail.endDate ?? "—"}</div>
              </div>
            </div>

            <div className="mt-5">
              <span className="eyebrow">Sessions ({detail.sessions.length})</span>
              {detail.sessions.length === 0 ? (
                <p className="mt-2 text-xs text-smoke-3">No sessions added.</p>
              ) : (
                <div className="mt-2 flex flex-col gap-2">
                  {detail.sessions.map((s) => (
                    <div key={s.id} className="rounded-md border border-white/5 bg-ink-2 p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="font-medium text-white">{s.title}</span>
                        <span className="text-xs text-smoke-3">
                          {s.day} · {s.durationMinutes ? `${s.durationMinutes} min` : "—"} · {s.intensity}
                        </span>
                      </div>
                      {s.notes && <p className="mt-1 text-xs text-smoke-3">{s.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5">
              <span className="eyebrow">Assigned players ({detail.assignedPlayers.length})</span>
              {detail.assignedPlayers.length === 0 ? (
                <p className="mt-2 text-xs text-smoke-3">No players assigned yet.</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {detail.assignedPlayers.map((p) => (
                    <span key={p.id} className="rounded bg-white/5 px-2 py-1 text-xs text-paper">{p.name}</span>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="btn-ghost !px-4 !py-2.5 text-sm">Close</button>
        </div>
      </div>
    </div>
  );
}
