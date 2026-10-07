"use client";

import { useEffect, useState } from "react";
import {
  AssessmentChangeBadge,
  AssessmentDetailModal,
  formatAssessmentDate,
  type AssessmentItem,
} from "@/components/coach/assessments/AssessmentUi";
import { assessmentLabel } from "@/lib/assessmentTemplates";
import { formatScore } from "@/lib/formatScore";
import { t, type Locale } from "@/lib/i18n";

export default function PlayerAssessmentsView({ locale }: { locale: Locale }) {
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [viewing, setViewing] = useState<AssessmentItem | null>(null);

  useEffect(() => {
    fetch("/api/player/assessments")
      .then((response) => response.json())
      .then((data) => {
        setAssessments(Array.isArray(data.assessments) ? data.assessments : []);
        setError(false);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6">
        <div className="eyebrow">{t(locale, "player.assessments.eyebrow")}</div>
        <h1 className="font-display text-3xl font-extrabold tracking-wide text-white">
          {t(locale, "player.assessments.title")}
        </h1>
        <p className="mt-1 text-sm text-smoke-3">{t(locale, "player.assessments.subtitle")}</p>
      </div>

      {loading ? <p className="text-sm text-smoke-3">{t(locale, "player.assessments.loading")}</p> : null}
      {!loading && error ? <p className="text-sm text-smoke-3">{t(locale, "player.assessments.loadError")}</p> : null}
      {!loading && !error && assessments.length === 0 ? (
        <p className="text-sm text-smoke-3">{t(locale, "player.assessments.empty")}</p>
      ) : null}
      {!loading && !error && assessments.length > 0 ? (
        <div className="flex flex-col gap-2">
          {assessments.map((assessment) => (
            <button
              key={assessment.id}
              type="button"
              className="flex items-center justify-between gap-4 rounded-md border border-white/5 bg-ink-3 p-4 text-left transition-colors hover:border-line-2"
              onClick={() => setViewing(assessment)}
            >
              <div className="min-w-0">
                <div className="font-display text-base font-bold text-white">{assessmentLabel(assessment, locale)}</div>
                <p className="mt-1 text-xs text-smoke-3">
                  {formatAssessmentDate(assessment.date, locale)}
                  {assessment.notes?.trim() ? ` · ${assessment.notes.trim()}` : ""}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-display text-2xl font-black tabular-nums text-white">{formatScore(assessment.score)}</div>
                <div className="mt-1">
                  <AssessmentChangeBadge value={assessment.change} />
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : null}

      <AssessmentDetailModal assessment={viewing} locale={locale} onClose={() => setViewing(null)} />
    </div>
  );
}
