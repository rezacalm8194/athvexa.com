"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ScoreCard from "./ScoreCard";
import StatInput from "./StatInput";
import WellnessSlider from "./WellnessSlider";
import { formatDate } from "@/lib/format";
import { t, type Locale } from "@/lib/i18n";

type Task = { id: string; label: string; done: boolean };
type Log = {
  id: string;
  score: number;
  sleepHours: number | null;
  waterLiters: number | null;
  energy: number | null;
  fatigue: number | null;
  soreness: number | null;
  mood: number | null;
  stress: number | null;
  sleepQuality: number | null;
  tasks: Task[];
};
type TrainingSession = {
  id: string;
  title: string;
  day: string;
  durationMinutes: number | null;
  intensity: string;
  notes: string | null;
  status: string;
};
type Assessment = { id: string; type: string; score: number; date: string } | null;
type ActiveProgram = {
  id: string;
  name: string;
  goal: string | null;
  startDate: string | null;
  endDate: string | null;
  progress: number | null;
  nextSession: { id: string; title: string; day: string; durationMinutes: number | null; intensity: string } | null;
} | null;

function formatLongDate(value: string, locale: Locale, timeZone: string | null) {
  return formatDate(`${value}T12:00:00Z`, { weekday: "long", month: "long", day: "numeric", year: "numeric" }, locale, timeZone);
}

function formatShortDate(value: string, locale: Locale, timeZone: string | null) {
  return formatDate(`${value}T12:00:00Z`, { month: "short", day: "numeric", year: "numeric" }, locale, timeZone);
}

function durationLabel(value: number | null | undefined, locale: Locale) {
  return value == null ? t(locale, "common.notSet") : t(locale, "common.minutes", { value });
}

function SummaryCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-white/5 bg-ink-3 p-4">
      <div className="eyebrow mb-2">{title}</div>
      {children}
    </section>
  );
}

export default function TodayDashboard({ playerName, locale, timeZone }: { playerName: string; locale: Locale; timeZone: string | null }) {
  const [log, setLog] = useState<Log | null>(null);
  const [coachMessage, setCoachMessage] = useState<string | null>(null);
  const [todayDate, setTodayDate] = useState<string | null>(null);
  const [checkInCompleted, setCheckInCompleted] = useState(false);
  const [todaysTraining, setTodaysTraining] = useState<TrainingSession | null>(null);
  const [currentAssessment, setCurrentAssessment] = useState<Assessment>(null);
  const [activeProgram, setActiveProgram] = useState<ActiveProgram>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/player/today")
      .then((r) => r.json())
      .then((data) => {
        setLog(data.log);
        setCoachMessage(data.coachMessage);
        setTodayDate(data.todayDate);
        setCheckInCompleted(Boolean(data.checkInCompleted));
        setTodaysTraining(data.todaysTraining);
        setCurrentAssessment(data.currentAssessment);
        setActiveProgram(data.activeProgram);
        setLoading(false);
      });
  }, []);

  async function patch(field: string, value: number) {
    const res = await fetch("/api/player/today", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    const data = await res.json();
    setLog(data.log);
    setCheckInCompleted(true);
  }

  async function toggleTask(task: Task) {
    // Optimistic update so the checklist feels instant.
    setLog((prev) =>
      prev
        ? { ...prev, tasks: prev.tasks.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)) }
        : prev
    );
    await fetch(`/api/player/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !task.done }),
    });
  }

  if (loading || !log) {
    return <div className="p-8 text-sm text-smoke-3">{t(locale, "player.today.loading")}</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6">
        <div className="eyebrow">{t(locale, "player.today.eyebrow")}</div>
        <h1 className="font-display text-3xl font-extrabold tracking-wide text-white">
          {t(locale, "player.today.welcome", { name: playerName })}
        </h1>
        <p className="mt-1 text-sm text-smoke-3">{todayDate ? formatLongDate(todayDate, locale, timeZone) : ""}</p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <SummaryCard title={t(locale, "player.today.todaysTraining")}>
          {todaysTraining ? (
            <div>
              <h2 className="font-display text-lg font-bold text-white">{todaysTraining.title}</h2>
              <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                <span className="rounded bg-white/10 px-2 py-1 text-smoke-2">{durationLabel(todaysTraining.durationMinutes, locale)}</span>
                <span className="rounded bg-red/15 px-2 py-1 font-bold text-red-glow">{todaysTraining.intensity}</span>
                <span className="rounded bg-[#4CAF50]/15 px-2 py-1 font-bold text-[#80D987]">{todaysTraining.status}</span>
              </div>
              {todaysTraining.notes && <p className="mt-3 text-xs text-smoke-3">{todaysTraining.notes}</p>}
            </div>
          ) : (
            <p className="text-sm text-smoke-3">{t(locale, "player.today.noTrainingToday")}</p>
          )}
        </SummaryCard>

        <SummaryCard title={t(locale, "player.today.todaysCheckIn")}>
          <div className="flex flex-col gap-3">
            <div>
              <div className="font-display text-xl font-black text-white">
                {checkInCompleted ? t(locale, "player.today.checkInCompleted") : t(locale, "player.today.checkInNotCompleted")}
              </div>
              <p className="mt-1 text-xs text-smoke-3">
                {checkInCompleted ? t(locale, "player.today.checkInSaved") : t(locale, "player.today.checkInPrompt")}
              </p>
            </div>
            {!checkInCompleted && (
              <Link href="/dashboard/player/check-in" className="btn-primary w-fit !px-4 !py-2 text-xs">
                {t(locale, "player.today.completeCheckInCta")}
              </Link>
            )}
          </div>
        </SummaryCard>

        <SummaryCard title={t(locale, "player.today.currentAssessment")}>
          {currentAssessment ? (
            <div id="current-assessment">
              <div className="font-display text-3xl font-black text-white">{currentAssessment.score}</div>
              <p className="mt-1 text-sm text-smoke-3">
                {t(locale, "player.today.assessmentOn", {
                  type: currentAssessment.type,
                  date: formatShortDate(currentAssessment.date, locale, timeZone),
                })}
              </p>
            </div>
          ) : (
            <p id="current-assessment" className="text-sm text-smoke-3">
              {t(locale, "player.today.noAssessment")}
            </p>
          )}
        </SummaryCard>

        <SummaryCard title={t(locale, "player.today.activeProgram")}>
          {activeProgram ? (
            <div>
              <h2 className="font-display text-lg font-bold text-white">{activeProgram.name}</h2>
              <p className="mt-1 text-xs text-smoke-3">{activeProgram.goal || t(locale, "player.today.noGoal")}</p>
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs text-smoke-4">
                  <span>{t(locale, "player.today.progress")}</span>
                  <span>
                    {activeProgram.progress == null
                      ? t(locale, "player.today.scheduleNotSet")
                      : `${activeProgram.progress}%`}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-red" style={{ width: `${activeProgram.progress ?? 0}%` }} />
                </div>
              </div>
              <p className="mt-3 text-xs text-smoke-3">
                {t(locale, "player.today.nextSession", {
                  session: activeProgram.nextSession
                    ? `${activeProgram.nextSession.title} (${activeProgram.nextSession.day})`
                    : t(locale, "player.today.noSessionsAdded"),
                })}
              </p>
            </div>
          ) : (
            <p className="text-sm text-smoke-3">{t(locale, "player.today.noActiveProgram")}</p>
          )}
        </SummaryCard>
      </div>

      <section className="mb-6 rounded-lg border border-white/5 bg-ink-3 p-4">
        <div className="eyebrow mb-3">{t(locale, "player.today.quickActions")}</div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/player/training" className="btn-ghost !px-3.5 !py-2 text-xs">
            {t(locale, "player.today.openTraining")}
          </Link>
          <Link href="/dashboard/player/check-in" className="btn-ghost !px-3.5 !py-2 text-xs">
            {t(locale, "player.today.completeCheckIn")}
          </Link>
          <a href="#current-assessment" className="btn-ghost !px-3.5 !py-2 text-xs">
            {t(locale, "player.today.viewAssessments")}
          </a>
        </div>
      </section>

      <div id="todays-check-in" className="grid gap-4 sm:grid-cols-2">
        <ScoreCard score={log.score} />

        <div className="grid grid-cols-2 gap-3">
          <StatInput
            label={t(locale, "player.today.sleep")}
            unit={t(locale, "player.today.hours")}
            value={log.sleepHours}
            step={0.5}
            max={14}
            accent="#4CAF50"
            onCommit={(v) => patch("sleepHours", v)}
          />
          <StatInput
            label={t(locale, "player.today.water")}
            unit={t(locale, "player.today.liters")}
            value={log.waterLiters}
            step={0.1}
            max={6}
            accent="#FFC107"
            onCommit={(v) => patch("waterLiters", v)}
          />
        </div>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-lg font-bold tracking-wide text-white">
          {t(locale, "player.today.howFeeling")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <WellnessSlider label={t(locale, "player.today.energy")} value={log.energy} color="#4CAF50" onCommit={(v) => patch("energy", v)} />
          <WellnessSlider label={t(locale, "player.today.fatigue")} value={log.fatigue} color="#E02020" onCommit={(v) => patch("fatigue", v)} />
          <WellnessSlider label={t(locale, "player.today.soreness")} value={log.soreness} color="#FFC107" onCommit={(v) => patch("soreness", v)} />
          <WellnessSlider label={t(locale, "player.today.mood")} value={log.mood} color="#2196F3" onCommit={(v) => patch("mood", v)} />
          <WellnessSlider label={t(locale, "player.today.stress")} value={log.stress} color="#E02020" onCommit={(v) => patch("stress", v)} />
          <WellnessSlider
            label={t(locale, "player.today.sleepQuality")}
            value={log.sleepQuality}
            color="#9C27B0"
            onCommit={(v) => patch("sleepQuality", v)}
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-lg font-bold tracking-wide text-white">
          {t(locale, "player.today.todaysTasks")}
        </h2>
        <div className="flex flex-col gap-2">
          {log.tasks.map((task) => (
            <button
              key={task.id}
              onClick={() => toggleTask(task)}
              className="flex items-center gap-3 rounded-md border border-white/5 bg-ink-3 p-3 text-left transition-colors hover:border-line-2"
            >
              <span
                className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] text-[10px]"
                style={{
                  background: task.done ? "#E02020" : "transparent",
                  border: task.done ? "none" : "1.5px solid #444444",
                }}
              >
                {task.done ? "✓" : ""}
              </span>
              <span
                className={`text-sm ${task.done ? "text-white" : "text-smoke-3"}`}
                style={{ textDecoration: task.done ? "none" : "none" }}
              >
                {task.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {coachMessage && (
        <section className="mt-8 rounded-md border border-white/5 bg-ink-3 p-4">
          <div className="eyebrow mb-2">{t(locale, "player.today.coachMessage")}</div>
          <p className="text-sm leading-relaxed text-white">{coachMessage}</p>
        </section>
      )}
    </div>
  );
}
