"use client";

import { FormEvent, useEffect, useState } from "react";
import { ASSESSMENT_TYPES, AssessmentType } from "@/lib/assessmentTypes";
import { formatScore } from "@/lib/formatScore";
import { t, type Locale } from "@/lib/i18n";

export type PlayerOption = {
  id: string;
  name: string;
  email: string;
};

export type AssessmentItem = {
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

export type AssessmentFormState = {
  playerId: string;
  type: AssessmentType;
  date: string;
  score: string;
  notes: string;
};

const todayKey = () => new Date().toISOString().slice(0, 10);

export const emptyAssessmentForm = (playerId = ""): AssessmentFormState => ({
  playerId,
  type: "Speed",
  date: todayKey(),
  score: "",
  notes: "",
});

export function formatAssessmentDate(value: string, locale: Locale = "en") {
  return new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export function AssessmentChangeBadge({ value }: { value: number | null }) {
  if (value == null) return <span className="text-smoke-4">—</span>;
  const rounded = Number(value.toFixed(2));
  const positive = rounded > 0;
  const neutral = rounded === 0;
  return (
    <span
      className={`tabular-nums text-xs font-semibold ${
        neutral ? "text-smoke-3" : positive ? "text-[#80D987]" : "text-red-glow"
      }`}
    >
      {positive ? "+" : ""}
      {formatScore(rounded)}
    </span>
  );
}

export function AssessmentModal({
  open,
  mode,
  players,
  initial,
  busy,
  lockPlayer = false,
  locale,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  players: PlayerOption[];
  initial: AssessmentFormState;
  busy: boolean;
  lockPlayer?: boolean;
  locale: Locale;
  onClose: () => void;
  onSubmit: (form: AssessmentFormState) => void;
}) {
  const [form, setForm] = useState<AssessmentFormState>(initial);

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
      <form className="w-full max-w-xl rounded-lg border border-white/10 bg-ink-3 p-5 shadow-2xl" onClick={(event) => event.stopPropagation()} onSubmit={submit}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-black text-white">
              {mode === "create" ? t(locale, "coach.assessmentUi.formCreateTitle") : t(locale, "coach.assessmentUi.formEditTitle")}
            </h2>
            <p className="mt-1 text-sm text-smoke-3">{t(locale, "coach.assessmentUi.formSubtitle")}</p>
          </div>
          <button type="button" className="btn-ghost !px-3 !py-2 text-xs" onClick={onClose} disabled={busy}>
            {t(locale, "coach.assessmentUi.close")}
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-semibold text-smoke-2">
            {t(locale, "coach.assessmentUi.player")}
            <select
              className="w-full rounded-md border border-line-1 bg-ink-2 px-3 py-3 text-sm text-white outline-none focus:border-red disabled:cursor-not-allowed disabled:opacity-70"
              value={form.playerId}
              onChange={(event) => setForm((current) => ({ ...current, playerId: event.target.value }))}
              disabled={lockPlayer}
              required
            >
              <option value="" disabled>
                {t(locale, "coach.assessmentUi.selectPlayer")}
              </option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name || player.email}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-semibold text-smoke-2">
            {t(locale, "coach.assessmentUi.type")}
            <select
              className="w-full rounded-md border border-line-1 bg-ink-2 px-3 py-3 text-sm text-white outline-none focus:border-red"
              value={form.type}
              onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as AssessmentType }))}
            >
              {ASSESSMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-semibold text-smoke-2">
            {t(locale, "coach.assessmentUi.date")}
            <input
              className="w-full rounded-md border border-line-1 bg-ink-2 px-3 py-3 text-sm text-white outline-none focus:border-red"
              type="date"
              value={form.date}
              onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
              required
            />
          </label>

          <label className="space-y-2 text-sm font-semibold text-smoke-2">
            {t(locale, "coach.assessmentUi.score")}
            <input
              className="w-full rounded-md border border-line-1 bg-ink-2 px-3 py-3 text-sm text-white outline-none focus:border-red"
              type="number"
              inputMode="decimal"
              step="any"
              placeholder={t(locale, "coach.assessmentUi.scorePlaceholder")}
              value={form.score}
              onChange={(event) => setForm((current) => ({ ...current, score: event.target.value }))}
              required
            />
          </label>
        </div>

        <label className="mt-4 block space-y-2 text-sm font-semibold text-smoke-2">
          {t(locale, "coach.assessmentUi.notes")}
          <textarea
            className="min-h-28 w-full rounded-md border border-line-1 bg-ink-2 px-3 py-3 text-sm text-white outline-none focus:border-red"
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            placeholder={t(locale, "coach.assessmentUi.notesPlaceholder")}
          />
        </label>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-ghost justify-center !px-4 !py-3 text-sm" onClick={onClose} disabled={busy}>
            {t(locale, "common.cancel")}
          </button>
          <button type="submit" className="btn-primary justify-center !px-5 !py-3 text-sm" disabled={busy || players.length === 0}>
            {busy
              ? t(locale, "common.saving")
              : mode === "create"
                ? t(locale, "coach.assessmentUi.create")
                : t(locale, "coach.assessmentUi.saveChanges")}
          </button>
        </div>
      </form>
    </div>
  );
}

export function AssessmentDetailModal({
  assessment,
  locale,
  onClose,
  onEdit,
  onDelete,
}: {
  assessment: AssessmentItem | null;
  locale: Locale;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  if (!assessment) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-ink-3 p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-black text-white">{assessment.type}</h2>
            <p className="mt-1 text-sm text-smoke-3">{formatAssessmentDate(assessment.date, locale)}</p>
          </div>
          <button type="button" className="btn-ghost !px-3 !py-2 text-xs" onClick={onClose}>
            {t(locale, "coach.assessmentUi.close")}
          </button>
        </div>

        <div className="mt-4 flex items-end justify-between gap-4 border-b border-white/5 pb-4">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-smoke-4">{t(locale, "coach.assessmentUi.score")}</div>
            <div className="mt-1 font-display text-3xl font-black text-white">{formatScore(assessment.score)}</div>
          </div>
          <div className="text-right text-sm">
            <div className="text-smoke-4">
              {t(locale, "coach.assessmentUi.previous", {
                score: assessment.previousScore == null ? "—" : formatScore(assessment.previousScore),
              })}
            </div>
            <div className="mt-1">
              <AssessmentChangeBadge value={assessment.change} />
            </div>
          </div>
        </div>

        {assessment.notes?.trim() ? (
          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-smoke-2">{assessment.notes.trim()}</p>
        ) : null}

        {onEdit || onDelete ? (
          <div className="mt-5 flex justify-end gap-2">
            {onDelete ? (
              <button type="button" className="btn-ghost !px-3 !py-2 text-xs text-red-glow" onClick={onDelete}>
                {t(locale, "coach.assessmentUi.delete")}
              </button>
            ) : null}
            {onEdit ? (
              <button type="button" className="btn-primary !px-4 !py-2 text-xs" onClick={onEdit}>
                {t(locale, "coach.assessmentUi.edit")}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
