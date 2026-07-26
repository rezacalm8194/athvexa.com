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
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";
  completedAt: string | null;
  completionNotes: string | null;
};

type TrainingProgram = {
  id: string;
  name: string;
  goal: string | null;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  progress: number;
  completedSessions: number;
  remainingSessions: number;
  totalSessions: number;
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

function statusLabel(value: TrainingSession["status"]) {
  if (value === "NOT_STARTED") return "Not started";
  if (value === "IN_PROGRESS") return "In progress";
  if (value === "COMPLETED") return "Completed";
  return "Skipped";
}

function statusStyle(value: TrainingSession["status"]) {
  if (value === "COMPLETED") return "bg-[#4CAF50]/15 text-[#80D987]";
  if (value === "IN_PROGRESS") return "bg-[#FFC107]/15 text-[#FFC107]";
  if (value === "SKIPPED") return "bg-white/10 text-smoke-3";
  return "bg-white/10 text-smoke-4";
}

function toDatetimeLocal(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function TrainingProgramView() {
  const [data, setData] = useState<TrainingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [completing, setCompleting] = useState<TrainingSession | null>(null);
  const [completionTime, setCompletionTime] = useState(toDatetimeLocal());
  const [completionNotes, setCompletionNotes] = useState("");

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

  async function updateSession(session: TrainingSession, action: "start" | "complete" | "skip") {
    setBusyId(session.id);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/player/training/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          completedAt: action === "complete" ? new Date(completionTime).toISOString() : undefined,
          notes: action === "complete" ? completionNotes : undefined,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Could not update this session.");
      setSuccess(payload.message || "Session updated.");
      setCompleting(null);
      setCompletionNotes("");
      setCompletionTime(toDatetimeLocal());
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update this session.");
    } finally {
      setBusyId(null);
    }
  }

  function openComplete(session: TrainingSession) {
    setCompleting(session);
    setCompletionTime(toDatetimeLocal());
    setCompletionNotes(session.completionNotes ?? "");
  }

  function skipSession(session: TrainingSession) {
    if (window.confirm(`Mark "${session.title}" as skipped?`)) {
      void updateSession(session, "skip");
    }
  }

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
      {success ? (
        <p className="mb-4 rounded-md border border-[#4CAF50]/30 bg-[#4CAF50]/10 px-4 py-3 text-sm text-[#80D987]">{success}</p>
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
            <div className="mt-5">
              <div className="mb-1 flex justify-between text-xs text-smoke-4">
                <span>Program progress</span>
                <span>{data.program.progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-red" style={{ width: `${data.program.progress}%` }} />
              </div>
              <div className="mt-2 text-xs text-smoke-3">
                {data.program.completedSessions} completed · {data.program.remainingSessions} remaining
              </div>
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
                        {session.completedAt ? (
                          <p className="mt-1 text-xs text-smoke-4">Completed at {new Date(session.completedAt).toLocaleString()}</p>
                        ) : null}
                        {session.completionNotes ? <p className="mt-1 text-xs text-smoke-3">{session.completionNotes}</p> : null}
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-xs">
                        <span className="rounded bg-white/10 px-2 py-1 text-smoke-2">{session.day}</span>
                        <span className="rounded bg-white/10 px-2 py-1 text-smoke-2">{displayDuration(session.durationMinutes)}</span>
                        <span className="rounded bg-red/15 px-2 py-1 font-bold text-red-glow">{session.intensity}</span>
                        <span className={`rounded px-2 py-1 font-bold ${statusStyle(session.status)}`}>{statusLabel(session.status)}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className="btn-ghost !px-3 !py-1.5 text-xs"
                        onClick={() => updateSession(session, "start")}
                        disabled={busyId === session.id || session.status === "COMPLETED"}
                      >
                        Start
                      </button>
                      <button
                        className="btn-primary !px-3 !py-1.5 text-xs"
                        onClick={() => openComplete(session)}
                        disabled={busyId === session.id || session.status === "COMPLETED"}
                      >
                        Complete
                      </button>
                      <button
                        className="btn-ghost !px-3 !py-1.5 text-xs"
                        onClick={() => skipSession(session)}
                        disabled={busyId === session.id || session.status === "COMPLETED"}
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {completing ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4" onClick={() => setCompleting(null)}>
          <div className="w-full max-w-md rounded-lg border border-white/10 bg-ink-3 p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <h2 className="font-display text-xl font-bold text-white">Complete session</h2>
            <p className="mt-1 text-sm text-smoke-3">{completing.title}</p>
            <label className="mt-4 block text-xs font-medium text-smoke-3">
              Completion time
              <input
                className="input-field mt-1"
                type="datetime-local"
                value={completionTime}
                onChange={(event) => setCompletionTime(event.target.value)}
              />
            </label>
            <label className="mt-4 block text-xs font-medium text-smoke-3">
              Notes
              <textarea
                className="input-field mt-1 min-h-24 resize-none"
                value={completionNotes}
                onChange={(event) => setCompletionNotes(event.target.value)}
                placeholder="Optional notes about how it went"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-ghost !px-4 !py-2 text-xs" onClick={() => setCompleting(null)} disabled={busyId === completing.id}>
                Cancel
              </button>
              <button className="btn-primary !px-4 !py-2 text-xs" onClick={() => updateSession(completing, "complete")} disabled={busyId === completing.id}>
                {busyId === completing.id ? "Saving..." : "Mark completed"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
