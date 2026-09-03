"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/coach/shared/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { t, type Locale } from "@/lib/i18n";

type Detail = {
  id: string;
  name: string;
  description: string | null;
  goal: string | null;
  durationWeeks: number;
  sessionsPerWeek: number;
  startDate: string | null;
  endDate: string | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  sessions: { id: string; title: string; day: string; durationMinutes: number | null; intensity: string; notes: string | null }[];
  assignedPlayers: { id: string; name: string; email: string; assignedAt: string; assignmentStatus: string }[];
};

const STATUS_TONE = { DRAFT: "neutral", ACTIVE: "good", ARCHIVED: "warn" } as const;

type PlayerOption = { id: string; name: string; email: string; role: string };

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MONDAY_2024 = new Date("2024-01-01T12:00:00Z");

function weekdayLabel(day: string, locale: Locale) {
  const index = DAYS.indexOf(day);
  if (index === -1) return day;
  return new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-US", { weekday: "long" }).format(
    new Date(MONDAY_2024.getTime() + index * 86400000)
  );
}

function programStatusLabel(status: Detail["status"], locale: Locale) {
  if (status === "ACTIVE") return t(locale, "coach.programs.statusActive");
  if (status === "DRAFT") return t(locale, "coach.programs.statusDraft");
  return t(locale, "coach.programs.statusArchived");
}

function intensityLabel(intensity: string, locale: Locale) {
  if (intensity === "LOW") return t(locale, "coach.programs.intensityLow");
  if (intensity === "MEDIUM") return t(locale, "coach.programs.intensityMedium");
  if (intensity === "HIGH") return t(locale, "coach.programs.intensityHigh");
  return intensity;
}

export default function ProgramDetailModal({
  id,
  locale,
  onClose,
  onChanged,
}: {
  id: string;
  locale: Locale;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const { showToast } = useToast();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [error, setError] = useState(false);
  const [savingAssignments, setSavingAssignments] = useState(false);

  function loadDetail() {
    setError(false);
    fetch(`/api/coach/programs/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setDetail(data.program);
        setSelectedPlayerIds(data.program.assignedPlayers.map((player: { id: string }) => player.id));
      })
      .catch(() => setError(true));
  }

  useEffect(() => {
    loadDetail();
    fetch("/api/coach/players")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setPlayers((data.players ?? []).filter((player: PlayerOption) => player.role === "PLAYER")))
      .catch(() => setPlayers([]));
  }, [id]);

  function togglePlayer(playerId: string) {
    setSelectedPlayerIds((current) =>
      current.includes(playerId) ? current.filter((id) => id !== playerId) : [...current, playerId]
    );
  }

  async function saveAssignments() {
    if (!detail) return;
    setSavingAssignments(true);
    const res = await fetch(`/api/coach/programs/${detail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: detail.name,
        description: detail.description,
        goal: detail.goal,
        durationWeeks: detail.durationWeeks,
        sessionsPerWeek: detail.sessionsPerWeek,
        startDate: detail.startDate,
        endDate: detail.endDate,
        status: detail.status,
        playerIds: selectedPlayerIds,
        sessions: detail.sessions.map((session) => ({
          title: session.title,
          day: session.day,
          durationMinutes: session.durationMinutes,
          intensity: session.intensity,
          notes: session.notes,
        })),
      }),
    });
    setSavingAssignments(false);
    if (res.ok) {
      showToast(t(locale, "coach.programs.assignmentsUpdated"), "success");
      loadDetail();
      onChanged?.();
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error ?? t(locale, "coach.programs.assignmentsError"), "error");
    }
  }

  const assignmentsChanged =
    detail != null &&
    (selectedPlayerIds.length !== detail.assignedPlayers.length ||
      selectedPlayerIds.some((playerId) => !detail.assignedPlayers.some((player) => player.id === playerId)));

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/70 p-4 py-8" onClick={onClose}>
      <div className="w-full max-w-xl rounded-lg border border-white/10 bg-ink-3 p-5 shadow-2xl sm:p-6" onClick={(e) => e.stopPropagation()}>
        {error && <p className="text-sm text-red-glow">{t(locale, "coach.programs.detailLoadError")}</p>}
        {!detail && !error && <div className="h-32 animate-pulse rounded-md bg-white/5" />}
        {detail && (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold text-white">{detail.name}</h2>
                {detail.goal && <p className="mt-0.5 text-sm text-smoke-3">{detail.goal}</p>}
              </div>
              <StatusBadge label={programStatusLabel(detail.status, locale)} tone={STATUS_TONE[detail.status]} />
            </div>
            {detail.description && <p className="mt-3 text-sm text-paper">{detail.description}</p>}

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <div className="eyebrow">{t(locale, "coach.programs.duration")}</div>
                <div className="mt-0.5 text-white">{detail.durationWeeks}w</div>
              </div>
              <div>
                <div className="eyebrow">{t(locale, "coach.programs.perWeek")}</div>
                <div className="mt-0.5 text-white">{detail.sessionsPerWeek}</div>
              </div>
              <div>
                <div className="eyebrow">{t(locale, "coach.programs.start")}</div>
                <div className="mt-0.5 text-white">{detail.startDate ?? "—"}</div>
              </div>
              <div>
                <div className="eyebrow">{t(locale, "coach.programs.end")}</div>
                <div className="mt-0.5 text-white">{detail.endDate ?? "—"}</div>
              </div>
            </div>

            <div className="mt-5">
              <span className="eyebrow">{t(locale, "coach.programs.sessionsCount", { count: detail.sessions.length })}</span>
              {detail.sessions.length === 0 ? (
                <p className="mt-2 text-xs text-smoke-3">{t(locale, "coach.programs.noSessions")}</p>
              ) : (
                <div className="mt-2 flex flex-col gap-2">
                  {detail.sessions.map((s) => (
                    <div key={s.id} className="rounded-md border border-white/5 bg-ink-2 p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="font-medium text-white">{s.title}</span>
                        <span className="text-xs text-smoke-3">
                          {weekdayLabel(s.day, locale)} ·{" "}
                          {s.durationMinutes ? t(locale, "common.minutes", { value: s.durationMinutes }) : "—"} ·{" "}
                          {intensityLabel(s.intensity, locale)}
                        </span>
                      </div>
                      {s.notes && <p className="mt-1 text-xs text-smoke-3">{s.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5">
              <span className="eyebrow">{t(locale, "coach.programs.assignedCount", { count: detail.assignedPlayers.length })}</span>
              {detail.assignedPlayers.length === 0 ? (
                <p className="mt-2 text-xs text-smoke-3">{t(locale, "coach.programs.noAssigned")}</p>
              ) : (
                <div className="mt-2 flex flex-col gap-1.5">
                  {detail.assignedPlayers.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2 rounded bg-white/5 px-2 py-1.5 text-xs">
                      <span className="text-paper">{p.name}</span>
                      <span className="text-smoke-4">{p.assignmentStatus}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="eyebrow">{t(locale, "coach.programs.manageAssignments")}</span>
                <button
                  className="btn-ghost !px-3 !py-1.5 text-xs"
                  onClick={saveAssignments}
                  disabled={!assignmentsChanged || savingAssignments}
                >
                  {savingAssignments ? t(locale, "common.saving") : t(locale, "coach.programs.saveAssignments")}
                </button>
              </div>
              {players.length === 0 ? (
                <p className="text-xs text-smoke-3">{t(locale, "coach.programs.noRoster")}</p>
              ) : (
                <div className="max-h-40 overflow-y-auto rounded-md border border-line-1 p-2">
                  {players.map((player) => (
                    <label key={player.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-paper hover:bg-white/5">
                      <input
                        type="checkbox"
                        className="accent-red"
                        checked={selectedPlayerIds.includes(player.id)}
                        onChange={() => togglePlayer(player.id)}
                      />
                      <span>{player.name}</span>
                      <span className="text-xs text-smoke-4">{player.email}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="btn-ghost !px-4 !py-2.5 text-sm">
            {t(locale, "coach.programs.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
