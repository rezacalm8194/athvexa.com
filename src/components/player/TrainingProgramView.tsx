"use client";

import { useEffect, useState } from "react";
import { ClipboardListIcon } from "@/components/icons";

type TrainingSession = {
  id: string;
  title: string;
  day: string;
  durationMinutes: number | null;
  intensity: string;
  notes: string | null;
};

type TrainingProgram = {
  id: string;
  name: string;
  goal: string | null;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  sessions: TrainingSession[];
};

type TrainingResponse = {
  program: TrainingProgram | null;
};

function displayDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function displayDuration(value: number | null) {
  return value == null ? "Not set" : `${value} min`;
}

export default function TrainingProgramView() {
  const [data, setData] = useState<TrainingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setError(null);
    fetch("/api/player/training", { cache: "no-store" })
      .then((res) => res.json().then((payload) => ({ ok: res.ok, payload })))
      .then(({ ok, payload }) => {
        if (!ok) throw new Error(payload.error || "Could not load training program");
        setData(payload);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load training program"));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="mb-6">
        <div className="eyebrow">Training</div>
        <h1 className="font-display text-3xl font-extrabold tracking-wide text-white">Training program</h1>
        <p className="mt-1 text-sm text-smoke-3">Your current assigned program and this week&apos;s sessions.</p>
      </div>

      {!data && !error ? (
        <div className="space-y-3">
          <div className="h-28 animate-pulse rounded-lg bg-white/5" />
          <div className="h-20 animate-pulse rounded-lg bg-white/5" />
          <div className="h-20 animate-pulse rounded-lg bg-white/5" />
        </div>
      ) : null}

      {error ? (
        <div className="card px-5 py-8 text-center">
          <p className="text-sm text-red-glow">{error}</p>
          <button className="btn-ghost mt-4 !px-4 !py-2 text-xs" onClick={load}>
            Try again
          </button>
        </div>
      ) : null}

      {data?.program === null ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-smoke-4">
            <ClipboardListIcon className="h-6 w-6" />
          </div>
          <p className="font-display text-base font-bold text-white">No training program has been assigned yet.</p>
        </div>
      ) : null}

      {data?.program ? (
        <div className="space-y-5">
          <div className="card p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-display text-2xl font-black text-white">{data.program.name}</h2>
                <p className="mt-1 text-sm text-smoke-3">{data.program.goal || "No goal set."}</p>
              </div>
              <span className="w-fit rounded-full bg-[#4CAF50]/15 px-2.5 py-1 text-xs font-bold text-[#80D987]">Active</span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-line-1 bg-white/[0.03] p-3">
                <div className="eyebrow">Start date</div>
                <div className="mt-1 text-sm font-semibold text-white">{displayDate(data.program.startDate)}</div>
              </div>
              <div className="rounded-md border border-line-1 bg-white/[0.03] p-3">
                <div className="eyebrow">End date</div>
                <div className="mt-1 text-sm font-semibold text-white">{displayDate(data.program.endDate)}</div>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="mb-4">
              <h2 className="font-display text-lg font-bold text-white">This week&apos;s sessions</h2>
              <p className="mt-1 text-xs text-smoke-4">{data.program.sessions.length} scheduled</p>
            </div>
            {data.program.sessions.length === 0 ? (
              <p className="rounded-md border border-dashed border-line-1 px-4 py-6 text-center text-sm text-smoke-3">
                No sessions have been added to this program.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {data.program.sessions.map((session) => (
                  <div key={session.id} className="rounded-md border border-white/5 bg-ink-3 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-semibold text-white">{session.title}</h3>
                        <p className="mt-1 text-xs text-smoke-4">{session.notes || "No notes added."}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-xs">
                        <span className="rounded bg-white/10 px-2 py-1 text-smoke-2">{session.day}</span>
                        <span className="rounded bg-white/10 px-2 py-1 text-smoke-2">{displayDuration(session.durationMinutes)}</span>
                        <span className="rounded bg-red/15 px-2 py-1 font-bold text-red-glow">{session.intensity}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
