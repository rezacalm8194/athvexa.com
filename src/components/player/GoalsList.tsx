"use client";

import { useEffect, useState } from "react";

type Goal = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  targetDate: string | null;
  progress: number;
  status: "ACTIVE" | "DONE" | "ARCHIVED";
};

const CATEGORIES = ["Performance", "Fitness", "Skill", "Team"];

export default function GoalsList() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [targetDate, setTargetDate] = useState("");

  useEffect(() => {
    fetch("/api/player/goals")
      .then((r) => r.json())
      .then((data) => {
        setGoals(data.goals);
        setLoading(false);
      });
  }, []);

  async function createGoal() {
    if (!title.trim()) return;
    const res = await fetch("/api/player/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, category, targetDate: targetDate || undefined }),
    });
    const data = await res.json();
    setGoals((prev) => [data.goal, ...prev]);
    setTitle("");
    setDescription("");
    setCategory(CATEGORIES[0]);
    setTargetDate("");
    setShowForm(false);
  }

  async function setProgress(goal: Goal, progress: number) {
    setGoals((prev) =>
      prev.map((g) => (g.id === goal.id ? { ...g, progress, status: progress >= 100 ? "DONE" : "ACTIVE" } : g))
    );
    await fetch(`/api/player/goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progress }),
    });
  }

  async function archive(goal: Goal) {
    setGoals((prev) => prev.filter((g) => g.id !== goal.id));
    await fetch(`/api/player/goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ARCHIVED" }),
    });
  }

  const active = goals.filter((g) => g.status === "ACTIVE");
  const done = goals.filter((g) => g.status === "DONE");

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="eyebrow">Phase 2</div>
          <h1 className="font-display text-3xl font-extrabold tracking-wide text-white">Goals</h1>
        </div>
        <button className="btn-primary !px-4 !py-2 text-xs" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "+ New goal"}
        </button>
      </div>

      {showForm && (
        <div className="card mb-6 p-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Goal — e.g. Run a sub-12s 100m"
            className="input-field mb-3"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notes (optional)"
            rows={2}
            className="input-field mb-3 resize-none"
          />
          <div className="mb-3 flex flex-wrap items-center gap-4">
            <div>
              <div className="eyebrow mb-1.5">Category</div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-md border border-line-1 bg-ink px-2 py-1.5 text-xs text-white outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="eyebrow mb-1.5">Target date</div>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="rounded-md border border-line-1 bg-ink px-2 py-1.5 text-xs text-white outline-none"
              />
            </div>
          </div>
          <button className="btn-primary !px-4 !py-2 text-xs" onClick={createGoal}>
            Create goal
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-smoke-3">Loading goals…</div>
      ) : goals.length === 0 ? (
        <div className="card p-6 text-center text-sm text-smoke-3">
          No goals yet. Set your first target and track progress week to week.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {active.length > 0 && (
            <section className="flex flex-col gap-3">
              {active.map((goal) => (
                <GoalCard key={goal.id} goal={goal} onProgress={setProgress} onArchive={archive} />
              ))}
            </section>
          )}
          {done.length > 0 && (
            <section>
              <h2 className="eyebrow mb-3">Completed</h2>
              <div className="flex flex-col gap-3">
                {done.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} onProgress={setProgress} onArchive={archive} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function GoalCard({
  goal,
  onProgress,
  onArchive,
}: {
  goal: Goal;
  onProgress: (goal: Goal, progress: number) => void;
  onArchive: (goal: Goal) => void;
}) {
  const isDone = goal.status === "DONE";
  return (
    <div className="card group p-4">
      <div className="mb-1 flex items-start justify-between gap-3">
        <div>
          <span className="eyebrow mr-2">{goal.category}</span>
          {goal.targetDate && <span className="text-[10px] text-smoke-3">Due {goal.targetDate}</span>}
          <h3 className={`font-display text-lg font-bold ${isDone ? "text-smoke-3 line-through" : "text-white"}`}>
            {goal.title}
          </h3>
          {goal.description && <p className="mt-0.5 text-xs text-smoke-3">{goal.description}</p>}
        </div>
        <button
          onClick={() => onArchive(goal)}
          className="shrink-0 text-xs text-smoke-3 opacity-0 transition-opacity hover:text-red group-hover:opacity-100"
        >
          Archive
        </button>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-4">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${goal.progress}%`, background: isDone ? "#4CAF50" : "#E02020" }}
          />
        </div>
        <span className="w-10 text-right text-xs font-semibold text-white">{goal.progress}%</span>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={goal.progress}
        onChange={(e) => onProgress(goal, Number(e.target.value))}
        className="mt-2 w-full accent-red"
        aria-label={`${goal.title} progress`}
      />
    </div>
  );
}
