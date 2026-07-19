"use client";

import { useEffect, useState } from "react";

type Player = {
  id: string;
  name: string;
  email: string;
  score: number;
  loggedToday: boolean;
  label: string;
  tone: "good" | "warn" | "bad";
};

const toneColor: Record<Player["tone"], string> = {
  good: "#4CAF50",
  warn: "#FFC107",
  bad: "#E02020",
};

export default function RosterView({ coachName }: { coachName: string }) {
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetch("/api/coach/players")
      .then((r) => r.json())
      .then((data) => setPlayers(data.players));
  }, []);

  async function generateInvite() {
    setGenerating(true);
    const res = await fetch("/api/invite", { method: "POST" });
    const data = await res.json();
    setGenerating(false);
    setInviteUrl(data.url);
    setCopied(false);
  }

  async function copyInvite() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="eyebrow">Team status — today</div>
          <h1 className="font-display text-3xl font-extrabold tracking-wide text-white">
            Welcome back, {coachName.split(" ")[0]}
          </h1>
        </div>
        <button onClick={generateInvite} className="btn-primary !px-4 !py-2.5 text-xs" disabled={generating}>
          {generating ? "Generating…" : "Invite a player"}
        </button>
      </div>

      {inviteUrl && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-md border border-red/40 bg-ink-3 p-3">
          <code className="truncate text-xs text-smoke-4">{inviteUrl}</code>
          <button onClick={copyInvite} className="btn-ghost !px-3 !py-1.5 text-xs shrink-0">
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      )}

      {!players && <div className="text-sm text-smoke-3">Loading roster…</div>}

      {players && players.length === 0 && (
        <div className="card p-8 text-center">
          <p className="font-display text-lg font-bold text-white">No players yet</p>
          <p className="mt-1 text-sm text-smoke-3">
            Send your invite link to get your first player set up.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {players?.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 rounded-md border border-white/5 bg-ink-3 p-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-red/15 text-xs font-bold text-red">
              {p.name.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-white">{p.name}</div>
              <div className="text-[11px]" style={{ color: toneColor[p.tone] }}>
                {p.loggedToday ? p.label : "Not logged today"}
              </div>
            </div>
            <div className="font-display text-2xl font-black text-white">{p.loggedToday ? p.score : "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
