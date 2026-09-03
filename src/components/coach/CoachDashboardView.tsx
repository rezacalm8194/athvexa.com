"use client";

import { useEffect, useState } from "react";
import KpiCard from "@/components/coach/KpiCard";
import EmptyRosterState from "@/components/coach/EmptyRosterState";
import QuickActions from "@/components/coach/QuickActions";
import PlayersAttention from "@/components/coach/PlayersAttention";
import RecentActivity from "@/components/coach/RecentActivity";
import InvitePanel from "@/components/coach/InvitePanel";
import TeamRosterList, { type Member } from "@/components/coach/TeamRosterList";
import { UsersIcon, MailIcon, ClipboardCheckIcon, AlertIcon } from "@/components/icons";
import { t, type Locale } from "@/lib/i18n";

type Overview = {
  kpis: { activePlayers: number; pendingInvitations: number; reportsToday: number; needsAttention: number };
  playersNeedingAttention: { id: string; name: string; loggedToday: boolean; score: number; label: string }[];
  recentActivity: {
    id: string;
    kind?: "CHECK_IN" | "ASSISTANT_ACTIVITY";
    playerId?: string;
    playerName?: string;
    score?: number;
    title?: string;
    description?: string;
    actionHref?: string | null;
    updatedAt: string;
    tone: "good" | "warn" | "bad" | "neutral";
  }[];
};

export default function CoachDashboardView({
  coachName,
  teamName,
  canManageRoles,
  locale,
}: {
  coachName: string;
  teamName: string | null;
  canManageRoles: boolean;
  locale: Locale;
}) {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  function loadRoster() {
    fetch("/api/coach/players")
      .then((r) => r.json())
      .then((data) => setMembers(data.players ?? []));
  }

  function loadOverview() {
    fetch("/api/coach/overview")
      .then((r) => r.json())
      .then((data) => setOverview(data));
  }

  useEffect(() => {
    loadRoster();
    loadOverview();
  }, []);

  async function changeRole(id: string, role: Member["role"]) {
    setUpdatingId(id);
    const prev = members;
    setMembers((cur) => cur?.map((m) => (m.id === id ? { ...m, role } : m)) ?? cur);
    const res = await fetch(`/api/coach/players/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      setMembers(prev);
    } else {
      loadRoster();
    }
    setUpdatingId(null);
  }

  const players = members?.filter((m) => m.role === "PLAYER") ?? null;
  const hasPlayers = (players?.length ?? 0) > 0;
  const firstName = coachName.split(" ")[0];

  const summaryLine = overview
    ? `${t(locale, "coach.dashboard.summary", {
        checked: overview.kpis.reportsToday,
        active: overview.kpis.activePlayers,
      })}${
        overview.kpis.needsAttention > 0
          ? t(locale, "coach.dashboard.summaryAttention", { count: overview.kpis.needsAttention })
          : ""
      }`
    : t(locale, "coach.dashboard.summaryLoading");

  return (
    <div className="mx-auto max-w-[1280px] px-6 py-8">
      <div className="mb-6">
        <div className="eyebrow">
          {t(locale, "coach.dashboard.eyebrow", { team: teamName ?? t(locale, "coach.dashboard.teamStatus") })}
        </div>
        <h1 className="font-display text-3xl font-extrabold tracking-wide text-white">
          {t(locale, "coach.dashboard.welcome", { name: firstName })}
        </h1>
        <p className="mt-1 text-sm text-smoke-3">{summaryLine}</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label={t(locale, "coach.dashboard.kpiActivePlayers")} value={overview?.kpis.activePlayers ?? 0} icon={UsersIcon} loading={!overview} />
        <KpiCard label={t(locale, "coach.dashboard.kpiPendingInvites")} value={overview?.kpis.pendingInvitations ?? 0} icon={MailIcon} loading={!overview} />
        <KpiCard label={t(locale, "coach.dashboard.kpiReportsToday")} value={overview?.kpis.reportsToday ?? 0} icon={ClipboardCheckIcon} loading={!overview} />
        <KpiCard
          label={t(locale, "coach.dashboard.kpiNeedsAttention")}
          value={overview?.kpis.needsAttention ?? 0}
          icon={AlertIcon}
          tone={overview && overview.kpis.needsAttention > 0 ? "warn" : "neutral"}
          loading={!overview}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-5">
          <QuickActions canManageRoles={canManageRoles} locale={locale} />

          {members === null && (
            <div className="card space-y-2 p-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-md bg-white/5" />
              ))}
            </div>
          )}

          {members !== null && !hasPlayers && <EmptyRosterState teamName={teamName} locale={locale} />}

          {hasPlayers && (
            <>
              <PlayersAttention players={overview?.playersNeedingAttention ?? null} loading={!overview} locale={locale} />
              <div className="card p-5">
                <h2 className="mb-3 font-display text-lg font-bold tracking-wide text-white">{t(locale, "coach.dashboard.teamRoster")}</h2>
                <TeamRosterList
                  members={members ?? []}
                  canManageRoles={canManageRoles}
                  updatingId={updatingId}
                  onChangeRole={changeRole}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <div id="invite-panel">
            <InvitePanel
              coachName={coachName}
              canManageRoles={canManageRoles}
              limit={4}
              showViewAll
              onChange={loadOverview}
            />
          </div>
          <RecentActivity items={overview?.recentActivity ?? null} loading={!overview} locale={locale} />
        </div>
      </div>
    </div>
  );
}
