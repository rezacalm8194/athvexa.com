"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatAssessmentDate } from "@/components/coach/assessments/AssessmentUi";
import EmptyState from "@/components/coach/shared/EmptyState";
import ErrorState from "@/components/coach/shared/ErrorState";
import { SkeletonRows } from "@/components/coach/shared/LoadingSkeleton";
import SearchInput from "@/components/coach/shared/SearchInput";
import { PlusIcon, UsersIcon } from "@/components/icons";
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

  const players = useMemo(() => {
    const list = data?.playersSummary ?? [];
    return [...list].sort((a, b) => Number(b.needsAssessment) - Number(a.needsAssessment) || a.name.localeCompare(b.name));
  }, [data?.playersSummary]);

  const kpis = data?.kpis ?? {
    totalPlayers: 0,
    totalAssessments: 0,
    assessmentsThisMonth: 0,
    playersAssessed: 0,
    playersNotAssessed: 0,
  };
  const hasFilters = search.trim() !== "" || type !== "all" || month !== "";
  const coverage = kpis.totalPlayers === 0 ? 0 : Math.round((kpis.playersAssessed / kpis.totalPlayers) * 100);

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-red">Coach tools</p>
          <h1 className="mt-1 font-display text-3xl font-black text-white">Assessments</h1>
          <p className="mt-1 text-sm text-smoke-3">One row per player. History lives on the player profile.</p>
        </div>
        {!loading && kpis.totalPlayers > 0 ? (
          <p className="text-sm text-smoke-3">
            <span className="font-semibold text-white">{kpis.playersNotAssessed}</span> due
            <span className="mx-2 text-white/20">·</span>
            <span className="font-semibold text-white">{coverage}%</span> covered
            <span className="mx-2 text-white/20">·</span>
            <span className="font-semibold text-white">{kpis.assessmentsThisMonth}</span> this month
            <span className="mx-2 text-white/20">·</span>
            <span className="font-semibold text-white">{kpis.totalAssessments}</span> total
          </p>
        ) : null}
      </div>

      {!loading && !error && kpis.totalPlayers === 0 ? (
        <div className="rounded-lg border border-line-1 bg-ink-3 p-6 sm:max-w-xl">
          <h2 className="font-display text-lg font-black text-white">Add a player first</h2>
          <p className="mt-1 text-sm leading-6 text-smoke-3">Assessments attach to players. Invite someone, then record their tests here.</p>
          <Link href="/dashboard/coach/players#invite-panel" className="btn-primary mt-4 inline-flex gap-2 !px-4 !py-2.5 text-sm">
            <PlusIcon className="h-4 w-4" />
            Invite a player
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_150px_150px]">
            <div className="col-span-2 sm:col-span-1">
              <SearchInput value={search} onChange={setSearch} placeholder="Search players" />
            </div>
            <select className="rounded-md border border-line-1 bg-ink-2 px-3 py-2 text-sm text-smoke-2 outline-none focus:border-red" value={type} onChange={(event) => setType(event.target.value as AssessmentType | "all")} aria-label="Assessment type">
              <option value="all">All types</option>
              {ASSESSMENT_TYPES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <input className="rounded-md border border-line-1 bg-ink-2 px-3 py-2 text-sm text-smoke-2 outline-none focus:border-red" type="month" value={month} onChange={(event) => setMonth(event.target.value)} aria-label="Assessment month" />
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-line-1 bg-ink-3">
            <div className="flex items-center justify-between border-b border-line-1 px-4 py-2.5">
              <h2 className="text-sm font-semibold text-white">Squad</h2>
              <div className="flex items-center gap-3">
                <p className="text-xs text-smoke-4">{loading ? "Loading…" : `${players.length} players`}</p>
                {hasFilters ? (
                  <button className="text-xs font-semibold text-smoke-3 hover:text-white" onClick={() => { setSearch(""); setType("all"); setMonth(""); }}>
                    Clear
                  </button>
                ) : null}
              </div>
            </div>

            <div className="p-0">
              {loading ? <div className="p-4"><SkeletonRows count={6} /></div> : null}
              {!loading && error ? <div className="p-4"><ErrorState message={error} onRetry={loadPlayers} /></div> : null}
              {!loading && !error && players.length === 0 ? (
                <div className="p-4">
                  <EmptyState icon={UsersIcon} title="No matching players" description="Clear the search or filters to see the full squad." action={hasFilters ? <button className="btn-ghost !px-4 !py-2 text-sm" onClick={() => { setSearch(""); setType("all"); setMonth(""); }}>Clear filters</button> : undefined} />
                </div>
              ) : null}
              {!loading && !error && players.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] sm:min-w-0 text-left text-sm">
                    <thead className="text-[11px] uppercase tracking-wide text-smoke-4">
                      <tr className="border-b border-white/5">
                        <th className="px-4 py-2 font-semibold">Player</th>
                        <th className="px-4 py-2 font-semibold">Latest</th>
                        <th className="px-4 py-2 font-semibold">Score</th>
                        <th className="hidden px-4 py-2 font-semibold sm:table-cell">Date</th>
                        <th className="hidden px-4 py-2 text-right font-semibold sm:table-cell">Tests</th>
                      </tr>
                    </thead>
                    <tbody>
                      {players.map((player) => {
                        const href = `/dashboard/coach/players/${encodeURIComponent(player.id)}#assessments`;
                        return (
                          <tr
                            key={player.id}
                            className="cursor-pointer border-b border-white/5 last:border-b-0 hover:bg-white/[0.03] [content-visibility:auto]"
                            onClick={() => router.push(href)}
                          >
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <span className="truncate font-semibold text-white">{player.name || "Unnamed"}</span>
                                {player.needsAssessment ? <span className="rounded bg-red/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-glow">Due</span> : null}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-smoke-2">{player.latestAssessment?.type ?? "—"}</td>
                            <td className="px-4 py-2.5 font-semibold text-white">{player.latestAssessment ? formatScore(player.latestAssessment.score) : "—"}</td>
                            <td className="hidden px-4 py-2.5 text-smoke-3 sm:table-cell">{player.latestAssessment ? formatAssessmentDate(player.latestAssessment.date) : "—"}</td>
                            <td className="hidden px-4 py-2.5 text-right tabular-nums text-smoke-3 sm:table-cell">{player.count}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
