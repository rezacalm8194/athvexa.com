"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import EmptyRosterState from "@/components/coach/EmptyRosterState";
import ErrorState from "@/components/coach/shared/ErrorState";
import StatusBadge from "@/components/coach/shared/StatusBadge";
import StatusFilter from "@/components/coach/shared/StatusFilter";
import { CopyIcon, TelegramIcon, UsersIcon, WhatsAppIcon } from "@/components/icons";
import { coachPlayerProfileHref } from "@/lib/coachRoutes";
import { t, type Locale } from "@/lib/i18n";

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
  role: "PLAYER" | "ASSISTANT" | "COACH";
  email: string | null;
  phone: string | null;
  expiresAt: string;
};

function formatDate(value: string | null, locale: Locale, emptyLabel: string) {
  if (!value) return emptyLabel;
  return new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function playerStatus(player: Player): PlayerStatus {
  if (!player.loggedToday) return "not_checked_in";
  return player.tone === "bad" || player.tone === "warn" ? "attention" : "ready";
}

export default function PlayersPageView({
  canManageRoles: _canManageRoles,
  locale,
}: {
  canManageRoles: boolean;
  locale: Locale;
}) {
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<PlayerStatus>("all");
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [inviteRole, setInviteRole] = useState<"PLAYER" | "ASSISTANT" | "COACH">("PLAYER");
  const [expiration, setExpiration] = useState("14");
  const [customExpiresAt, setCustomExpiresAt] = useState("");
  const [creating, setCreating] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [createdInvite, setCreatedInvite] = useState<CreatedInvite | null>(null);
  const [copied, setCopied] = useState(false);

  const statusOptions: { value: PlayerStatus; label: string }[] = [
    { value: "all", label: t(locale, "coach.players.filterAll") },
    { value: "ready", label: t(locale, "coach.players.filterReady") },
    { value: "attention", label: t(locale, "coach.players.filterAttention") },
    { value: "not_checked_in", label: t(locale, "coach.players.filterNoCheckIn") },
  ];

  const expirationOptions = [
    { value: 1, label: t(locale, "coach.invite.exp24h") },
    { value: 7, label: t(locale, "coach.invite.exp7d") },
    { value: 14, label: t(locale, "coach.invite.exp14d") },
    { value: 30, label: t(locale, "coach.invite.exp30d") },
  ];

  function loadPlayers() {
    setError(null);
    fetch("/api/coach/players", { cache: "no-store" })
      .then((res) => res.json().then((payload) => ({ ok: res.ok, payload })))
      .then(({ ok, payload }) => {
        if (!ok) throw new Error(payload.error || t(locale, "coach.players.loadError"));
        setPlayers(payload.players ?? []);
      })
      .catch((err) => {
        setPlayers([]);
        setError(err instanceof Error ? err.message : t(locale, "coach.players.loadError"));
      });
  }

  useEffect(() => {
    loadPlayers();
  }, [locale]);

  useEffect(() => {
    if (window.location.hash === "#invite-panel") {
      openInvite();
    }
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
        role: inviteRole,
        email: email.trim() || undefined,
        phone: phone.trim().replace(/[\s()-]/g, "") || undefined,
        ...(expiration === "custom"
          ? { expiresAt: new Date(customExpiresAt).toISOString() }
          : { expiresInDays: Number(expiration) }),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setCreating(false);
    if (!res.ok) {
      setInviteError(data.error || t(locale, "coach.invite.createError"));
      return;
    }
    setCreatedInvite({
      id: data.id,
      url: data.url,
      role: data.role,
      email: data.email ?? null,
      phone: data.phone ?? null,
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
    const recipient = createdInvite.phone?.replace(/\D/g, "") ?? "";
    const message = t(locale, "coach.invite.inviteMessage", { url: createdInvite.url });
    window.open(`https://wa.me/${recipient}?text=${encodeURIComponent(message)}`, "_blank");
  }

  function shareTelegram() {
    if (!createdInvite) return;
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(createdInvite.url)}&text=${encodeURIComponent(t(locale, "coach.invite.telegramCaption"))}`,
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
        <ErrorState locale={locale} message={error} onRetry={loadPlayers} />
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
        <EmptyRosterState teamName={null} locale={locale} onInvite={openInvite} />
      ) : (
        <div className="card p-5">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t(locale, "coach.players.search")}
                className="input-field sm:max-w-sm"
              />
              <StatusFilter value={status} onChange={setStatus} options={statusOptions} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-white">{t(locale, "coach.players.count", { count: players.length })}</span>
              <button type="button" onClick={openInvite} className="btn-primary !px-4 !py-2.5 text-xs">
                {t(locale, "coach.players.invitePlayer")}
              </button>
            </div>
          </div>

          {filtered && filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line-1 px-6 py-12 text-center">
              <UsersIcon className="h-7 w-7 text-smoke-4" />
              <p className="font-display text-base font-bold text-white">{t(locale, "coach.players.noMatchTitle")}</p>
              <p className="text-sm text-smoke-3">{t(locale, "coach.players.noMatchBody")}</p>
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
                      label={!player.latestCheckIn ? t(locale, "coach.players.noCheckIn") : player.label}
                      tone={!player.latestCheckIn ? "neutral" : player.tone}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Metric label={t(locale, "coach.players.joinDate")} value={formatDate(player.joinedAt, locale, t(locale, "coach.players.noCheckIn"))} />
                    <Metric label={t(locale, "coach.players.latestReadiness")} value={player.latestReadiness == null ? "-" : `${player.latestReadiness}/100`} />
                    <Metric label={t(locale, "coach.players.latestCheckIn")} value={formatDate(player.latestCheckIn, locale, t(locale, "coach.players.noCheckIn"))} />
                    <Metric label={t(locale, "coach.players.activeProgram")} value={player.activeProgram?.name ?? t(locale, "coach.players.none")} />
                  </div>

                  <div className="mt-4 flex justify-end">
                    <Link href={coachPlayerProfileHref(player.id)} className="btn-ghost !px-3 !py-2 text-xs">
                      {t(locale, "coach.players.openProfile")}
                    </Link>
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
                <div className="eyebrow">{t(locale, "coach.invite.eyebrow")}</div>
                <h2 className="mt-1 font-display text-2xl font-bold text-white">{t(locale, "coach.invite.title")}</h2>
              </div>
              <button type="button" onClick={closeInvite} className="btn-ghost !px-3 !py-2 text-xs">
                {t(locale, "coach.invite.close")}
              </button>
            </div>

            {!createdInvite ? (
              <form onSubmit={createInvite} className="space-y-4">
                <label className="block">
                  <span className="text-xs font-semibold text-smoke-3">{t(locale, "coach.invite.role")}</span>
                  <select
                    className="input-field mt-1"
                    value={inviteRole}
                    onChange={(event) => setInviteRole(event.target.value as "PLAYER" | "ASSISTANT" | "COACH")}
                  >
                    <option value="PLAYER">{t(locale, "coach.invite.player")}</option>
                    {_canManageRoles ? <option value="ASSISTANT">{t(locale, "coach.invite.assistant")}</option> : null}
                    {_canManageRoles ? <option value="COACH">{t(locale, "coach.invite.coach")}</option> : null}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-smoke-3">{t(locale, "coach.invite.phoneOptional")}</span>
                  <input
                    className="input-field mt-1"
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+989121234567"
                    autoComplete="tel"
                  />
                  <span className="mt-1 block text-xs text-smoke-4">{t(locale, "coach.invite.phoneHint")}</span>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-smoke-3">{t(locale, "coach.invite.emailOptional")}</span>
                  <input
                    className="input-field mt-1"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="player@example.com"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-smoke-3">{t(locale, "coach.invite.expiration")}</span>
                  <select
                    className="input-field mt-1"
                    value={expiration}
                    onChange={(event) => setExpiration(event.target.value)}
                  >
                    {expirationOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                    <option value="custom">{t(locale, "coach.invite.expCustom")}</option>
                  </select>
                </label>
                {expiration === "custom" ? (
                  <label className="block">
                    <span className="text-xs font-semibold text-smoke-3">{t(locale, "coach.invite.customExpiration")}</span>
                    <input
                      className="input-field mt-1"
                      type="datetime-local"
                      value={customExpiresAt}
                      min={new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 16)}
                      onChange={(event) => setCustomExpiresAt(event.target.value)}
                      required
                    />
                    <span className="mt-1 block text-xs text-smoke-4">{t(locale, "coach.invite.customExpirationHint")}</span>
                  </label>
                ) : null}
                {inviteError ? <p className="text-sm text-red-glow">{inviteError}</p> : null}
                <button type="submit" className="btn-primary w-full !py-3 text-sm" disabled={creating}>
                  {creating ? t(locale, "coach.invite.creating") : t(locale, "coach.invite.create")}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="rounded-md border border-line-1 bg-ink-2 p-3">
                  <span className="text-xs font-semibold text-smoke-3">{t(locale, "coach.invite.fullLink")}</span>
                  <code className="mt-2 block break-all text-sm text-white">{createdInvite.url}</code>
                  <p className="mt-2 text-xs text-smoke-4">
                    {t(locale, "coach.invite.expires", {
                      date: formatDate(createdInvite.expiresAt, locale, t(locale, "coach.players.noCheckIn")),
                    })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={copyInvite} className="btn-ghost !px-3 !py-2 text-xs">
                    <CopyIcon className="mr-1.5 h-4 w-4" />
                    {copied ? t(locale, "coach.invite.copied") : t(locale, "coach.invite.copyLink")}
                  </button>
                  <button type="button" onClick={shareWhatsApp} className="btn-ghost !px-3 !py-2 text-xs">
                    <WhatsAppIcon className="mr-1.5 h-4 w-4" />
                    {t(locale, "coach.invite.whatsapp")}
                  </button>
                  <button type="button" onClick={shareTelegram} className="btn-ghost !px-3 !py-2 text-xs">
                    <TelegramIcon className="mr-1.5 h-4 w-4" />
                    {t(locale, "coach.invite.telegram")}
                  </button>
                  <button type="button" onClick={closeInvite} className="btn-primary !px-3 !py-2 text-xs">
                    {t(locale, "coach.invite.close")}
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
