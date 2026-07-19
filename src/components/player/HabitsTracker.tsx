"use client";

import { useEffect, useMemo, useState } from "react";
import { WEEKDAY_LABELS, mondayOf, toKey, todayKey } from "@/lib/week";

type Habit = {
  id: string;
  name: string;
  icon: string;
  color: string;
  targetDays: number;
  logs: { date: string }[];
};

const ICON_CHOICES = ["💧", "🏃", "🥗", "😴", "🧘", "🩹", "📚", "🦵"];
const COLOR_CHOICES = ["#4CAF50", "#FFC107", "#2196F3", "#E02020", "#9C27B0", "#00BCD4"];

export default function HabitsTracker() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(ICON_CHOICES[0]);
  const [color, setColor] = useState(COLOR_CHOICES[0]);
  const [targetDays, setTargetDays] = useState(7);
  const weekKey = toKey(mondayOf());

  function load() {
    setLoading(true);
    fetch(`/api/player/habits?week=${weekKey}`)
      .then((r) => r.json())
      .then((data) => {
        setHabits(data.habits);
        setDates(data.dates);
        setLoading(false);
      });
  }

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const today = todayKey();

  async function toggle(habit: Habit, date: string) {
    const has = habit.logs.some((l) => l.date === date);
    setHabits((prev) =>
      prev.map((h) =>
        h.id === habit.id
          ? { ...h, logs: has ? h.logs.filter((l) => l.date !== date) : [...h.logs, { date }] }
          : h
      )
    );
    await fetch(`/api/player/habits/${habit.id}/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date }),
    });
  }

  async function archive(habit: Habit) {
    setHabits((prev) => prev.filter((h) => h.id !== habit.id));
    await fetch(`/api/player/habits/${habit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: false }),
    });
  }

  async function createHabit() {
    if (!name.trim()) return;
    const res = await fetch("/api/player/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, icon, color, targetDays }),
    });
    const data = await res.json();
    setHabits((prev) => [...prev, data.habit]);
    setName("");
    setIcon(ICON_CHOICES[0]);
    setColor(COLOR_CHOICES[0]);
    setTargetDays(7);
    setShowForm(false);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="eyebrow">Phase 2</div>
          <h1 className="font-display text-3xl font-extrabold tracking-wide text-white">Habits</h1>
        </div>
        <button className="btn-primary !px-4 !py-2 text-xs" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "+ New habit"}
        </button>
      </div>

      {showForm && (
        <div className="card mb-6 p-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Habit name — e.g. Drink 3L water"
            className="input-field mb-3"
          />
          <div className="mb-3 flex flex-wrap items-center gap-4">
            <div>
              <div className="eyebrow mb-1.5">Icon</div>
              <div className="flex gap-1.5">
                {ICON_CHOICES.map((i) => (
                  <button
                    key={i}
                    onClick={() => setIcon(i)}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-base"
                    style={{ background: icon === i ? "#2E2E2E" : "transparent", border: "1px solid #2E2E2E" }}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="eyebrow mb-1.5">Color</div>
              <div className="flex gap-1.5">
                {COLOR_CHOICES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    aria-label={c}
                    className="h-8 w-8 rounded-md"
                    style={{ background: c, outline: color === c ? "2px solid white" : "none", outlineOffset: 2 }}
                  />
                ))}
              </div>
            </div>
            <div>
              <div className="eyebrow mb-1.5">Times / week: {targetDays}</div>
              <input
                type="range"
                min={1}
                max={7}
                value={targetDays}
                onChange={(e) => setTargetDays(Number(e.target.value))}
                className="w-32 accent-red"
              />
            </div>
          </div>
          <button className="btn-primary !px-4 !py-2 text-xs" onClick={createHabit}>
            Create habit
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-smoke-3">Loading habits…</div>
      ) : habits.length === 0 ? (
        <div className="card p-6 text-center text-sm text-smoke-3">
          No habits yet. Add your first one — small daily wins add up.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {habits.map((habit) => {
            const doneCount = habit.logs.length;
            const met = doneCount >= habit.targetDays;
            return (
              <div key={habit.id} className="card group p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{habit.icon}</span>
                    <span className="text-sm font-semibold text-white">{habit.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="text-xs font-semibold"
                      style={{ color: met ? habit.color : "#888888" }}
                    >
                      {doneCount}/{habit.targetDays} this week
                    </span>
                    <button
                      onClick={() => archive(habit)}
                      className="text-xs text-smoke-3 opacity-0 transition-opacity hover:text-red group-hover:opacity-100"
                    >
                      Archive
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  {dates.map((date, i) => {
                    const done = habit.logs.some((l) => l.date === date);
                    const isFuture = date > today;
                    return (
                      <button
                        key={date}
                        disabled={isFuture}
                        onClick={() => toggle(habit, date)}
                        className="flex flex-1 flex-col items-center gap-1 disabled:opacity-30"
                      >
                        <span className="text-[9px] uppercase text-smoke-3">{WEEKDAY_LABELS[i]}</span>
                        <span
                          className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors"
                          style={{
                            background: done ? habit.color : "#1A1A1A",
                            border: done ? "none" : "1.5px solid #2E2E2E",
                            color: done ? "#0A0A0A" : "#888888",
                          }}
                        >
                          {done ? "✓" : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
