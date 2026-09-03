"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import KpiCard from "@/components/coach/KpiCard";
import EmptyState from "@/components/coach/shared/EmptyState";
import ErrorState from "@/components/coach/shared/ErrorState";
import { SkeletonRows } from "@/components/coach/shared/LoadingSkeleton";
import { AlertIcon, BarChartIcon, CalendarIcon, ClipboardCheckIcon, UsersIcon } from "@/components/icons";
import { formatScore } from "@/lib/formatScore";
import { t, type Locale } from "@/lib/i18n";

type RangeValue = "week" | "month" | "custom";
type OverallStatus = "Good" | "Watch" | "Attention" | "No data";

type PlayerOption = {
  id: string;
  name: string;
  email: string;
};

type AttentionPlayer = {
  id: string;
  name: string;
  reason: string;
  readiness: number | null;
  sleep: number | null;
  fatigue: number | null;
  soreness: number | null;
  profileHref: string;
};

type PlayerProgress = {
  id: string;
  name: string;
  email: string;
  latestReadiness: number | null;
  sleep: number | null;
  fatigue: number | null;
  soreness: number | null;
  averageReadiness: number | null;
  averageSleep: number | null;
  latestAssessment: { id: string; type: string; score: number; date: string } | null;
  previousAssessment: { id: string; type: string; score: number; date: string } | null;
  assessmentChange: number | null;
  activeProgram: {
    id: string;
    name: string;
    startDate: string | null;
    endDate: string | null;
    assignedAt: string;
    completedSessions: number;
    remainingSessions: number;
    progress: number;
  } | null;
  hasActiveAssignment: boolean;
  programStatus: string;
  overallStatus: OverallStatus;
  profileHref: string;
  assessmentHref: string | null;
};

type TrendPoint = {
  date: string;
  averageReadiness: number | null;
  checkIns: number;
};

type ReportsResponse = {
  filters: { range: RangeValue; from: string; to: string; playerId: string };
  players: PlayerOption[];
  kpis: {
    averageReadiness: number | null;
    playersCheckedIn: number;
    averageSleep: number | null;
    playersRequiringAttention: number;
  };
  teamOverview: {
    activePlayers: number;
    checkInRate: number;
    averageReadiness: number | null;
    averageSleep: number | null;
    averageFatigue: number | null;
    averageSoreness: number | null;
  };
  attentionPlayers: AttentionPlayer[];
  playerProgress: PlayerProgress[];
  trendData: TrendPoint[];
};

const todayKey = () => new Date().toISOString().slice(0, 10);

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function displayValue(value: number | null, locale: Locale, suffix = "") {
  return value == null ? t(locale, "coach.reports.noData") : `${value}${suffix}`;
}

function displayChange(value: number | null, locale: Locale) {
  if (value == null) return t(locale, "coach.reports.noComparison");
  const rounded = Number(value.toFixed(2));
  return rounded > 0 ? `+${rounded}` : String(rounded);
}

function changeStyle(value: number | null) {
  if (value == null) return "text-smoke-4";
  if (value > 0) return "text-[#80D987]";
  if (value < 0) return "text-red-glow";
  return "text-smoke-2";
}

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-US", { month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function formatMaybeDate(value: string | null, locale: Locale) {
  return value ? formatDate(value, locale) : t(locale, "coach.reports.notSet");
}

function statusLabel(status: OverallStatus, locale: Locale) {
  const map: Record<OverallStatus, string> = {
    Good: t(locale, "coach.reports.statusGood"),
    Watch: t(locale, "coach.reports.statusWatch"),
    Attention: t(locale, "coach.reports.statusAttention"),
    "No data": t(locale, "coach.reports.statusNoData"),
  };
  return map[status];
}

function StatusBadge({ status, locale }: { status: OverallStatus; locale: Locale }) {
  const style =
    status === "Good"
      ? "bg-[#4CAF50]/15 text-[#80D987]"
      : status === "Watch"
        ? "bg-[#FFC107]/15 text-[#FFC107]"
        : status === "Attention"
          ? "bg-red/15 text-red-glow"
          : "bg-white/10 text-smoke-3";

  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${style}`}>{statusLabel(status, locale)}</span>;
}

function MetricTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-line-1 bg-white/[0.03] p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-smoke-4">{label}</div>
      <div className="mt-2 font-display text-2xl font-black text-white">{value}</div>
    </div>
  );
}

function ReadinessChart({ data, locale }: { data: TrendPoint[]; locale: Locale }) {
  const hasData = data.some((point) => point.averageReadiness != null);
  const maxCheckIns = Math.max(1, ...data.map((point) => point.checkIns));

  if (!hasData) {
    return (
      <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-line-1 text-sm text-smoke-3">
        {t(locale, "coach.reports.noTrend")}
      </div>
    );
  }

  return (
    <div className="h-64 rounded-lg border border-line-1 bg-ink-2 p-4">
      <div className="flex h-full items-end gap-2">
        {data.map((point) => {
          const readiness = point.averageReadiness ?? 0;
          return (
            <div key={point.date} className="flex min-w-10 flex-1 flex-col items-center gap-2">
              <div className="flex h-44 w-full items-end justify-center rounded-md bg-white/[0.03] px-1">
                <div
                  className="w-full max-w-8 rounded-t bg-red transition-all"
                  style={{ height: `${Math.max(readiness, 4)}%` }}
                  title={t(locale, "coach.reports.chartTitle", {
                    date: formatDate(point.date, locale),
                    readiness: point.averageReadiness ?? t(locale, "coach.reports.noData"),
                    checkIns: point.checkIns,
                  })}
                />
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/10">
                <div className="h-full rounded-full bg-white/40" style={{ width: `${(point.checkIns / maxCheckIns) * 100}%` }} />
              </div>
              <div className="text-center text-[10px] text-smoke-4">{formatDate(point.date, locale)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ReportsPageView({ locale }: { locale: Locale }) {
  const [range, setRange] = useState<RangeValue>("week");
  const [from, setFrom] = useState(daysAgo(6));
  const [to, setTo] = useState(todayKey());
  const [playerId, setPlayerId] = useState("all");
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ range });
    if (range === "custom") {
      params.set("from", from);
      params.set("to", to);
    }
    if (playerId !== "all") params.set("playerId", playerId);
    return params.toString();
  }, [from, playerId, range, to]);

  const loadReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/coach/reports?${queryString}`, { cache: "no-store" });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || t(locale, "coach.reports.loadError"));
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "coach.reports.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReports();
  }, [queryString]);

  const players = data?.players ?? [];
  const kpis = data?.kpis ?? {
    averageReadiness: null,
    playersCheckedIn: 0,
    averageSleep: null,
    playersRequiringAttention: 0,
  };
  const overview = data?.teamOverview;
  const hasNoPlayers = !loading && !error && data != null && players.length === 0;
  const hasNoReportData =
    !loading &&
    !error &&
    data != null &&
    players.length > 0 &&
    data.playerProgress.every((player) => player.overallStatus === "No data") &&
    data.trendData.every((point) => point.averageReadiness == null);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-red">{t(locale, "coach.reports.eyebrow")}</p>
        <h1 className="mt-2 font-display text-3xl font-black text-white sm:text-4xl">{t(locale, "coach.reports.title")}</h1>
        <p className="mt-2 text-sm text-smoke-3">{t(locale, "coach.reports.subtitle")}</p>
      </div>

      <div className="rounded-lg border border-line-1 bg-ink-3 p-4">
        <div className="grid gap-3 lg:grid-cols-[220px_1fr_1fr_260px]">
          <select
            className="rounded-md border border-line-1 bg-ink-2 px-3 py-3 text-sm text-smoke-2 outline-none focus:border-red"
            value={range}
            onChange={(event) => setRange(event.target.value as RangeValue)}
            aria-label={t(locale, "coach.reports.rangeAria")}
          >
            <option value="week">{t(locale, "coach.reports.rangeWeek")}</option>
            <option value="month">{t(locale, "coach.reports.rangeMonth")}</option>
            <option value="custom">{t(locale, "coach.reports.rangeCustom")}</option>
          </select>
          <input
            className="rounded-md border border-line-1 bg-ink-2 px-3 py-3 text-sm text-smoke-2 outline-none focus:border-red disabled:opacity-50"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            disabled={range !== "custom"}
            aria-label={t(locale, "coach.reports.fromAria")}
          />
          <input
            className="rounded-md border border-line-1 bg-ink-2 px-3 py-3 text-sm text-smoke-2 outline-none focus:border-red disabled:opacity-50"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            disabled={range !== "custom"}
            aria-label={t(locale, "coach.reports.toAria")}
          />
          <select
            className="rounded-md border border-line-1 bg-ink-2 px-3 py-3 text-sm text-smoke-2 outline-none focus:border-red"
            value={playerId}
            onChange={(event) => setPlayerId(event.target.value)}
            aria-label={t(locale, "coach.reports.playerAria")}
          >
            <option value="all">{t(locale, "coach.reports.allPlayers")}</option>
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name || player.email}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={t(locale, "coach.reports.kpiAverageReadiness")} value={kpis.averageReadiness ?? 0} icon={BarChartIcon} loading={loading} />
        <KpiCard label={t(locale, "coach.reports.kpiPlayersCheckedIn")} value={kpis.playersCheckedIn} icon={ClipboardCheckIcon} loading={loading} />
        <KpiCard label={t(locale, "coach.reports.kpiAverageSleep")} value={kpis.averageSleep ?? 0} icon={CalendarIcon} loading={loading} />
        <KpiCard label={t(locale, "coach.reports.kpiNeedsAttention")} value={kpis.playersRequiringAttention} icon={AlertIcon} tone="warn" loading={loading} />
      </div>

      <div className="mt-5">
        {loading ? <SkeletonRows count={7} height="h-20" /> : null}
        {!loading && error ? <ErrorState locale={locale} message={error} onRetry={loadReports} /> : null}
        {hasNoPlayers ? (
          <EmptyState icon={UsersIcon} title={t(locale, "coach.reports.emptyPlayersTitle")} description={t(locale, "coach.reports.emptyPlayersBody")} />
        ) : null}
        {hasNoReportData ? (
          <div className="mb-5">
            <EmptyState icon={BarChartIcon} title={t(locale, "coach.reports.emptyDataTitle")} description={t(locale, "coach.reports.emptyDataBody")} />
          </div>
        ) : null}

        {!loading && !error && data && players.length > 0 ? (
          <div className="space-y-5">
            <div className="rounded-lg border border-line-1 bg-ink-3 p-4">
              <h2 className="font-display text-lg font-black text-white">{t(locale, "coach.reports.teamOverview")}</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <MetricTile label={t(locale, "coach.reports.activePlayers")} value={overview?.activePlayers ?? 0} />
                <MetricTile label={t(locale, "coach.reports.checkInRate")} value={`${overview?.checkInRate ?? 0}%`} />
                <MetricTile label={t(locale, "coach.reports.averageReadiness")} value={displayValue(overview?.averageReadiness ?? null, locale)} />
                <MetricTile label={t(locale, "coach.reports.averageSleep")} value={displayValue(overview?.averageSleep ?? null, locale, "h")} />
                <MetricTile label={t(locale, "coach.reports.averageFatigue")} value={displayValue(overview?.averageFatigue ?? null, locale)} />
                <MetricTile label={t(locale, "coach.reports.averageSoreness")} value={displayValue(overview?.averageSoreness ?? null, locale)} />
              </div>
            </div>

            <div className="rounded-lg border border-line-1 bg-ink-3 p-4">
              <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="font-display text-lg font-black text-white">{t(locale, "coach.reports.weeklyTrend")}</h2>
                  <p className="text-xs text-smoke-4">{t(locale, "coach.reports.trendHint")}</p>
                </div>
                <div className="text-xs text-smoke-4">
                  {formatDate(data.filters.from, locale)} - {formatDate(data.filters.to, locale)}
                </div>
              </div>
              <ReadinessChart data={data.trendData} locale={locale} />
            </div>

            <div className="rounded-lg border border-line-1 bg-ink-3">
              <div className="border-b border-line-1 px-4 py-4">
                <h2 className="font-display text-lg font-black text-white">{t(locale, "coach.reports.attentionTitle")}</h2>
              </div>
              <div className="p-4">
                {data.attentionPlayers.length === 0 ? (
                  <EmptyState icon={ClipboardCheckIcon} title={t(locale, "coach.reports.attentionEmptyTitle")} description={t(locale, "coach.reports.attentionEmptyBody")} />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[820px] text-left text-sm">
                      <thead className="text-xs uppercase tracking-wide text-smoke-4">
                        <tr className="border-b border-line-1">
                          <th className="px-3 py-3 font-bold">{t(locale, "coach.reports.colPlayerName")}</th>
                          <th className="px-3 py-3 font-bold">{t(locale, "coach.reports.colWarning")}</th>
                          <th className="px-3 py-3 font-bold">{t(locale, "coach.reports.colReadiness")}</th>
                          <th className="px-3 py-3 font-bold">{t(locale, "coach.reports.colSleep")}</th>
                          <th className="px-3 py-3 font-bold">{t(locale, "coach.reports.colFatigue")}</th>
                          <th className="px-3 py-3 font-bold">{t(locale, "coach.reports.colSoreness")}</th>
                          <th className="px-3 py-3 text-right font-bold">{t(locale, "coach.reports.colProfile")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.attentionPlayers.map((player) => (
                          <tr key={player.id} className="border-b border-line-1 last:border-b-0">
                            <td className="px-3 py-4 font-bold text-white">{player.name}</td>
                            <td className="px-3 py-4 text-red-glow">{player.reason}</td>
                            <td className="px-3 py-4 text-smoke-2">{displayValue(player.readiness, locale)}</td>
                            <td className="px-3 py-4 text-smoke-2">{displayValue(player.sleep, locale, "h")}</td>
                            <td className="px-3 py-4 text-smoke-2">{displayValue(player.fatigue, locale)}</td>
                            <td className="px-3 py-4 text-smoke-2">{displayValue(player.soreness, locale)}</td>
                            <td className="px-3 py-4 text-right">
                              <Link className="text-xs font-bold text-red hover:text-red-glow" href={player.profileHref}>
                                {t(locale, "coach.reports.viewProfile")}
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-line-1 bg-ink-3">
              <div className="border-b border-line-1 px-4 py-4">
                <h2 className="font-display text-lg font-black text-white">{t(locale, "coach.reports.playerProgress")}</h2>
              </div>
              <div className="overflow-x-auto p-4">
                <table className="w-full min-w-[1320px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-smoke-4">
                    <tr className="border-b border-line-1">
                      <th className="px-3 py-3 font-bold">{t(locale, "coach.reports.colPlayer")}</th>
                      <th className="px-3 py-3 font-bold">{t(locale, "coach.reports.colAssessmentType")}</th>
                      <th className="px-3 py-3 font-bold">{t(locale, "coach.reports.colAssessmentScore")}</th>
                      <th className="px-3 py-3 font-bold">{t(locale, "coach.reports.colScoreChange")}</th>
                      <th className="px-3 py-3 font-bold">{t(locale, "coach.reports.colAssessmentDate")}</th>
                      <th className="px-3 py-3 font-bold">{t(locale, "coach.reports.colReadiness")}</th>
                      <th className="px-3 py-3 font-bold">{t(locale, "coach.reports.colSleep")}</th>
                      <th className="px-3 py-3 font-bold">{t(locale, "coach.reports.colActiveProgram")}</th>
                      <th className="px-3 py-3 font-bold">{t(locale, "coach.reports.colProgramDates")}</th>
                      <th className="px-3 py-3 font-bold">{t(locale, "coach.reports.colActiveAssignment")}</th>
                      <th className="px-3 py-3 font-bold">{t(locale, "coach.reports.colOverallStatus")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.playerProgress.map((player) => (
                      <tr key={player.id} className="border-b border-line-1 last:border-b-0">
                        <td className="px-3 py-4">
                          <Link className="font-bold text-white hover:text-red-glow" href={player.profileHref}>
                            {player.name}
                          </Link>
                          <div className="text-xs text-smoke-4">{player.email}</div>
                        </td>
                        <td className="px-3 py-4 text-smoke-2">
                          {player.latestAssessment && player.assessmentHref ? (
                            <Link className="font-semibold text-red hover:text-red-glow" href={player.assessmentHref}>
                              {player.latestAssessment.type}
                            </Link>
                          ) : (
                            t(locale, "coach.reports.noAssessment")
                          )}
                        </td>
                        <td className="px-3 py-4 text-smoke-2">{player.latestAssessment ? formatScore(player.latestAssessment.score) : t(locale, "coach.reports.noAssessment")}</td>
                        <td className={`px-3 py-4 font-semibold ${changeStyle(player.assessmentChange)}`}>{displayChange(player.assessmentChange, locale)}</td>
                        <td className="px-3 py-4 text-smoke-2">{player.latestAssessment ? formatDate(player.latestAssessment.date, locale) : t(locale, "coach.reports.noAssessment")}</td>
                        <td className="px-3 py-4 text-smoke-2">{displayValue(player.latestReadiness, locale)}</td>
                        <td className="px-3 py-4 text-smoke-2">{displayValue(player.sleep, locale, "h")}</td>
                        <td className="px-3 py-4 text-smoke-2">
                          {player.activeProgram ? (
                            <div>
                              <div className="font-semibold text-white">{player.activeProgram.name}</div>
                              <div className="text-xs text-smoke-4">
                                {t(locale, "coach.reports.programProgress", {
                                  progress: player.activeProgram.progress,
                                  completed: player.activeProgram.completedSessions,
                                  remaining: player.activeProgram.remainingSessions,
                                })}
                              </div>
                            </div>
                          ) : (
                            t(locale, "coach.reports.noActiveProgram")
                          )}
                        </td>
                        <td className="px-3 py-4 text-smoke-2">
                          {player.activeProgram
                            ? `${formatMaybeDate(player.activeProgram.startDate, locale)} - ${formatMaybeDate(player.activeProgram.endDate, locale)}`
                            : t(locale, "coach.reports.noActiveProgram")}
                        </td>
                        <td className="px-3 py-4">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${
                            player.hasActiveAssignment ? "bg-[#4CAF50]/15 text-[#80D987]" : "bg-white/10 text-smoke-3"
                          }`}>
                            {player.hasActiveAssignment ? t(locale, "coach.reports.assignmentActive") : t(locale, "coach.reports.assignmentNone")}
                          </span>
                        </td>
                        <td className="px-3 py-4">
                          <StatusBadge status={player.overallStatus} locale={locale} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
