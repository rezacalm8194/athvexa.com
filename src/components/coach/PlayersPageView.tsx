"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import EmptyRosterState from "@/components/coach/EmptyRosterState";
import ErrorState from "@/components/coach/shared/ErrorState";
import StatusBadge from "@/components/coach/shared/StatusBadge";
import StatusFilter from "@/components/coach/shared/StatusFilter";
import { CopyIcon, TelegramIcon, UsersIcon, WhatsAppIcon } from "@/components/icons";

type PlayerStatus = "all" | "ready" | "attention" | "not_checked_in";

type Player = {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
  latestReadiness: number | null;
  latestCheckIn: string | null;
  activeProgram: { id: string; name: string } | null;
  loggedToday: boolean;
  label: string;
  tone: "good" | "warn" | "bad";
};

type CreatedInvite = {
  id: string;
  url: string;
  role: "PLAYER";
  email: string | null;
  expiresAt: string;
};

const STATUS_OPTIONS: { value: PlayerStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "ready", label: "Ready" },
  { value: "attention", label: "Needs attention" },
  { value: "not_checked_in", label: "No check-in" },
];

const EXPIRATION_OPTIONS = [
  { value: 1, label: "24 hours" },
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
];

function formatDate(value: string | null) {
  if (!value) return "No check-in";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function playerStatus(player: Player): PlayerStatus {
  if (!player.latestCheckIn) return "not_checked_in";
  return player.tone === "bad" || player.tone === "warn" ? "attention" : "ready";
}

function inviteMessage(invite: CreatedInvite) {
  return `You're invited to join your team on Athvexa: ${invite.url}`;
}

export default function PlayersPageView({ canManageRoles: _canManageRoles }: { canManageRoles: boolean }) {
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<PlayerStatus>("all");
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(14);
  const [creating, setCreating] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [createdInvite, setCreatedInvite] = useState<CreatedInvite | null>(null);
  const [copied, setCopied] = useState(false);

  function loadPlayers() {
    setError(null);
    fetch("/api/coach/players", { cache: "no-store" })
      .then((res) => res.json().then((payload) => ({ ok: res.ok, payload })))
      .then(({ ok, payload }) => {
        if (!ok) throw new Error(payload.error || "Could not load players");
        setPlayers(payload.players ?? []);
      })
      .catch((err) => {
        setPlayers([]);
        setError(err instanceof Error ? err.message : "Could not load players");
      });
  }

  useEffect(() => {
    loadPlayers();
  }, []);

  function openInvite() {
    setInviteOpen(true);
    setInviteError(null);
    setCreatedInvite(null);
    setCopied(false);
  }

  function closeInvite() {
    setInviteOpen(false);
    setInviteError(null);
    setCreatedInvite(null);
    setCopied(false);
    if (window.location.hash === "#invite-panel") {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }

  async function createInvite(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    setInviteError(null);
    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: "PLAYER",
        email: email.trim() || undefined,
        expiresInDays,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setCreating(false);
    if (!res.ok) {
      setInviteError(data.error || "Could not create invitation");
      return;
    }
    setCreatedInvite({
      id: data.id,
      url: data.url,
      role: "PLAYER",
      email: data.email ?? null,
      expiresAt: data.expiresAt,
    });
  }

  async function copyInvite() {
    if (!createdInvite) return;
    await navigator.clipboard.writeText(createdInvite.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function shareWhatsApp() {
    if (!createdInvite) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(inviteMessage(createdInvite))}`, "_blank");
  }

  function shareTelegram() {
    if (!createdInvite) return;
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(createdInvite.url)}&text=${encodeURIComponent("Athvexa team invitation")}`,
      "_blank"
    );
  }

  const filtered = useMemo(() => {
    if (!players) return null;
    const q = query.trim().toLowerCase();
    return players.filter((player) => {
      const matchesSearch = !q || player.name.toLowerCase().includes(q) || player.email.toLowerCase().includes(q);
      const matchesStatus = status === "all" || playerStatus(player) === status;
      return matchesSearch && matchesStatus;
    });
  }, [players, query, status]);

  if (error) {
    return (
      <div className="card p-5">
        <ErrorState message={error} onRetry={loadPlayers} />
      </div>
    );
  }

  if (players === null) {
    return (
      <div className="card p-5">
        <div className="space-y-3">
          <div className="h-11 animate-pulse rounded-md bg-white/5" />
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-28 animate-pulse rounded-lg bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {players.length === 0 ? (
        <EmptyRosterState teamName={null} onInvite={openInvite} />
      ) : (
        <div className="card p-5">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search players"
                className="input-field sm:max-w-sm"
              />
              <StatusFilter value={status} onChange={setStatus} options={STATUS_OPTIONS} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-white">{players.length} players</span>
              <button type="button" onClick={openInvite} className="btn-primary !px-4 !py-2.5 text-xs">
                Invite player
              </button>
            </div>
          </div>

          {filtered && filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line-1 px-6 py-12 text-center">
              <UsersIcon className="h-7 w-7 text-smoke-4" />
              <p className="font-display text-base font-bold text-white">No players match your search.</p>
              <p className="text-sm text-smoke-3">Try another name, email, or status filter.</p>
            </div>
          ) : null}

          {filtered && filtered.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {filtered.map((player) => (
                <article key={player.id} className="rounded-lg border border-white/5 bg-ink-2 p-4 transition-colors hover:border-white/10">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-red/15 text-sm font-bold text-red">
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h2 className="truncate font-display text-lg font-bold text-white">{player.name}</h2>
                          <p className="truncate text-xs text-smoke-3">{player.email}</p>
                        </div>
                      </div>
                    </div>
                    <StatusBadge
                      label={!player.latestCheckIn ? "No check-in" : player.label}
                      tone={!player.latestCheckIn ? "neutral" : player.tone}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Metric label="Join date" value={formatDate(player.joinedAt)} />
                    <Metric label="Latest readiness" value={player.latestReadiness == null ? "-" : `${player.latestReadiness}/100`} />
                    <Metric label="Latest check-in" value={formatDate(player.latestCheckIn)} />
                    <Metric label="Active program" value={player.activeProgram?.name ?? "None"} />
                  </div>

                  <div className="mt-4 flex justify-end">
                    <a href={`/dashboard/coach/players?playerId=${player.id}`} className="btn-ghost !px-3 !py-2 text-xs">
                      Open player profile
                    </a>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {inviteOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
          <div className="card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 shadow-xl shadow-black/50">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="eyebrow">Invitation</div>
                <h2 className="mt-1 font-display text-2xl font-bold text-white">Invite your first player</h2>
              </div>
              <button type="button" onClick={closeInvite} className="btn-ghost !px-3 !py-2 text-xs">
                Close
              </button>
            </div>

            {!createdInvite ? (
              <form onSubmit={createInvite} className="space-y-4">
                <label className="block">
                  <span className="text-xs font-semibold text-smoke-3">Role</span>
                  <input className="input-field mt-1" value="Player" readOnly />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-smoke-3">Email optional</span>
                  <input
                    className="input-field mt-1"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="player@example.com"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-smoke-3">Expiration time</span>
                  <select
                    className="input-field mt-1"
                    value={expiresInDays}
                    onChange={(event) => setExpiresInDays(Number(event.target.value))}
                  >
                    {EXPIRATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                {inviteError ? <p className="text-sm text-red-glow">{inviteError}</p> : null}
                <button type="submit" className="btn-primary w-full !py-3 text-sm" disabled={creating}>
                  {creating ? "Creating..." : "Create invitation"}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="rounded-md border border-line-1 bg-ink-2 p-3">
                  <span className="text-xs font-semibold text-smoke-3">Full invitation link</span>
                  <code className="mt-2 block break-all text-sm text-white">{createdInvite.url}</code>
                  <p className="mt-2 text-xs text-smoke-4">Expires {formatDate(createdInvite.expiresAt)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={copyInvite} className="btn-ghost !px-3 !py-2 text-xs">
                    <CopyIcon className="mr-1.5 h-4 w-4" />
                    {copied ? "Copied" : "Copy link"}
                  </button>
                  <button type="button" onClick={shareWhatsApp} className="btn-ghost !px-3 !py-2 text-xs">
                    <WhatsAppIcon className="mr-1.5 h-4 w-4" />
                    WhatsApp
                  </button>
                  <button type="button" onClick={shareTelegram} className="btn-ghost !px-3 !py-2 text-xs">
                    <TelegramIcon className="mr-1.5 h-4 w-4" />
                    Telegram
                  </button>
                  <button type="button" onClick={closeInvite} className="btn-primary !px-3 !py-2 text-xs">
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-white/5 bg-ink-3 px-3 py-2">
      <div className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-smoke-3">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-white">{value}</div>
    </div>
  );
}
