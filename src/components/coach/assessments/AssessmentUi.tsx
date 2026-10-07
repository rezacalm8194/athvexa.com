"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ASSESSMENT_TYPES, AssessmentType } from "@/lib/assessmentTypes";
import {
  ASSESSMENT_TEMPLATES,
  assessmentLabel,
  computedElasticAccelerationIndex,
  getAssessmentTemplate,
  metricHint,
  metricLabel,
  resolveTemplateMetrics,
  type AssessmentTemplate,
} from "@/lib/assessmentTemplates";
import { formatScore } from "@/lib/formatScore";
import { t, type Locale } from "@/lib/i18n";

export type PlayerOption = {
  id: string;
  name: string;
  email: string;
};

export type AssessmentItem = {
  id: string;
  playerId: string | null;
  player: PlayerOption | null;
  playerName?: string | null;
  type: AssessmentType;
  templateId?: string | null;
  date: string;
  score: number;
  previousScore: number | null;
  change: number | null;
  metrics?: Record<string, number> | null;
  notes: string | null;
};

export type AssessmentFormState = {
  playerId: string;
  playerIds: string[];
  playerName: string;
  type: AssessmentType;
  templateId: string;
  date: string;
  score: string;
  metrics: Record<string, string>;
  notes: string;
};

const todayKey = () => new Date().toISOString().slice(0, 10);
const firstTemplateId = ASSESSMENT_TEMPLATES[0]?.id ?? "";

export const emptyAssessmentForm = (playerId = ""): AssessmentFormState => ({
  playerId,
  playerIds: playerId ? [playerId] : [],
  playerName: "",
  type: getAssessmentTemplate(firstTemplateId)?.type ?? "Speed",
  templateId: firstTemplateId,
  date: todayKey(),
  score: "",
  metrics: {},
  notes: "",
});

export function formFromAssessmentItem(item: AssessmentItem): AssessmentFormState {
  const metrics: Record<string, string> = {};
  if (item.metrics) {
    for (const [key, value] of Object.entries(item.metrics)) metrics[key] = String(value);
  }
  return {
    playerId: item.playerId ?? "",
    playerIds: item.playerId ? [item.playerId] : [],
    playerName: item.playerId ? "" : (item.playerName ?? item.player?.name ?? ""),
    type: item.type,
    templateId: item.templateId ?? "",
    date: item.date,
    score: String(item.score),
    metrics,
    notes: item.notes ?? "",
  };
}

export function assessmentRequestBody(form: AssessmentFormState) {
  const template = form.templateId ? getAssessmentTemplate(form.templateId) : undefined;
  if (form.templateId && !template) {
    return { error: "invalidTemplate" as const };
  }

  let score: number;
  let metrics: Record<string, number> | null = null;
  if (template) {
    const resolved = resolveTemplateMetrics(template, form.metrics);
    if (!resolved.ok) return { error: resolved.error };
    score = resolved.score;
    metrics = resolved.metrics;
  } else {
    score = Number(form.score);
    if (form.score.trim() === "" || !Number.isFinite(score)) {
      return { error: "invalidScore" as const };
    }
  }

  const playerIds = form.playerIds.filter(Boolean);
  return {
    body: {
      playerId: playerIds.length === 1 ? playerIds[0] : form.playerId || undefined,
      playerIds: playerIds.length > 1 ? playerIds : undefined,
      playerName: form.playerId || playerIds.length ? undefined : form.playerName.trim() || undefined,
      type: template?.type ?? form.type,
      templateId: template?.id ?? null,
      date: form.date,
      score,
      metrics,
      notes: form.notes.trim() || null,
    },
  };
}

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

function TemplateMetricsFields({
  template,
  values,
  locale,
  onChange,
}: {
  template: AssessmentTemplate;
  values: Record<string, string>;
  locale: Locale;
  onChange: (key: string, value: string) => void;
}) {
  const elastic = computedElasticAccelerationIndex(
    Number(values.peakVelocity),
    Number(values.timeToPeakVelocity)
  );

  return (
    <div className="sm:col-span-2">
      <p className="text-sm font-semibold text-smoke-2">{t(locale, "coach.assessmentUi.metrics")}</p>
      <div className="mt-2 divide-y divide-white/5 overflow-hidden rounded-md border border-line-1">
        {template.metrics.map((metric) => {
          const computed = metric.computed
            ? elastic == null
              ? ""
              : String(elastic)
            : values[metric.key] ?? "";
          return (
            <label key={metric.key} className="grid gap-1 bg-ink-2 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_140px] sm:items-center">
              <span>
                <span className="block text-sm font-semibold text-white">{metricLabel(locale, metric.key)}</span>
                <span className="block text-xs font-normal text-smoke-4">{metricHint(locale, metric.key)}</span>
              </span>
              <span className="flex items-center gap-2">
                <input
                  className="w-full rounded-md border border-line-1 bg-ink-3 px-3 py-2 text-sm text-white outline-none focus:border-red disabled:opacity-70"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  required={!metric.computed}
                  disabled={metric.computed}
                  readOnly={metric.computed}
                  value={computed}
                  onChange={(event) => onChange(metric.key, event.target.value)}
                />
                <span className="w-10 shrink-0 text-xs text-smoke-4">{metric.unit}</span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
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
  const [subjectMode, setSubjectMode] = useState<"roster" | "manual">(
    initial.playerName || players.length === 0 ? "manual" : "roster"
  );
  const [source, setSource] = useState<"template" | "custom">(initial.templateId ? "template" : "custom");
  const template = useMemo(() => getAssessmentTemplate(form.templateId), [form.templateId]);
  const allowMultiPlayer = mode === "create" && !lockPlayer && subjectMode === "roster";

  useEffect(() => {
    if (open) {
      setForm(initial);
      setSubjectMode(initial.playerName || players.length === 0 ? "manual" : "roster");
      setSource(initial.templateId ? "template" : "custom");
    }
  }, [initial, open, players.length]);

  if (!open) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(form);
  };

  const togglePlayer = (playerId: string) => {
    setForm((current) => {
      const selected = current.playerIds.includes(playerId)
        ? current.playerIds.filter((id) => id !== playerId)
        : [...current.playerIds, playerId];
      return { ...current, playerIds: selected, playerId: selected[0] ?? "", playerName: "" };
    });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <form className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-white/10 bg-ink-3 p-5 shadow-2xl" onClick={(event) => event.stopPropagation()} onSubmit={submit}>
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
          <div className="space-y-2 sm:col-span-2">
            <div className="grid grid-cols-2 gap-2 rounded-md bg-ink-2 p-1" role="group" aria-label={t(locale, "coach.assessmentUi.source")}>
              <button
                type="button"
                className={`rounded px-3 py-2 text-sm font-semibold ${source === "template" ? "bg-white/10 text-white" : "text-smoke-3"}`}
                onClick={() => {
                  setSource("template");
                  setForm((current) => ({
                    ...current,
                    templateId: current.templateId || firstTemplateId,
                    type: getAssessmentTemplate(current.templateId || firstTemplateId)?.type ?? current.type,
                    score: "",
                  }));
                }}
              >
                {t(locale, "coach.assessmentUi.sourceTemplate")}
              </button>
              <button
                type="button"
                className={`rounded px-3 py-2 text-sm font-semibold ${source === "custom" ? "bg-white/10 text-white" : "text-smoke-3"}`}
                onClick={() => {
                  setSource("custom");
                  setForm((current) => ({ ...current, templateId: "", metrics: {} }));
                }}
              >
                {t(locale, "coach.assessmentUi.sourceCustom")}
              </button>
            </div>
          </div>

          {source === "template" ? (
            <label className="space-y-2 text-sm font-semibold text-smoke-2 sm:col-span-2">
              {t(locale, "coach.assessmentUi.template")}
              <select
                className="w-full rounded-md border border-line-1 bg-ink-2 px-3 py-3 text-sm text-white outline-none focus:border-red"
                value={form.templateId}
                onChange={(event) => {
                  const next = getAssessmentTemplate(event.target.value);
                  setForm((current) => ({
                    ...current,
                    templateId: event.target.value,
                    type: next?.type ?? current.type,
                    metrics: {},
                    score: "",
                  }));
                }}
                required
              >
                {ASSESSMENT_TEMPLATES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {t(locale, `coach.assessmentTemplates.${item.id}.title`)}
                  </option>
                ))}
              </select>
              {template ? (
                <span className="block text-xs font-normal text-smoke-4">
                  {t(locale, `coach.assessmentTemplates.${template.id}.description`)}
                </span>
              ) : null}
            </label>
          ) : null}

          <div className="space-y-2 sm:col-span-2">
            {!lockPlayer ? (
              <div className="grid grid-cols-2 gap-2 rounded-md bg-ink-2 p-1" role="group" aria-label={t(locale, "coach.assessmentUi.playerSource")}>
                <button type="button" className={`rounded px-3 py-2 text-sm font-semibold ${subjectMode === "roster" ? "bg-white/10 text-white" : "text-smoke-3"}`} onClick={() => { setSubjectMode("roster"); setForm((current) => ({ ...current, playerName: "" })); }} disabled={players.length === 0}>
                  {t(locale, "coach.assessmentUi.rosterPlayer")}
                </button>
                <button type="button" className={`rounded px-3 py-2 text-sm font-semibold ${subjectMode === "manual" ? "bg-white/10 text-white" : "text-smoke-3"}`} onClick={() => { setSubjectMode("manual"); setForm((current) => ({ ...current, playerId: "", playerIds: [] })); }}>
                  {t(locale, "coach.assessmentUi.manualPlayer")}
                </button>
              </div>
            ) : null}

            {subjectMode === "roster" ? (
              allowMultiPlayer ? (
                <fieldset className="space-y-2 text-sm font-semibold text-smoke-2">
                  <legend>{t(locale, "coach.assessmentUi.selectPlayers")}</legend>
                  <p className="text-xs font-normal text-smoke-4">{t(locale, "coach.assessmentUi.selectPlayersHint")}</p>
                  <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-line-1 bg-ink-2 p-2">
                    <input
                      className="absolute h-px w-px overflow-hidden opacity-0"
                      tabIndex={-1}
                      required
                      value={form.playerIds[0] ?? ""}
                      onChange={() => {}}
                      aria-hidden="true"
                    />
                    {players.map((player) => {
                      const checked = form.playerIds.includes(player.id);
                      return (
                        <label key={player.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm font-normal text-smoke-2 hover:bg-white/5">
                          <input type="checkbox" checked={checked} onChange={() => togglePlayer(player.id)} />
                          <span className="text-white">{player.name || player.email}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ) : (
                <label className="block space-y-2 text-sm font-semibold text-smoke-2">
                  {t(locale, "coach.assessmentUi.player")}
                  <select
                    className="w-full rounded-md border border-line-1 bg-ink-2 px-3 py-3 text-sm text-white outline-none focus:border-red disabled:cursor-not-allowed disabled:opacity-70"
                    value={form.playerId}
                    onChange={(event) => setForm((current) => ({ ...current, playerId: event.target.value, playerIds: event.target.value ? [event.target.value] : [], playerName: "" }))}
                    disabled={lockPlayer}
                    required
                  >
                    <option value="" disabled>{t(locale, "coach.assessmentUi.selectPlayer")}</option>
                    {players.map((player) => <option key={player.id} value={player.id}>{player.name || player.email}</option>)}
                  </select>
                </label>
              )
            ) : (
              <label className="block space-y-2 text-sm font-semibold text-smoke-2">
                {t(locale, "coach.assessmentUi.manualPlayerName")}
              <input
                className="w-full rounded-md border border-line-1 bg-ink-2 px-3 py-3 text-sm text-white outline-none focus:border-red"
                value={form.playerName}
                onChange={(event) => setForm((current) => ({ ...current, playerName: event.target.value, playerId: "", playerIds: [] }))}
                placeholder={t(locale, "coach.assessmentUi.manualPlayerPlaceholder")}
                minLength={2}
                maxLength={120}
                required
              />
              <span className="block text-xs font-normal text-smoke-4">{t(locale, "coach.assessmentUi.manualPlayerHint")}</span>
              </label>
            )}
          </div>

          {source === "custom" ? (
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
          ) : null}

          <label className={`space-y-2 text-sm font-semibold text-smoke-2 ${source === "template" ? "sm:col-span-2" : ""}`}>
            {t(locale, "coach.assessmentUi.date")}
            <input
              className="w-full rounded-md border border-line-1 bg-ink-2 px-3 py-3 text-sm text-white outline-none focus:border-red"
              type="date"
              value={form.date}
              onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
              required
            />
          </label>

          {source === "custom" ? (
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
          ) : null}

          {source === "template" && template ? (
            <TemplateMetricsFields
              template={template}
              values={form.metrics}
              locale={locale}
              onChange={(key, value) => setForm((current) => ({ ...current, metrics: { ...current.metrics, [key]: value } }))}
            />
          ) : null}
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
          <button type="submit" className="btn-primary justify-center !px-5 !py-3 text-sm" disabled={busy}>
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

function MetricsTable({
  assessment,
  locale,
}: {
  assessment: AssessmentItem;
  locale: Locale;
}) {
  const template = getAssessmentTemplate(assessment.templateId);
  if (!template || !assessment.metrics) return null;
  return (
    <div className="mt-4 overflow-hidden rounded-md border border-white/5">
      <table className="w-full text-sm">
        <tbody>
          {template.metrics.map((metric) => {
            const value = assessment.metrics?.[metric.key];
            return (
              <tr key={metric.key} className="border-b border-white/5 last:border-b-0">
                <td className="px-3 py-2">
                  <div className="font-semibold text-white">{metricLabel(locale, metric.key)}</div>
                  <div className="text-xs text-smoke-4">{metricHint(locale, metric.key)}</div>
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold text-white">
                  {value == null ? "—" : formatScore(value)}
                  <span className="ml-1 text-xs font-normal text-smoke-4">{metric.unit}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
  const template = getAssessmentTemplate(assessment.templateId);
  const primaryMetric = template?.metrics.find((metric) => metric.key === template.primaryMetric);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-white/10 bg-ink-3 p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-black text-white">{assessmentLabel(assessment, locale)}</h2>
            <p className="mt-1 text-sm text-smoke-3">{formatAssessmentDate(assessment.date, locale)}</p>
          </div>
          <button type="button" className="btn-ghost !px-3 !py-2 text-xs" onClick={onClose}>
            {t(locale, "coach.assessmentUi.close")}
          </button>
        </div>

        <div className="mt-4 flex items-end justify-between gap-4 border-b border-white/5 pb-4">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-smoke-4">
              {primaryMetric ? metricLabel(locale, primaryMetric.key) : t(locale, "coach.assessmentUi.score")}
            </div>
            <div className="mt-1 font-display text-3xl font-black text-white">
              {formatScore(assessment.score)}
              {primaryMetric ? <span className="ml-2 text-base font-semibold text-smoke-4">{primaryMetric.unit}</span> : null}
            </div>
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

        <MetricsTable assessment={assessment} locale={locale} />

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
