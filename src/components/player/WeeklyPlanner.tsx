"use client";

import { useEffect, useMemo, useState } from "react";
import { WEEKDAY_LABELS, addDays, mondayOf, shortLabel, toKey, todayKey } from "@/lib/week";

type PlanItem = {
  id: string;
  date: string;
  label: string;
  category: string;
  done: boolean;
  order: number;
};

const CATEGORIES: { name: string; color: string }[] = [
  { name: "Training", color: "#4CAF50" },
  { name: "Gym", color: "#FFC107" },
  { name: "Match", color: "#E02020" },
  { name: "Recovery", color: "#2196F3" },
  { name: "Rest", color: "#9C27B0" },
  { name: "Other", color: "#888888" },
];

function categoryColor(name: string) {
  return CATEGORIES.find((c) => c.name === name)?.color ?? "#888888";
}

export default function WeeklyPlanner() {
  const [weekKey, setWeekKey] = useState(() => toKey(mondayOf()));
  const [dates, setDates] = useState<string[]>([]);
  const [items, setItems] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [draftCategory, setDraftCategory] = useState<Record<string, string>>({});

  useEffect(() => {
    setLoading(true);
    fetch(`/api/player/planner?week=${weekKey}`)
      .then((r) => r.json())
      .then((data) => {
        setDates(data.dates);
        setItems(data.items);
        setLoading(false);
      });
  }, [weekKey]);

  const byDate = useMemo(() => {
    const map: Record<string, PlanItem[]> = {};
    for (const d of dates) map[d] = [];
    for (const item of items) (map[item.date] ??= []).push(item);
    return map;
  }, [items, dates]);

  async function addItem(date: string) {
    const label = (draft[date] ?? "").trim();
    if (!label) return;
    const category = draftCategory[date] ?? "Training";
    setDraft((d) => ({ ...d, [date]: "" }));
    const res = await fetch("/api/player/planner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, label, category }),
    });
    const data = await res.json();
    setItems((prev) => [...prev, data.item]);
  }

  async function toggle(item: PlanItem) {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)));
    await fetch(`/api/player/planner/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !item.done }),
    });
  }

  async function remove(item: PlanItem) {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    await fetch(`/api/player/planner/${item.id}`, { method: "DELETE" });
  }

  const isCurrentWeek = weekKey === toKey(mondayOf());

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="eyebrow">Phase 2</div>
          <h1 className="font-display text-3xl font-extrabold tracking-wide text-white">
            Weekly Planner
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost !px-3 !py-2 text-xs" onClick={() => setWeekKey(addDays(weekKey, -7))}>
            ← Prev
          </button>
          <button
            className="btn-ghost !px-3 !py-2 text-xs disabled:opacity-40"
            disabled={isCurrentWeek}
            onClick={() => setWeekKey(toKey(mondayOf()))}
          >
            This week
          </button>
          <button className="btn-ghost !px-3 !py-2 text-xs" onClick={() => setWeekKey(addDays(weekKey, 7))}>
            Next →
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-smoke-3">Loading the week…</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {dates.map((date, i) => {
            const dayItems = (byDate[date] ?? []).sort((a, b) => a.order - b.order);
            const isToday = date === todayKey();
            return (
              <div
                key={date}
                className={`flex min-w-0 flex-col rounded-lg border p-3 ${
                  isToday ? "border-red/40 bg-ink-3" : "border-white/5 bg-ink-3"
                }`}
              >
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="eyebrow">{WEEKDAY_LABELS[i]}</span>
                  <span className={`text-xs ${isToday ? "font-semibold text-red" : "text-smoke-3"}`}>
                    {shortLabel(date)}
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-1.5">
                  {dayItems.length === 0 && (
                    <div className="py-2 text-xs text-smoke-3">Nothing planned</div>
                  )}
                  {dayItems.map((item) => (
                    <div
                      key={item.id}
                      className="group flex items-start gap-2 rounded-md border border-white/5 bg-ink-2 p-2"
                    >
                      <button
                        onClick={() => toggle(item)}
                        aria-label={item.done ? "Mark not done" : "Mark done"}
                        className="mt-0.5 flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-[4px] text-[9px]"
                        style={{
                          background: item.done ? categoryColor(item.category) : "transparent",
                          border: item.done ? "none" : "1.5px solid #444444",
                        }}
                      >
                        {item.done ? "✓" : ""}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div
                          className={`truncate text-xs leading-snug ${
                            item.done ? "text-smoke-3 line-through" : "text-white"
                          }`}
                        >
                          {item.label}
                        </div>
                        <span
                          className="mt-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                          style={{
                            color: categoryColor(item.category),
                            background: `${categoryColor(item.category)}1a`,
                          }}
                        >
                          {item.category}
                        </span>
                      </div>
                      <button
                        onClick={() => remove(item)}
                        aria-label="Delete item"
                        className="shrink-0 text-smoke-3 opacity-0 transition-opacity hover:text-red group-hover:opacity-100"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-2 flex flex-col gap-1.5 border-t border-white/5 pt-2">
                  <input
                    value={draft[date] ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, [date]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && addItem(date)}
                    placeholder="Add item…"
                    className="w-full rounded-md border border-line-1 bg-ink px-2 py-1.5 text-xs text-white placeholder:text-smoke-3 outline-none focus:border-red"
                  />
                  <div className="flex items-center gap-1.5">
                    <select
                      value={draftCategory[date] ?? "Training"}
                      onChange={(e) => setDraftCategory((d) => ({ ...d, [date]: e.target.value }))}
                      className="flex-1 rounded-md border border-line-1 bg-ink px-1.5 py-1 text-[10px] text-smoke-4 outline-none"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => addItem(date)}
                      className="rounded-md bg-red px-2 py-1 text-[10px] font-semibold text-white transition-colors hover:bg-red-glow"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
