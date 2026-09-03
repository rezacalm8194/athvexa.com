"use client";

import { useEffect, useMemo, useState } from "react";
import KpiCard from "@/components/coach/KpiCard";
import ConfirmModal from "@/components/coach/shared/ConfirmModal";
import EmptyState from "@/components/coach/shared/EmptyState";
import ErrorState from "@/components/coach/shared/ErrorState";
import { SkeletonRows } from "@/components/coach/shared/LoadingSkeleton";
import { useToast } from "@/components/ui/Toast";
import { shortenUrlForDisplay } from "@/lib/invites";
import {
  AlertIcon,
  CheckCircleIcon,
  CopyIcon,
  MailIcon,
  PlusIcon,
  RefreshIcon,
  TelegramIcon,
  TrashIcon,
  UsersIcon,
  WhatsAppIcon,
} from "@/components/icons";
import { t, type Locale } from "@/lib/i18n";

type InviteRole = "PLAYER" | "ASSISTANT" | "COACH";
type RoleFilter = "all" | InviteRole;
type InviteStatusValue = "pending" | "accepted" | "revoked" | "expired";
type StatusFilter = "all" | InviteStatusValue;

type Invite = {
  id: string;
  role: InviteRole;
  url: string;
  status: InviteStatusValue;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  maxUses: number;
  useCount: number;
  email: string | null;
  phone: string | null;
  acceptedUser: { id: string; name: string; email: string } | null;
};

type InviteMode = "single" | "bulk" | "link";
type BulkSummary = { created: number; duplicate: number; invalid: number };

type InviteResponse = {
  invites: Invite[];
  kpis: Record<InviteStatusValue, number>;
};

const STATUS_STYLE: Record<InviteStatusValue, string> = {
  pending: "bg-[#FFC107]/15 text-[#FFC107]",
  accepted: "bg-[#4CAF50]/15 text-[#80D987]",
  revoked: "bg-white/10 text-smoke-3",
  expired: "bg-red/15 text-red-glow",
};

const emptyKpis: Record<InviteStatusValue, number> = {
  pending: 0,
  accepted: 0,
  expired: 0,
  revoked: 0,
};

function formatDateTime(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function expiryLabel(value: string, locale: Locale) {
  const now = new Date();
  const expires = new Date(value);
  const diffDays = Math.ceil((expires.getTime() - now.getTime()) / 86_400_000);
  if (diffDays >= 0) {
    if (diffDays === 0) return t(locale, "coach.invitations.expiresSoon");
    return t(locale, "coach.invitations.expiresIn", {
      count: diffDays,
      unit: diffDays === 1 ? t(locale, "coach.invitations.day") : t(locale, "coach.invitations.days"),
    });
  }
  const daysAgo = Math.abs(diffDays);
  return t(locale, "coach.invitations.expiredAgo", {
    count: daysAgo,
    unit: daysAgo === 1 ? t(locale, "coach.invitations.day") : t(locale, "coach.invitations.days"),
  });
}

export default function InvitationsPageView({
  coachName,
  canManageRoles,
  locale,
}: {
  coachName: string;
  canManageRoles: boolean;
  locale: Locale;
}) {
  const { showToast } = useToast();
  const statusLabel: Record<InviteStatusValue, string> = {
    pending: t(locale, "coach.invitations.pending"),
    accepted: t(locale, "coach.invitations.accepted"),
    revoked: t(locale, "coach.invitations.revoked"),
    expired: t(locale, "coach.invitations.expired"),
  };
  const roleLabelMap: Record<InviteRole, string> = {
    PLAYER: t(locale, "coach.invite.player"),
    ASSISTANT: t(locale, "coach.invite.assistant"),
    COACH: t(locale, "coach.invite.coach"),
  };
  const [data, setData] = useState<InviteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRole>("PLAYER");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteMode, setInviteMode] = useState<InviteMode>("single");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [expiration, setExpiration] = useState("14");
  const [customExpiresAt, setCustomExpiresAt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [bulkContacts, setBulkContacts] = useState("");
  const [bulkSummary, setBulkSummary] = useState<BulkSummary | null>(null);
  const [groupCapacity, setGroupCapacity] = useState("25");
  const [createdGroupInvite, setCreatedGroupInvite] = useState<{ url: string; maxUses: number } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<Invite | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (roleFilter !== "all") params.set("role", roleFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search.trim()) params.set("search", search.trim());
    return params.toString();
  }, [roleFilter, search, statusFilter]);

  const loadInvites = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/coach/invites?${queryString}`, { cache: "no-store" });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || t(locale, "coach.invitations.loadError"));
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "coach.invitations.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInvites();
  }, [queryString]);

  const invites = data?.invites ?? [];
  const kpis = data?.kpis ?? emptyKpis;
  const hasFilters = roleFilter !== "all" || statusFilter !== "all" || search.trim() !== "";

  async function createInvite(event?: React.FormEvent) {
    event?.preventDefault();
    setGenerating(true);
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: inviteRole,
          email: inviteEmail.trim() || undefined,
          phone: invitePhone.trim().replace(/[\s()-]/g, "") || undefined,
          ...(expiration === "custom"
            ? { expiresAt: new Date(customExpiresAt).toISOString() }
            : { expiresInDays: Number(expiration) }),
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || t(locale, "coach.invite.createError"));
      showToast(t(locale, "coach.invitations.created"));
      setInviteOpen(false);
      setInviteEmail("");
      setInvitePhone("");
      await loadInvites();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t(locale, "coach.invite.createError"), "error");
    } finally {
      setGenerating(false);
    }
  }

  function expirationPayload() {
    return expiration === "custom"
      ? { expiresAt: new Date(customExpiresAt).toISOString() }
      : { expiresInDays: Number(expiration) };
  }

  async function createBulkInvites(event: React.FormEvent) {
    event.preventDefault();
    const contacts = bulkContacts
      .split(/[\n,;\t]+/)
      .map((value) => value.trim())
      .filter(Boolean);
    if (contacts.length === 0) {
      showToast(t(locale, "coach.invitations.bulkNeedContact"), "error");
      return;
    }
    setGenerating(true);
    setBulkSummary(null);
    try {
      const res = await fetch("/api/invite/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts, ...expirationPayload() }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || t(locale, "coach.invitations.bulkError"));
      setBulkSummary(payload.summary);
      showToast(t(locale, "coach.invitations.bulkCreated", { count: payload.summary.created }));
      await loadInvites();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t(locale, "coach.invitations.bulkError"), "error");
    } finally {
      setGenerating(false);
    }
  }

  async function createGroupInvite(event: React.FormEvent) {
    event.preventDefault();
    setGenerating(true);
    setCreatedGroupInvite(null);
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "PLAYER", maxUses: Number(groupCapacity), ...expirationPayload() }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || t(locale, "coach.invitations.linkError"));
      setCreatedGroupInvite({ url: payload.url, maxUses: payload.maxUses });
      showToast(t(locale, "coach.invitations.linkCreated"));
      await loadInvites();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t(locale, "coach.invitations.linkError"), "error");
    } finally {
      setGenerating(false);
    }
  }

  async function copyInvite(invite: Invite) {
    await navigator.clipboard.writeText(invite.url);
    setCopiedId(invite.id);
    showToast(t(locale, "coach.invitations.linkCopied"));
    setTimeout(() => setCopiedId((cur) => (cur === invite.id ? null : cur)), 1800);
  }

  function shareMessage(invite: Invite) {
    return invite.role === "ASSISTANT" || invite.role === "COACH"
      ? t(locale, "coach.invite.shareStaff", { name: coachName, url: invite.url })
      : t(locale, "coach.invite.sharePlayer", { name: coachName, url: invite.url });
  }

  function sendViaWhatsApp(invite: Invite) {
    const recipient = invite.phone?.replace(/\D/g, "") ?? "";
    window.open(`https://wa.me/${recipient}?text=${encodeURIComponent(shareMessage(invite))}`, "_blank");
  }

  function sendViaTelegram(invite: Invite) {
    const caption =
      invite.role === "ASSISTANT" || invite.role === "COACH"
        ? t(locale, "coach.invite.shareCaptionStaff", { name: coachName })
        : t(locale, "coach.invite.shareCaptionPlayer", { name: coachName });
    window.open(`https://t.me/share/url?url=${encodeURIComponent(invite.url)}&text=${encodeURIComponent(caption)}`, "_blank");
  }

  async function regenerate(invite: Invite) {
    setBusyId(invite.id);
    try {
      const res = await fetch(`/api/coach/invites/${invite.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "regenerate" }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || t(locale, "coach.invitations.regenerateError"));
      showToast(t(locale, "coach.invitations.regenerated"));
      await loadInvites();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t(locale, "coach.invitations.regenerateError"), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmRevoke() {
    if (!revoking) return;
    setBusyId(revoking.id);
    try {
      const res = await fetch(`/api/coach/invites/${revoking.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke" }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || t(locale, "coach.invitations.revokeError"));
      showToast(t(locale, "coach.invitations.revoked"));
      setRevoking(null);
      await loadInvites();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t(locale, "coach.invitations.revokeError"), "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-red">{t(locale, "coach.invitations.teamAccess")}</p>
          <h1 className="mt-2 font-display text-3xl font-black text-white sm:text-4xl">{t(locale, "coach.invitations.title")}</h1>
          <p className="mt-2 text-sm text-smoke-3">{t(locale, "coach.invitations.subtitle")}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button className="btn-primary justify-center gap-2 !px-4 !py-3 text-sm" onClick={() => setInviteOpen(true)}>
            <PlusIcon className="h-4 w-4" />
            {t(locale, "coach.invite.addMembers")}
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={t(locale, "coach.invitations.pending")} value={kpis.pending} icon={MailIcon} loading={loading} />
        <KpiCard label={t(locale, "coach.invitations.accepted")} value={kpis.accepted} icon={CheckCircleIcon} loading={loading} />
        <KpiCard label={t(locale, "coach.invitations.expired")} value={kpis.expired} icon={AlertIcon} tone="warn" loading={loading} />
        <KpiCard label={t(locale, "coach.invitations.revoked")} value={kpis.revoked} icon={TrashIcon} loading={loading} />
      </div>

      <div className="mt-5 rounded-lg border border-line-1 bg-ink-3 p-4">
        <div className="grid gap-3 lg:grid-cols-[220px_220px_1fr]">
          <select
            className="rounded-md border border-line-1 bg-ink-2 px-3 py-3 text-sm text-smoke-2 outline-none focus:border-red"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
            aria-label={t(locale, "coach.invite.role")}
          >
            <option value="all">{t(locale, "coach.invitations.allRoles")}</option>
            <option value="PLAYER">{t(locale, "coach.invite.player")}</option>
            <option value="ASSISTANT">{t(locale, "coach.invite.assistant")}</option>
            <option value="COACH">{t(locale, "coach.invite.coach")}</option>
          </select>
          <select
            className="rounded-md border border-line-1 bg-ink-2 px-3 py-3 text-sm text-smoke-2 outline-none focus:border-red"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            aria-label={t(locale, "coach.invitations.colStatus")}
          >
            <option value="all">{t(locale, "coach.invitations.allStatuses")}</option>
            <option value="pending">{t(locale, "coach.invitations.pending")}</option>
            <option value="accepted">{t(locale, "coach.invitations.accepted")}</option>
            <option value="expired">{t(locale, "coach.invitations.expired")}</option>
            <option value="revoked">{t(locale, "coach.invitations.revoked")}</option>
          </select>
          <input
            className="rounded-md border border-line-1 bg-ink-2 px-3 py-3 text-sm text-white outline-none placeholder:text-smoke-4 focus:border-red"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t(locale, "coach.invitations.search")}
            aria-label={t(locale, "coach.invitations.search")}
          />
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-line-1 bg-ink-3">
        <div className="flex items-center justify-between border-b border-line-1 px-4 py-4">
          <div>
            <h2 className="font-display text-lg font-black text-white">{t(locale, "coach.invitations.listTitle")}</h2>
            <p className="mt-1 text-xs text-smoke-4">
              {loading ? t(locale, "coach.invitations.loading") : t(locale, "coach.invitations.shown", { count: invites.length })}
            </p>
          </div>
          {hasFilters ? (
            <button
              className="btn-ghost !px-3 !py-2 text-xs"
              onClick={() => {
                setRoleFilter("all");
                setStatusFilter("all");
                setSearch("");
              }}
            >
              {t(locale, "coach.invitations.clearFilters")}
            </button>
          ) : null}
        </div>

        <div className="p-4">
          {loading ? <SkeletonRows count={6} /> : null}
          {!loading && error ? <ErrorState message={error} onRetry={loadInvites} /> : null}
          {!loading && !error && invites.length === 0 ? (
            <EmptyState
              icon={UsersIcon}
              title={hasFilters ? t(locale, "coach.invitations.emptyFilteredTitle") : t(locale, "coach.invitations.emptyTitle")}
              description={hasFilters ? t(locale, "coach.invitations.emptyFilteredBody") : t(locale, "coach.invitations.emptyBody")}
              action={
                !hasFilters ? (
                  <button className="btn-primary mt-2 justify-center gap-2 !px-4 !py-3 text-sm" onClick={() => setInviteOpen(true)}>
                    <PlusIcon className="h-4 w-4" />
                    {t(locale, "coach.invite.create")}
                  </button>
                ) : null
              }
            />
          ) : null}

          {!loading && !error && invites.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-smoke-4">
                  <tr className="border-b border-line-1">
                    <th className="px-3 py-3 font-bold">{t(locale, "coach.invitations.colRole")}</th>
                    <th className="px-3 py-3 font-bold">{t(locale, "coach.invitations.colStatus")}</th>
                    <th className="px-3 py-3 font-bold">{t(locale, "coach.invitations.colCreated")}</th>
                    <th className="px-3 py-3 font-bold">{t(locale, "coach.invitations.colExpiration")}</th>
                    <th className="px-3 py-3 font-bold">{t(locale, "coach.invitations.colAccepted")}</th>
                    <th className="px-3 py-3 font-bold">{t(locale, "coach.invitations.colUrl")}</th>
                    <th className="px-3 py-3 text-right font-bold">{t(locale, "coach.invitations.colActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((invite) => {
                    const accepted = invite.status === "accepted";
                    const canRegenerate = !accepted && (invite.role !== "ASSISTANT" || canManageRoles);
                    return (
                      <tr key={invite.id} className="border-b border-line-1 last:border-b-0">
                        <td className="px-3 py-4 font-semibold text-white">{roleLabelMap[invite.role]}</td>
                        <td className="px-3 py-4">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${STATUS_STYLE[invite.status]}`}>
                            {statusLabel[invite.status]}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-smoke-2">{formatDateTime(invite.createdAt, locale)}</td>
                        <td className="px-3 py-4">
                          <div className="text-smoke-2">{formatDateTime(invite.expiresAt, locale)}</div>
                          <div className={invite.status === "expired" ? "text-xs text-red-glow" : "text-xs text-smoke-4"}>
                            {expiryLabel(invite.expiresAt, locale)}
                          </div>
                        </td>
                        <td className="px-3 py-4">
                          {invite.acceptedUser ? (
                            <div>
                              <div className="font-semibold text-white">{invite.acceptedUser.name}</div>
                              <div className="text-xs text-smoke-4">{invite.acceptedUser.email}</div>
                            </div>
                          ) : (
                            <div className="text-xs text-smoke-4">
                              <div>
                                {invite.maxUses > 1
                                  ? t(locale, "coach.invitations.teamLinkJoined", { used: invite.useCount, max: invite.maxUses })
                                  : invite.email ?? "-"}
                              </div>
                              {invite.phone ? <div className="mt-1">{invite.phone}</div> : null}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-4">
                          <code className="block max-w-[210px] truncate text-xs text-smoke-3" title={invite.url}>
                            {shortenUrlForDisplay(invite.url)}
                          </code>
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex justify-end gap-2">
                            <button className="btn-ghost !px-2.5 !py-2 text-xs" onClick={() => copyInvite(invite)}>
                              <CopyIcon className="h-4 w-4" />
                              {copiedId === invite.id ? t(locale, "coach.invite.copied") : t(locale, "coach.invite.copyLink")}
                            </button>
                            <button className="btn-ghost !px-2.5 !py-2 text-xs" onClick={() => sendViaWhatsApp(invite)}>
                              <WhatsAppIcon className="h-4 w-4" />
                              {t(locale, "coach.invite.whatsapp")}
                            </button>
                            <button className="btn-ghost !px-2.5 !py-2 text-xs" onClick={() => sendViaTelegram(invite)}>
                              <TelegramIcon className="h-4 w-4" />
                              {t(locale, "coach.invite.telegram")}
                            </button>
                            <button className="btn-ghost !px-2.5 !py-2 text-xs" onClick={() => regenerate(invite)} disabled={!canRegenerate || busyId === invite.id}>
                              <RefreshIcon className="h-4 w-4" />
                              {t(locale, "coach.invite.regenerateShort")}
                            </button>
                            <button
                              className="btn-ghost !px-2.5 !py-2 text-xs text-red-glow"
                              onClick={() => setRevoking(invite)}
                              disabled={accepted || busyId === invite.id}
                            >
                              <TrashIcon className="h-4 w-4" />
                              {t(locale, "coach.invite.revoke")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>

      <ConfirmModal
        open={revoking != null}
        title={t(locale, "coach.invitations.revokeTitle")}
        description={t(locale, "coach.invitations.revokeBody")}
        confirmLabel={t(locale, "coach.invite.revoke")}
        busy={Boolean(revoking && busyId === revoking.id)}
        onCancel={() => setRevoking(null)}
        onConfirm={confirmRevoke}
      />
      {inviteOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="invite-modal-title">
          <div className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6 shadow-xl shadow-black/50">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="eyebrow">{t(locale, "coach.invite.eyebrow")}</div>
                <h2 id="invite-modal-title" className="mt-1 font-display text-2xl font-bold text-white">{t(locale, "coach.invite.addMembers")}</h2>
              </div>
              <button type="button" className="btn-ghost !px-3 !py-2 text-xs" onClick={() => setInviteOpen(false)} aria-label={t(locale, "coach.invite.close")}>
                {t(locale, "coach.invite.close")}
              </button>
            </div>
            <div className="mb-5 grid grid-cols-3 gap-2 rounded-lg border border-line-1 bg-ink-2 p-1" role="tablist" aria-label={t(locale, "coach.invitations.typeAria")}>
              {(
                [
                  ["single", "coach.invitations.modeSingle"],
                  ["bulk", "coach.invitations.modeBulk"],
                  ["link", "coach.invitations.modeLink"],
                ] as const
              ).map(([mode, key]) => (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={inviteMode === mode}
                  className={`min-h-11 rounded-md px-3 py-2 text-sm font-semibold transition ${inviteMode === mode ? "bg-red text-white" : "text-smoke-3 hover:bg-white/5 hover:text-white"}`}
                  onClick={() => setInviteMode(mode)}
                >
                  {t(locale, key)}
                </button>
              ))}
            </div>
            {inviteMode === "single" ? (
              <form className="space-y-4" onSubmit={createInvite}>
                <label className="block">
                  <span className="text-xs font-semibold text-smoke-3">{t(locale, "coach.invite.role")}</span>
                  <select className="input-field mt-1" value={inviteRole} onChange={(event) => setInviteRole(event.target.value as InviteRole)}>
                    <option value="PLAYER">{t(locale, "coach.invite.player")}</option>
                    {canManageRoles ? <option value="ASSISTANT">{t(locale, "coach.invite.assistant")}</option> : null}
                    {canManageRoles ? <option value="COACH">{t(locale, "coach.invite.coach")}</option> : null}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-smoke-3">{t(locale, "coach.invite.emailOptional")}</span>
                  <input className="input-field mt-1" type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="member@example.com" />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-smoke-3">{t(locale, "coach.invite.phoneOptional")}</span>
                  <input className="input-field mt-1" type="tel" inputMode="tel" autoComplete="tel" value={invitePhone} onChange={(event) => setInvitePhone(event.target.value)} placeholder="+989121234567" />
                  <span className="mt-1 block text-xs text-smoke-4">{t(locale, "coach.invite.phoneHint")}</span>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-smoke-3">{t(locale, "coach.invite.expiration")}</span>
                  <select className="input-field mt-1" value={expiration} onChange={(event) => setExpiration(event.target.value)}>
                    <option value="1">{t(locale, "coach.invite.exp24h")}</option>
                    <option value="7">{t(locale, "coach.invite.exp7d")}</option>
                    <option value="14">{t(locale, "coach.invite.exp14d")}</option>
                    <option value="30">{t(locale, "coach.invite.exp30d")}</option>
                    <option value="custom">{t(locale, "coach.invite.expCustom")}</option>
                  </select>
                </label>
                {expiration === "custom" ? (
                  <label className="block">
                    <span className="text-xs font-semibold text-smoke-3">{t(locale, "coach.invite.customExpiration")}</span>
                    <input className="input-field mt-1" type="datetime-local" value={customExpiresAt} min={new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 16)} onChange={(event) => setCustomExpiresAt(event.target.value)} required />
                    <span className="mt-1 block text-xs text-smoke-4">{t(locale, "coach.invite.customExpirationHint")}</span>
                  </label>
                ) : null}
                <button className="btn-primary w-full !py-3 text-sm" type="submit" disabled={generating}>
                  {generating ? t(locale, "coach.invite.creating") : t(locale, "coach.invite.create")}
                </button>
              </form>
            ) : null}
            {inviteMode === "bulk" ? (
              <form className="space-y-4" onSubmit={createBulkInvites}>
                <div>
                  <label htmlFor="bulk-player-contacts" className="text-xs font-semibold text-smoke-3">
                    {t(locale, "coach.invitations.bulkLabel")}
                  </label>
                  <textarea
                    id="bulk-player-contacts"
                    className="input-field mt-1 min-h-40 resize-y font-mono text-sm leading-7"
                    value={bulkContacts}
                    onChange={(event) => {
                      setBulkContacts(event.target.value);
                      setBulkSummary(null);
                    }}
                    placeholder={"player1@example.com\n+989121234567\nplayer3@example.com"}
                    aria-describedby="bulk-player-help"
                    autoFocus
                  />
                  <p id="bulk-player-help" className="mt-2 text-xs text-smoke-4">
                    {t(locale, "coach.invitations.bulkHelp")}
                  </p>
                </div>
                {bulkSummary ? (
                  <div className="grid grid-cols-3 gap-2 rounded-lg border border-line-1 bg-ink-2 p-3 text-center" aria-live="polite">
                    <div>
                      <div className="text-lg font-bold text-white">{bulkSummary.created}</div>
                      <div className="text-xs text-smoke-4">{t(locale, "coach.invitations.bulkCreated")}</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-[#FFC107]">{bulkSummary.duplicate}</div>
                      <div className="text-xs text-smoke-4">{t(locale, "coach.invitations.bulkDuplicate")}</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-red-glow">{bulkSummary.invalid}</div>
                      <div className="text-xs text-smoke-4">{t(locale, "coach.invitations.bulkInvalid")}</div>
                    </div>
                  </div>
                ) : null}
                <button className="btn-primary w-full !py-3 text-sm" type="submit" disabled={generating}>
                  {generating ? t(locale, "coach.invitations.bulkCreating") : t(locale, "coach.invitations.bulkSubmit")}
                </button>
              </form>
            ) : null}
            {inviteMode === "link" ? (
              <form className="space-y-4" onSubmit={createGroupInvite}>
                <div className="rounded-lg border border-line-1 bg-ink-2 p-4">
                  <h3 className="font-semibold text-white">{t(locale, "coach.invitations.linkTitle")}</h3>
                  <p className="mt-1 text-sm text-smoke-3">{t(locale, "coach.invitations.linkBody")}</p>
                </div>
                <label className="block">
                  <span className="text-xs font-semibold text-smoke-3">{t(locale, "coach.invitations.maxPlayers")}</span>
                  <input className="input-field mt-1" type="number" min="2" max="100" value={groupCapacity} onChange={(event) => setGroupCapacity(event.target.value)} required />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-smoke-3">{t(locale, "coach.invite.expiration")}</span>
                  <select className="input-field mt-1" value={expiration} onChange={(event) => setExpiration(event.target.value)}>
                    <option value="1">{t(locale, "coach.invite.exp24h")}</option>
                    <option value="7">{t(locale, "coach.invite.exp7d")}</option>
                    <option value="14">{t(locale, "coach.invite.exp14d")}</option>
                    <option value="30">{t(locale, "coach.invite.exp30d")}</option>
                    <option value="custom">{t(locale, "coach.invite.expCustom")}</option>
                  </select>
                </label>
                {expiration === "custom" ? (
                  <input className="input-field" type="datetime-local" value={customExpiresAt} min={new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 16)} onChange={(event) => setCustomExpiresAt(event.target.value)} required />
                ) : null}
                {createdGroupInvite ? (
                  <div className="rounded-lg border border-[#4CAF50]/40 bg-[#4CAF50]/10 p-4" aria-live="polite">
                    <p className="text-sm font-semibold text-white">{t(locale, "coach.invitations.linkReady", { count: createdGroupInvite.maxUses })}</p>
                    <code className="mt-2 block break-all text-xs text-smoke-2">{createdGroupInvite.url}</code>
                    <button
                      type="button"
                      className="btn-ghost mt-3 !px-3 !py-2 text-xs"
                      onClick={() => navigator.clipboard.writeText(createdGroupInvite.url).then(() => showToast(t(locale, "coach.invite.copied")))}
                    >
                      <CopyIcon className="h-4 w-4" /> {t(locale, "coach.invitations.copyTeamLink")}
                    </button>
                  </div>
                ) : null}
                <button className="btn-primary w-full !py-3 text-sm" type="submit" disabled={generating}>
                  {generating ? t(locale, "coach.invitations.creatingLink") : t(locale, "coach.invitations.createLink")}
                </button>
              </form>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
