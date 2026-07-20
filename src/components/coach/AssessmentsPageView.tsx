"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import KpiCard from "@/components/coach/KpiCard";
import ConfirmModal from "@/components/coach/shared/ConfirmModal";
import EmptyState from "@/components/coach/shared/EmptyState";
import ErrorState from "@/components/coach/shared/ErrorState";
import { SkeletonRows } from "@/components/coach/shared/LoadingSkeleton";
import SearchInput from "@/components/coach/shared/SearchInput";
import { useToast } from "@/components/ui/Toast";
import {
  AlertIcon,
  BarChartIcon,
  CalendarIcon,
  ClipboardCheckIcon,
  PlusIcon,
  TrashIcon,
  UsersIcon,
} from "@/components/icons";
import { ASSESSMENT_TYPES, AssessmentType } from "@/lib/assessmentTypes";

type PlayerOption = {
  id: string;
  name: string;
  email: string;
};

type AssessmentItem = {
  id: string;
  playerId: string;
  player: PlayerOption;
  type: AssessmentType;
  date: string;
  score: number;
  previousScore: number | null;
  change: number | null;
  notes: string | null;
};

type AssessmentResponse = {
  players: PlayerOption[];
  assessments: AssessmentItem[];
  kpis: {
    totalAssessments: number;
    assessmentsThisMonth: number;
    playersAssessed: number;
    playersNotAssessed: number;
  };
};

type FormState = {
  playerId: string;
  type: AssessmentType;
  date: string;
  score: string;
  notes: string;
};

const todayKey = () => new Date().toISOString().slice(0, 10);
const monthKey = () => new Date().toISOString().slice(0, 7);

const emptyForm = (playerId = ""): FormState => ({
  playerId,
  type: "Speed",
  date: todayKey(),
  score: "70",
  notes: "",
});

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function ChangeBadge({ value }: { value: number | null }) {
  if (value == null) return <span className="text-smoke-4">-</span>;
  const positive = value > 0;
  const neutral = value === 0;
  return (
    <span
      className={`inline-flex min-w-14 justify-center rounded-full px-2 py-1 text-xs font-bold ${
        neutral ? "bg-white/5 text-smoke-3" : positive ? "bg-[#4CAF50]/15 text-[#80D987]" : "bg-red/15 text-red-glow"
      }`}
    >
      {positive ? "+" : ""}
      {value}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="min-w-24">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-bold text-white">{score}</span>
        <span className="text-smoke-4">/100</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-red" style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function AssessmentModal({
  open,
  mode,
  players,
  initial,
  busy,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  players: PlayerOption[];
  initial: FormState;
  busy: boolean;
  onClose: () => void;
  onSubmit: (form: FormState) => void;
}) {
  const [form, setForm] = useState<FormState>(initial);

  useEffect(() => {
    if (open) setForm(initial);
  }, [initial, open]);

  if (!open) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <form className="w-full max-w-xl rounded-lg border border-white/10 bg-ink-3 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-black text-white">{mode === "create" ? "New assessment" : "Edit assessment"}</h2>
            <p className="mt-1 text-sm text-smoke-3">Track one performance checkpoint for a team player.</p>
          </div>
          <button type="button" className="btn-ghost !px-3 !py-2 text-xs" onClick={onClose} disabled={busy}>
            Close
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-semibold text-smoke-2">
            Player
            <select
              className="w-full rounded-md border border-line-1 bg-ink-2 px-3 py-3 text-sm text-white outline-none focus:border-red"
              value={form.playerId}
              onChange={(event) => setForm((cur) => ({ ...cur, playerId: event.target.value }))}
              required
            >
              <option value="" disabled>
                Select player
              </option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name || player.email}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-semibold text-smoke-2">
            Type
            <select
              className="w-full rounded-md border border-line-1 bg-ink-2 px-3 py-3 text-sm text-white outline-none focus:border-red"
              value={form.type}
              onChange={(event) => setForm((cur) => ({ ...cur, type: event.target.value as AssessmentType }))}
            >
              {ASSESSMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-semibold text-smoke-2">
            Date
            <input
              className="w-full rounded-md border border-line-1 bg-ink-2 px-3 py-3 text-sm text-white outline-none focus:border-red"
              type="date"
              value={form.date}
              onChange={(event) => setForm((cur) => ({ ...cur, date: event.target.value }))}
              required
            />
          </label>

          <label className="space-y-2 text-sm font-semibold text-smoke-2">
            Score
            <input
              className="w-full rounded-md border border-line-1 bg-ink-2 px-3 py-3 text-sm text-white outline-none focus:border-red"
              type="number"
              min="0"
              max="100"
              value={form.score}
              onChange={(event) => setForm((cur) => ({ ...cur, score: event.target.value }))}
              required
            />
          </label>
        </div>

        <label className="mt-4 block space-y-2 text-sm font-semibold text-smoke-2">
          Notes
          <textarea
            className="min-h-28 w-full rounded-md border border-line-1 bg-ink-2 px-3 py-3 text-sm text-white outline-none focus:border-red"
            value={form.notes}
            onChange={(event) => setForm((cur) => ({ ...cur, notes: event.target.value }))}
            placeholder="Optional coaching notes"
          />
        </label>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-ghost justify-center !px-4 !py-3 text-sm" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn-primary justify-center !px-5 !py-3 text-sm" disabled={busy || players.length === 0}>
            {busy ? "Saving..." : mode === "create" ? "Create assessment" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

function AssessmentDetailModal({ assessment, onClose }: { assessment: AssessmentItem | null; onClose: () => void }) {
  if (!assessment) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg border border-white/10 bg-ink-3 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-black text-white">{assessment.player.name || assessment.player.email}</h2>
            <p className="mt-1 text-sm text-smoke-3">
              {assessment.type} assessment on {formatDate(assessment.date)}
            </p>
          </div>
          <button type="button" className="btn-ghost !px-3 !py-2 text-xs" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-line-1 bg-white/[0.03] p-3">
            <div className="text-xs text-smoke-4">Score</div>
            <div className="mt-1 font-display text-2xl font-black text-white">{assessment.score}</div>
          </div>
          <div className="rounded-md border border-line-1 bg-white/[0.03] p-3">
            <div className="text-xs text-smoke-4">Previous</div>
            <div className="mt-1 font-display text-2xl font-black text-white">{assessment.previousScore ?? "-"}</div>
          </div>
          <div className="rounded-md border border-line-1 bg-white/[0.03] p-3">
            <div className="text-xs text-smoke-4">Change</div>
            <div className="mt-2">
              <ChangeBadge value={assessment.change} />
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-md border border-line-1 bg-ink-2 p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-smoke-4">Notes</div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-smoke-2">{assessment.notes?.trim() || "No notes added."}</p>
        </div>
      </div>
    </div>
  );
}

export default function AssessmentsPageView() {
  const { showToast } = useToast();
  const [data, setData] = useState<AssessmentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<AssessmentType | "all">("all");
  const [month, setMonth] = useState(monthKey());
  const [modal, setModal] = useState<{ mode: "create" | "edit"; item?: AssessmentItem } | null>(null);
  const [viewing, setViewing] = useState<AssessmentItem | null>(null);
  const [deleting, setDeleting] = useState<AssessmentItem | null>(null);
  const [busy, setBusy] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (type !== "all") params.set("type", type);
    if (month) params.set("month", month);
    return params.toString();
  }, [month, search, type]);

  const loadAssessments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/coach/assessments?${queryString}`, { cache: "no-store" });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Could not load assessments");
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load assessments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAssessments();
  }, [queryString]);

  const players = data?.players ?? [];
  const assessments = data?.assessments ?? [];
  const kpis = data?.kpis ?? {
    totalAssessments: 0,
    assessmentsThisMonth: 0,
    playersAssessed: 0,
    playersNotAssessed: 0,
  };

  const openCreate = () => setModal({ mode: "create" });
  const openEdit = (item: AssessmentItem) => setModal({ mode: "edit", item });

  const initialForm = modal?.item
    ? {
        playerId: modal.item.playerId,
        type: modal.item.type,
        date: modal.item.date,
        score: String(modal.item.score),
        notes: modal.item.notes ?? "",
      }
    : emptyForm(players[0]?.id ?? "");

  const saveAssessment = async (form: FormState) => {
    const score = Number(form.score);
    if (!form.playerId) {
      showToast("Select a player first.", "error");
      return;
    }
    if (!Number.isInteger(score) || score < 0 || score > 100) {
      showToast("Score must be from 0 to 100.", "error");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(modal?.mode === "edit" && modal.item ? `/api/coach/assessments/${modal.item.id}` : "/api/coach/assessments", {
        method: modal?.mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: form.playerId,
          type: form.type,
          date: form.date,
          score,
          notes: form.notes,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Could not save assessment");
      showToast(modal?.mode === "edit" ? "Assessment updated." : "Assessment created.");
      setModal(null);
      await loadAssessments();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not save assessment", "error");
    } finally {
      setBusy(false);
    }
  };

  const deleteAssessment = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/coach/assessments/${deleting.id}`, { method: "DELETE" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Could not delete assessment");
      showToast("Assessment deleted.");
      setDeleting(null);
      await loadAssessments();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not delete assessment", "error");
    } finally {
      setBusy(false);
    }
  };

  const hasFilters = search.trim() !== "" || type !== "all" || month !== "";

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-red">Coach tools</p>
          <h1 className="mt-2 font-display text-3xl font-black text-white sm:text-4xl">Assessments</h1>
          <p className="mt-2 text-sm text-smoke-3">Track player performance and development.</p>
        </div>
        <button className="btn-primary justify-center gap-2 !px-4 !py-3 text-sm" onClick={openCreate} disabled={loading || players.length === 0}>
          <PlusIcon className="h-4 w-4" />
          New assessment
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total assessments" value={kpis.totalAssessments} icon={ClipboardCheckIcon} loading={loading} />
        <KpiCard label="Assessments this month" value={kpis.assessmentsThisMonth} icon={CalendarIcon} loading={loading} />
        <KpiCard label="Players assessed" value={kpis.playersAssessed} icon={UsersIcon} loading={loading} />
        <KpiCard label="Players not assessed" value={kpis.playersNotAssessed} icon={AlertIcon} tone="warn" loading={loading} />
      </div>

      <div className="mt-5 rounded-lg border border-line-1 bg-ink-3 p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_180px]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search player" />
          <select
            className="rounded-md border border-line-1 bg-ink-2 px-3 py-3 text-sm text-smoke-2 outline-none focus:border-red"
            value={type}
            onChange={(event) => setType(event.target.value as AssessmentType | "all")}
            aria-label="Assessment type"
          >
            <option value="all">All types</option>
            {ASSESSMENT_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <input
            className="rounded-md border border-line-1 bg-ink-2 px-3 py-3 text-sm text-smoke-2 outline-none focus:border-red"
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            aria-label="Month"
          />
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-line-1 bg-ink-3">
        <div className="flex items-center justify-between border-b border-line-1 px-4 py-4">
          <div>
            <h2 className="font-display text-lg font-black text-white">Assessment list</h2>
            <p className="mt-1 text-xs text-smoke-4">{loading ? "Loading..." : `${assessments.length} shown`}</p>
          </div>
          {hasFilters ? (
            <button
              className="btn-ghost !px-3 !py-2 text-xs"
              onClick={() => {
                setSearch("");
                setType("all");
                setMonth("");
              }}
            >
              Clear filters
            </button>
          ) : null}
        </div>

        <div className="p-4">
          {loading ? <SkeletonRows count={6} /> : null}
          {!loading && error ? <ErrorState message={error} onRetry={loadAssessments} /> : null}
          {!loading && !error && assessments.length === 0 ? (
            <EmptyState
              icon={BarChartIcon}
              title={hasFilters ? "No matching assessments" : "No assessments yet"}
              description={players.length === 0 ? "Add players to your team before creating assessments." : "Create an assessment to start tracking player development."}
              action={
                players.length > 0 ? (
                  <button className="btn-primary mt-2 justify-center gap-2 !px-4 !py-3 text-sm" onClick={openCreate}>
                    <PlusIcon className="h-4 w-4" />
                    New assessment
                  </button>
                ) : null
              }
            />
          ) : null}
          {!loading && !error && assessments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-smoke-4">
                  <tr className="border-b border-line-1">
                    <th className="px-3 py-3 font-bold">Player</th>
                    <th className="px-3 py-3 font-bold">Type</th>
                    <th className="px-3 py-3 font-bold">Score</th>
                    <th className="px-3 py-3 font-bold">Previous score</th>
                    <th className="px-3 py-3 font-bold">Change</th>
                    <th className="px-3 py-3 font-bold">Date</th>
                    <th className="px-3 py-3 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assessments.map((assessment) => (
                    <tr key={assessment.id} className="border-b border-line-1 last:border-b-0">
                      <td className="px-3 py-4">
                        <div className="font-bold text-white">{assessment.player.name || "Unnamed player"}</div>
                        <div className="text-xs text-smoke-4">{assessment.player.email}</div>
                      </td>
                      <td className="px-3 py-4 text-smoke-2">{assessment.type}</td>
                      <td className="px-3 py-4">
                        <ScoreBar score={assessment.score} />
                      </td>
                      <td className="px-3 py-4 font-semibold text-smoke-2">{assessment.previousScore ?? "-"}</td>
                      <td className="px-3 py-4">
                        <ChangeBadge value={assessment.change} />
                      </td>
                      <td className="px-3 py-4 text-smoke-2">{formatDate(assessment.date)}</td>
                      <td className="px-3 py-4">
                        <div className="flex justify-end gap-2">
                          <button className="btn-ghost !px-3 !py-2 text-xs" onClick={() => setViewing(assessment)}>
                            View
                          </button>
                          <button className="btn-ghost !px-3 !py-2 text-xs" onClick={() => openEdit(assessment)}>
                            Edit
                          </button>
                          <button className="btn-ghost !px-3 !py-2 text-xs text-red-glow" onClick={() => setDeleting(assessment)}>
                            <TrashIcon className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>

      <AssessmentModal
        open={modal != null}
        mode={modal?.mode ?? "create"}
        players={players}
        initial={initialForm}
        busy={busy}
        onClose={() => setModal(null)}
        onSubmit={saveAssessment}
      />
      <AssessmentDetailModal assessment={viewing} onClose={() => setViewing(null)} />
      <ConfirmModal
        open={deleting != null}
        title="Delete assessment?"
        description="This assessment will be permanently removed from the player record."
        confirmLabel="Delete"
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={deleteAssessment}
      />
    </section>
  );
}
