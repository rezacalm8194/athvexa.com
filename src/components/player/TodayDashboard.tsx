"use client";

import { useEffect, useState } from "react";
import ScoreCard from "./ScoreCard";
import StatInput from "./StatInput";
import WellnessSlider from "./WellnessSlider";

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

export default function TodayDashboard({ playerName }: { playerName: string }) {
  const [log, setLog] = useState<Log | null>(null);
  const [coachMessage, setCoachMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/player/today")
      .then((r) => r.json())
      .then((data) => {
        setLog(data.log);
        setCoachMessage(data.coachMessage);
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
    return <div className="p-8 text-sm text-smoke-3">Loading today's dashboard…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6">
        <div className="eyebrow">Today</div>
        <h1 className="font-display text-3xl font-extrabold tracking-wide text-white">
          Hey {playerName.split(" ")[0]}, here's your day
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ScoreCard score={log.score} />

        <div className="grid grid-cols-2 gap-3">
          <StatInput
            label="Sleep"
            unit="hours"
            value={log.sleepHours}
            step={0.5}
            max={14}
            accent="#4CAF50"
            onCommit={(v) => patch("sleepHours", v)}
          />
          <StatInput
            label="Water"
            unit="liters"
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
          How are you feeling?
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <WellnessSlider label="Energy" value={log.energy} color="#4CAF50" onCommit={(v) => patch("energy", v)} />
          <WellnessSlider label="Fatigue" value={log.fatigue} color="#E02020" onCommit={(v) => patch("fatigue", v)} />
          <WellnessSlider label="Soreness" value={log.soreness} color="#FFC107" onCommit={(v) => patch("soreness", v)} />
          <WellnessSlider label="Mood" value={log.mood} color="#2196F3" onCommit={(v) => patch("mood", v)} />
          <WellnessSlider label="Stress" value={log.stress} color="#E02020" onCommit={(v) => patch("stress", v)} />
          <WellnessSlider
            label="Sleep quality"
            value={log.sleepQuality}
            color="#9C27B0"
            onCommit={(v) => patch("sleepQuality", v)}
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-lg font-bold tracking-wide text-white">
          Today's tasks
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
          <div className="eyebrow mb-2">Coach message</div>
          <p className="text-sm leading-relaxed text-white">{coachMessage}</p>
        </section>
      )}
    </div>
  );
}
