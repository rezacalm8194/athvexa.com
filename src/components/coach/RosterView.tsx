"use client";

import { useEffect, useState } from "react";

type MemberRole = "PLAYER" | "ASSISTANT";

type Member = {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  score: number;
  loggedToday: boolean;
  label: string;
  tone: "good" | "warn" | "bad";
};

const toneColor: Record<Member["tone"], string> = {
  good: "#4CAF50",
  warn: "#FFC107",
  bad: "#E02020",
};

export default function RosterView({ coachName, teamName }: { coachName: string; teamName?: string | null }) {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [canManageRoles, setCanManageRoles] = useState(false);
  const [inviteRole, setInviteRole] = useState<MemberRole>("PLAYER");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  function loadRoster() {
    fetch("/api/coach/players")
      .then((r) => r.json())
      .then((data) => {
        setMembers(data.players ?? []);
        setCanManageRoles(Boolean(data.canManageRoles));
      });
  }

  useEffect(() => {
    loadRoster();
  }, []);

  async function generateInvite() {
    setGenerating(true);
    setInviteUrl(null);
    setInviteError(null);
    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: inviteRole }),
    });
    const data = await res.json().catch(() => ({}));
    setGenerating(false);
    if (res.ok) {
      setInviteUrl(data.url);
    } else {
      setInviteError(data.error ?? "Could not generate an invite link. Try again.");
    }
    setCopied(false);
  }

  async function copyInvite() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
  }

  function shareMessage() {
    return inviteRole === "ASSISTANT"
      ? `${coachName} invited you to join their coaching staff on Athvexa: ${inviteUrl}`
      : `${coachName} invited you to join their team on Athvexa: ${inviteUrl}`;
  }

  function sendViaWhatsApp() {
    if (!inviteUrl) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage())}`, "_blank");
  }

  function sendViaTelegram() {
    if (!inviteUrl) return;
    const caption =
      inviteRole === "ASSISTANT"
        ? `${coachName} invited you to join their coaching staff on Athvexa`
        : `${coachName} invited you to join their team on Athvexa`;
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(caption)}`,
      "_blank"
    );
  }

  async function changeRole(id: string, role: MemberRole) {
    setUpdatingId(id);
    const prev = members;
    setMembers((cur) => cur?.map((m) => (m.id === id ? { ...m, role } : m)) ?? cur);
    const res = await fetch(`/api/coach/players/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      setMembers(prev); // revert on failure
    } else {
      loadRoster(); // refresh scores/labels for the new role
    }
    setUpdatingId(null);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="eyebrow">{teamName ?? "Team status"} — today</div>
          <h1 className="font-display text-3xl font-extrabold tracking-wide text-white">
            Welcome back, {coachName.split(" ")[0]}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {canManageRoles && (
            <div className="flex rounded-md border border-line-1 bg-ink-3 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setInviteRole("PLAYER")}
                className={`rounded px-3 py-1.5 font-medium transition-colors ${
                  inviteRole === "PLAYER" ? "bg-red text-white" : "text-smoke-3 hover:text-white"
                }`}
              >
                Player
              </button>
              <button
                type="button"
                onClick={() => setInviteRole("ASSISTANT")}
                className={`rounded px-3 py-1.5 font-medium transition-colors ${
                  inviteRole === "ASSISTANT" ? "bg-red text-white" : "text-smoke-3 hover:text-white"
                }`}
              >
                Assistant
              </button>
            </div>
          )}
          <button onClick={generateInvite} className="btn-primary !px-4 !py-2.5 text-xs" disabled={generating}>
            {generating ? "Generating…" : `Invite a${inviteRole === "ASSISTANT" ? "n assistant" : " player"}`}
          </button>
        </div>
      </div>

      {inviteError && (
        <p className="mb-4 text-sm text-red-glow">{inviteError}</p>
      )}

      {inviteUrl && (
        <div className="mb-6 flex flex-col gap-3 rounded-md border border-red/40 bg-ink-3 p-3">
          <div className="flex items-center justify-between gap-3">
            <code className="truncate text-xs text-smoke-4">{inviteUrl}</code>
            <button onClick={copyInvite} className="btn-ghost !px-3 !py-1.5 text-xs shrink-0">
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={sendViaWhatsApp} className="btn-ghost !px-3 !py-1.5 text-xs">
              Send via WhatsApp
            </button>
            <button onClick={sendViaTelegram} className="btn-ghost !px-3 !py-1.5 text-xs">
              Send via Telegram
            </button>
          </div>
        </div>
      )}

      {!members && <div className="text-sm text-smoke-3">Loading roster…</div>}

      {members && members.length === 0 && (
        <div className="card p-8 text-center">
          <p className="font-display text-lg font-bold text-white">No players yet</p>
          <p className="mt-1 text-sm text-smoke-3">
            Send your invite link to get your first player set up.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {members?.map((m) => (
          <div key={m.id} className="flex items-center gap-3 rounded-md border border-white/5 bg-ink-3 p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-red/15 text-xs font-bold text-red">
              {m.name.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">{m.name}</span>
                {m.role === "ASSISTANT" && (
                  <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-smoke-3">
                    Assistant
                  </span>
                )}
              </div>
              <div
                className="text-[11px]"
                style={{ color: m.role === "ASSISTANT" ? "#8a8f98" : toneColor[m.tone] }}
              >
                {m.role === "ASSISTANT" ? m.email : m.loggedToday ? m.label : "Not logged today"}
              </div>
            </div>
            {m.role === "PLAYER" && (
              <div className="font-display text-2xl font-black text-white">
                {m.loggedToday ? m.score : "—"}
              </div>
            )}
            {canManageRoles && (
              <select
                value={m.role}
                disabled={updatingId === m.id}
                onChange={(e) => changeRole(m.id, e.target.value as MemberRole)}
                className="rounded border border-line-1 bg-ink-2 px-2 py-1.5 text-xs text-smoke-3 disabled:opacity-50"
              >
                <option value="PLAYER">Player</option>
                <option value="ASSISTANT">Assistant</option>
              </select>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
