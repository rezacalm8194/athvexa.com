"use client";

import { useEffect, useState } from "react";
import { PlusIcon, TrashIcon } from "@/components/icons";
import { useToast } from "@/components/ui/Toast";

export type ProgramSessionDraft = {
  key: string;
  title: string;
  day: string;
  durationMinutes: string;
  intensity: "LOW" | "MEDIUM" | "HIGH";
  notes: string;
};

export type ProgramFormValues = {
  name: string;
  description: string;
  goal: string;
  durationWeeks: string;
  sessionsPerWeek: string;
  startDate: string;
  endDate: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  playerIds: string[];
  sessions: ProgramSessionDraft[];
};

type PlayerOption = { id: string; name: string; email: string };

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const INTENSITIES: ProgramSessionDraft["intensity"][] = ["LOW", "MEDIUM", "HIGH"];

export function emptyProgramForm(): ProgramFormValues {
  return {
    name: "",
    description: "",
    goal: "",
    durationWeeks: "4",
    sessionsPerWeek: "3",
    startDate: "",
    endDate: "",
    status: "DRAFT",
    playerIds: [],
    sessions: [],
  };
}

export default function ProgramFormModal({
  mode,
  initial,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  initial: { id?: string; values: ProgramFormValues };
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [values, setValues] = useState<ProgramFormValues>(initial.values);
  const [players, setPlayers] = useState<PlayerOption[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/coach/players")
      .then((r) => r.json())
      .then((data) => setPlayers((data.players ?? []).filter((p: { role: string }) => p.role === "PLAYER")))
      .catch(() => setPlayers([]));
  }, []);

  function set<K extends keyof ProgramFormValues>(key: K, value: ProgramFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function addSession() {
    set("sessions", [
      ...values.sessions,
      { key: `${Date.now()}`, title: "", day: "Monday", durationMinutes: "", intensity: "MEDIUM", notes: "" },
    ]);
  }

  function updateSession(key: string, patch: Partial<ProgramSessionDraft>) {
    set(
      "sessions",
      values.sessions.map((s) => (s.key === key ? { ...s, ...patch } : s))
    );
  }

  function removeSession(key: string) {
    set("sessions", values.sessions.filter((s) => s.key !== key));
  }

  function togglePlayer(id: string) {
    set(
      "playerIds",
      values.playerIds.includes(id) ? values.playerIds.filter((p) => p !== id) : [...values.playerIds, id]
    );
  }

  async function save() {
    if (!values.name.trim()) {
      setError("Program name is required.");
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      name: values.name.trim(),
      description: values.description.trim() || null,
      goal: values.goal.trim() || null,
      durationWeeks: Number(values.durationWeeks) || 4,
      sessionsPerWeek: Number(values.sessionsPerWeek) || 3,
      startDate: values.startDate || null,
      endDate: values.endDate || null,
      status: values.status,
      playerIds: values.playerIds,
      sessions: values.sessions
        .filter((s) => s.title.trim())
        .map((s) => ({
          title: s.title.trim(),
          day: s.day,
          durationMinutes: s.durationMinutes ? Number(s.durationMinutes) : null,
          intensity: s.intensity,
          notes: s.notes.trim() || null,
        })),
    };

    const url = mode === "create" ? "/api/coach/programs" : `/api/coach/programs/${initial.id}`;
    const method = mode === "create" ? "POST" : "PATCH";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (res.ok) {
      showToast(mode === "create" ? "Program created" : "Program updated", "success");
      onSaved();
    } else {
      setError(data.error ?? "Could not save the program.");
      showToast("Could not save the program", "error");
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/70 p-4 py-8" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-lg border border-white/10 bg-ink-3 p-5 shadow-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-xl font-bold text-white">
          {mode === "create" ? "Create program" : "Edit program"}
        </h2>

        <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <label className="col-span-2 text-xs font-medium text-smoke-3">
            Program name
            <input value={values.name} onChange={(e) => set("name", e.target.value)} className="input-field mt-1" />
          </label>
          <label className="col-span-2 text-xs font-medium text-smoke-3">
            Description
            <textarea
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              className="input-field mt-1 resize-none"
            />
          </label>
          <label className="text-xs font-medium text-smoke-3">
            Goal
            <input value={values.goal} onChange={(e) => set("goal", e.target.value)} className="input-field mt-1" placeholder="e.g. Pre-season fitness" />
          </label>
          <label className="text-xs font-medium text-smoke-3">
            Status
            <select value={values.status} onChange={(e) => set("status", e.target.value as ProgramFormValues["status"])} className="input-field mt-1">
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </label>
          <label className="text-xs font-medium text-smoke-3">
            Duration (weeks)
            <input type="number" min={1} max={52} value={values.durationWeeks} onChange={(e) => set("durationWeeks", e.target.value)} className="input-field mt-1" />
          </label>
          <label className="text-xs font-medium text-smoke-3">
            Sessions per week
            <input type="number" min={1} max={14} value={values.sessionsPerWeek} onChange={(e) => set("sessionsPerWeek", e.target.value)} className="input-field mt-1" />
          </label>
          <label className="text-xs font-medium text-smoke-3">
            Start date
            <input type="date" value={values.startDate} onChange={(e) => set("startDate", e.target.value)} className="input-field mt-1" />
          </label>
          <label className="text-xs font-medium text-smoke-3">
            End date
            <input type="date" value={values.endDate} onChange={(e) => set("endDate", e.target.value)} className="input-field mt-1" />
          </label>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="eyebrow">Sessions</span>
            <button onClick={addSession} className="btn-ghost !px-2.5 !py-1.5 text-[11px]">
              <PlusIcon className="mr-1 h-3.5 w-3.5" />
              Add session
            </button>
          </div>
          {values.sessions.length === 0 && (
            <p className="rounded-md border border-dashed border-line-1 px-3 py-3 text-center text-xs text-smoke-3">
              No sessions yet. Add simple session notes — no exercise library needed.
            </p>
          )}
          <div className="flex flex-col gap-2">
            {values.sessions.map((s) => (
              <div key={s.key} className="rounded-md border border-white/5 bg-ink-2 p-3">
                <div className="flex flex-wrap gap-2">
                  <input
                    value={s.title}
                    onChange={(e) => updateSession(s.key, { title: e.target.value })}
                    placeholder="Session title"
                    className="input-field !py-2 flex-1 text-sm"
                  />
                  <select value={s.day} onChange={(e) => updateSession(s.key, { day: e.target.value })} className="input-field !py-2 !w-32 text-sm">
                    {DAYS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    value={s.durationMinutes}
                    onChange={(e) => updateSession(s.key, { durationMinutes: e.target.value })}
                    placeholder="Mins"
                    className="input-field !py-2 !w-20 text-sm"
                  />
                  <select
                    value={s.intensity}
                    onChange={(e) => updateSession(s.key, { intensity: e.target.value as ProgramSessionDraft["intensity"] })}
                    className="input-field !py-2 !w-28 text-sm"
                  >
                    {INTENSITIES.map((i) => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                  <button onClick={() => removeSession(s.key)} className="btn-ghost !px-2 !py-2 text-red-glow">
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
                <textarea
                  value={s.notes}
                  onChange={(e) => updateSession(s.key, { notes: e.target.value })}
                  placeholder="Exercises or session notes"
                  rows={2}
                  className="input-field !py-2 mt-2 resize-none text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <span className="eyebrow">Assign players</span>
          {players === null && <div className="mt-2 h-10 animate-pulse rounded-md bg-white/5" />}
          {players && players.length === 0 && (
            <p className="mt-2 text-xs text-smoke-3">No players on your roster yet.</p>
          )}
          {players && players.length > 0 && (
            <div className="mt-2 flex max-h-40 flex-col gap-1 overflow-y-auto rounded-md border border-line-1 p-2">
              {players.map((p) => (
                <label key={p.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-paper hover:bg-white/5">
                  <input type="checkbox" checked={values.playerIds.includes(p.id)} onChange={() => togglePlayer(p.id)} className="accent-red" />
                  {p.name}
                  <span className="text-xs text-smoke-3">{p.email}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-red-glow">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost !px-4 !py-2.5 text-sm" disabled={saving}>
            Cancel
          </button>
          <button onClick={save} className="btn-primary !px-4 !py-2.5 text-sm" disabled={saving}>
            {saving ? "Saving…" : mode === "create" ? "Create program" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
