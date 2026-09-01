"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatAssessmentDate } from "@/components/coach/assessments/AssessmentUi";
import KpiCard from "@/components/coach/KpiCard";
import EmptyState from "@/components/coach/shared/EmptyState";
import ErrorState from "@/components/coach/shared/ErrorState";
import { SkeletonRows } from "@/components/coach/shared/LoadingSkeleton";
import SearchInput from "@/components/coach/shared/SearchInput";
import { AlertIcon, CalendarIcon, ClipboardCheckIcon, PlusIcon, UsersIcon } from "@/components/icons";
import { useToast } from "@/components/ui/Toast";
import { ASSESSMENT_TYPES, AssessmentType } from "@/lib/assessmentTypes";
import { formatScore } from "@/lib/formatScore";

type LatestAssessment = {
  id: string;
  type: AssessmentType;
  date: string;
  score: number;
};

type PlayerSummary = {
  id: string;
  name: string;
  email: string;
  latestAssessment: LatestAssessment | null;
  count: number;
  neverAssessed: boolean;
  needsAssessment: boolean;
};

type AssessmentResponse = {
  playersSummary: PlayerSummary[];
  kpis: {
    totalPlayers: number;
    totalAssessments: number;
    assessmentsThisMonth: number;
    playersAssessed: number;
    playersNotAssessed: number;
  };
};

export default function AssessmentsPageView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const deepLinkedAssessmentId = searchParams.get("assessmentId");
  const [data, setData] = useState<AssessmentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<AssessmentType | "all">("all");
  const [month, setMonth] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (type !== "all") params.set("type", type);
    if (month) params.set("month", month);
    return params.toString();
  }, [month, search, type]);

  const loadPlayers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/coach/assessments${queryString ? `?${queryString}` : ""}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load assessment coverage");
      setData(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load assessment coverage");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPlayers();
  }, [queryString]);

  useEffect(() => {
    if (!deepLinkedAssessmentId) return;
    let active = true;
    fetch(`/api/coach/assessments/${encodeURIComponent(deepLinkedAssessmentId)}`, { cache: "no-store" })
      .then((response) => response.json().then((payload) => ({ ok: response.ok, payload })))
      .then(({ ok, payload }) => {
        if (!active) return;
        if (!ok) throw new Error(payload.error || "Could not open assessment");
        router.replace(`/dashboard/coach/players/${encodeURIComponent(payload.assessment.playerId)}?assessmentId=${encodeURIComponent(deepLinkedAssessmentId)}#assessments`);
      })
      .catch((redirectError) => {
        if (active) showToast(redirectError instanceof Error ? redirectError.message : "Could not open assessment", "error");
      });
    return () => {
      active = false;
    };
  }, [deepLinkedAssessmentId, router, showToast]);

  const players = data?.playersSummary ?? [];
  const kpis = data?.kpis ?? {
    totalPlayers: 0,
    totalAssessments: 0,
    assessmentsThisMonth: 0,
    playersAssessed: 0,
    playersNotAssessed: 0,
  };
  const hasFilters = search.trim() !== "" || type !== "all" || month !== "";
  const assessmentCoverage = kpis.totalPlayers === 0 ? 0 : Math.round((kpis.playersAssessed / kpis.totalPlayers) * 100);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-red">Coach tools</p>
          <h1 className="mt-2 font-display text-3xl font-black text-white sm:text-4xl">Assessments</h1>
          <p className="mt-2 text-sm text-smoke-3">See team coverage and open each player’s assessment history.</p>
        </div>
        {!loading && kpis.totalPlayers === 0 ? (
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <Link href="/dashboard/coach/players#invite-panel" className="btn-primary justify-center gap-2 !px-4 !py-3 text-sm">
              <PlusIcon className="h-4 w-4" />
              Add your first player
            </Link>
            <Link href="/dashboard/coach/players" className="text-center text-xs font-semibold text-smoke-3 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red">
              Go to Players
            </Link>
          </div>
        ) : null}
      </div>

      {!loading && !error && kpis.totalPlayers === 0 ? (
        <div className="mt-8 flex items-start gap-4 rounded-lg border border-line-1 bg-ink-3 p-5 sm:max-w-2xl sm:p-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-red/15 text-red">
            <UsersIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-black text-white">Start with your first player</h2>
            <p className="mt-1 max-w-xl text-sm leading-6 text-smoke-3">Add a player to your team. Once they join, you can create assessments and track their development here.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Players needing assessment" value={kpis.playersNotAssessed} icon={AlertIcon} tone="warn" loading={loading} />
            <KpiCard label="Team assessment coverage" value={`${assessmentCoverage}%`} icon={UsersIcon} loading={loading} />
            <KpiCard label="Assessments this month" value={kpis.assessmentsThisMonth} icon={CalendarIcon} loading={loading} />
            <KpiCard label="Total assessments" value={kpis.totalAssessments} icon={ClipboardCheckIcon} loading={loading} />
          </div>

          <div className="mt-5 rounded-lg border border-line-1 bg-ink-3 p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_220px_180px]">
              <SearchInput value={search} onChange={setSearch} placeholder="Search player name or email" />
              <select className="rounded-md border border-line-1 bg-ink-2 px-3 py-3 text-sm text-smoke-2 outline-none focus:border-red" value={type} onChange={(event) => setType(event.target.value as AssessmentType | "all")} aria-label="Assessment type">
                <option value="all">All types</option>
                {ASSESSMENT_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <input className="rounded-md border border-line-1 bg-ink-2 px-3 py-3 text-sm text-smoke-2 outline-none focus:border-red" type="month" value={month} onChange={(event) => setMonth(event.target.value)} aria-label="Assessment month" />
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-line-1 bg-ink-3">
            <div className="flex items-center justify-between border-b border-line-1 px-4 py-4">
              <div>
                <h2 className="font-display text-lg font-black text-white">Players</h2>
                <p className="mt-1 text-xs text-smoke-4">{loading ? "Loading..." : `${players.length} shown`}</p>
              </div>
              {hasFilters ? <button className="btn-ghost !px-3 !py-2 text-xs" onClick={() => { setSearch(""); setType("all"); setMonth(""); }}>Clear filters</button> : null}
            </div>

            <div className="p-4">
              {loading ? <SkeletonRows count={6} /> : null}
              {!loading && error ? <ErrorState message={error} onRetry={loadPlayers} /> : null}
              {!loading && !error && players.length === 0 ? (
                <EmptyState icon={UsersIcon} title="No matching players" description="Try clearing the search, type, or month filter." action={hasFilters ? <button className="btn-ghost !px-4 !py-2 text-sm" onClick={() => { setSearch(""); setType("all"); setMonth(""); }}>Clear filters</button> : undefined} />
              ) : null}
              {!loading && !error && players.length > 0 ? (
                <div className="space-y-3">
                  {players.map((player) => {
                    const playerHref = `/dashboard/coach/players/${encodeURIComponent(player.id)}`;
                    return (
                      <article key={player.id} className="rounded-lg border border-line-1 bg-ink-2 p-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="min-w-0 lg:w-64">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate font-display text-lg font-bold text-white">{player.name || "Unnamed player"}</h3>
                              {player.needsAssessment ? <span className="rounded-full bg-red/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-red-glow">Needs assessment</span> : null}
                            </div>
                            <p className="mt-1 truncate text-xs text-smoke-4">{player.email}</p>
                          </div>

                          <div className="min-w-0 flex-1">
                            {player.latestAssessment ? (
                              <div className="grid gap-2 text-sm sm:grid-cols-3">
                                <div><span className="text-smoke-4">Latest type</span><div className="mt-1 font-semibold text-white">{player.latestAssessment.type}</div></div>
                                <div><span className="text-smoke-4">Score</span><div className="mt-1 font-semibold text-white">{formatScore(player.latestAssessment.score)}</div></div>
                                <div><span className="text-smoke-4">Date</span><div className="mt-1 font-semibold text-smoke-2">{formatAssessmentDate(player.latestAssessment.date)}</div></div>
                              </div>
                            ) : <p className="text-sm font-semibold text-smoke-3">No assessments</p>}
                          </div>

                          <div className="flex flex-col gap-2 sm:flex-row lg:items-center">
                            <span className="whitespace-nowrap text-xs font-semibold text-smoke-3">{player.count} {player.count === 1 ? "assessment" : "assessments"}</span>
                            <Link href={`${playerHref}?newAssessment=1#assessments`} className="btn-ghost justify-center !px-3 !py-2 text-xs">New assessment</Link>
                            <Link href={`${playerHref}#assessments`} className="btn-primary justify-center !px-4 !py-2 text-xs">Open assessments</Link>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
