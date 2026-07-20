"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { relativeTime } from "@/lib/format";
import { shortenUrlForDisplay } from "@/lib/invites";
import { CopyIcon, PlusIcon, RefreshIcon, TrashIcon, WhatsAppIcon, TelegramIcon } from "@/components/icons";

type InviteRole = "PLAYER" | "ASSISTANT";
type InviteStatusValue = "pending" | "accepted" | "revoked" | "expired";

type Invite = {
  id: string;
  role: InviteRole;
  url: string;
  status: InviteStatusValue;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
};

const STATUS_STYLE: Record<InviteStatusValue, string> = {
  pending: "bg-[#FFC107]/15 text-[#FFC107]",
  accepted: "bg-[#4CAF50]/15 text-[#4CAF50]",
  revoked: "bg-white/10 text-smoke-3",
  expired: "bg-white/10 text-smoke-3",
};

const STATUS_LABEL: Record<InviteStatusValue, string> = {
  pending: "Pending",
  accepted: "Accepted",
  revoked: "Revoked",
  expired: "Expired",
};

export default function InvitePanel({
  coachName,
  canManageRoles,
  limit,
  showViewAll = false,
  onChange,
}: {
  coachName: string;
  canManageRoles: boolean;
  /** Cap how many invitations are listed — omit to show all. */
  limit?: number;
  showViewAll?: boolean;
  onChange?: () => void;
}) {
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [inviteRole, setInviteRole] = useState<InviteRole>("PLAYER");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  function loadInvites() {
    fetch("/api/coach/invites")
      .then((r) => r.json())
      .then((data) => setInvites(data.invites ?? []));
  }

  useEffect(() => {
    loadInvites();
  }, []);

  async function generateInvite() {
    setGenerating(true);
    setError(null);
    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: inviteRole }),
    });
    const data = await res.json().catch(() => ({}));
    setGenerating(false);
    if (res.ok) {
      setHighlightId(data.id);
      loadInvites();
      onChange?.();
    } else {
      setError(data.error ?? "Could not generate an invite link. Try again.");
    }
  }

  async function copy(invite: Invite) {
    await navigator.clipboard.writeText(invite.url);
    setCopiedId(invite.id);
    setTimeout(() => setCopiedId((cur) => (cur === invite.id ? null : cur)), 1800);
  }

  function shareMessage(invite: Invite) {
    return invite.role === "ASSISTANT"
      ? `${coachName} invited you to join their coaching staff on Athvexa: ${invite.url}`
      : `${coachName} invited you to join their team on Athvexa: ${invite.url}`;
  }

  function sendViaWhatsApp(invite: Invite) {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage(invite))}`, "_blank");
  }

  function sendViaTelegram(invite: Invite) {
    const caption =
      invite.role === "ASSISTANT"
        ? `${coachName} invited you to join their coaching staff on Athvexa`
        : `${coachName} invited you to join their team on Athvexa`;
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(invite.url)}&text=${encodeURIComponent(caption)}`,
      "_blank"
    );
  }

  async function revoke(invite: Invite) {
    setBusyId(invite.id);
    const res = await fetch(`/api/coach/invites/${invite.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "revoke" }),
    });
    if (res.ok) {
      loadInvites();
      onChange?.();
    }
    setBusyId(null);
  }

  async function regenerate(invite: Invite) {
    setBusyId(invite.id);
    const res = await fetch(`/api/coach/invites/${invite.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "regenerate" }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setHighlightId(data.id);
      loadInvites();
      onChange?.();
    }
    setBusyId(null);
  }

  const visible = limit ? invites?.slice(0, limit) : invites;

  return (
    <div className="card p-5">
      <div className="mb-4">
        <h2 className="font-display text-lg font-bold tracking-wide text-white">Invite your team</h2>
        <p className="mt-0.5 text-sm text-smoke-3">Who do you want to invite?</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border border-line-1 bg-ink-2 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setInviteRole("PLAYER")}
            className={`rounded px-3.5 py-2 font-medium transition-colors ${
              inviteRole === "PLAYER" ? "bg-red text-white" : "text-smoke-3 hover:text-white"
            }`}
          >
            Player
          </button>
          {canManageRoles && (
            <button
              type="button"
              onClick={() => setInviteRole("ASSISTANT")}
              className={`rounded px-3.5 py-2 font-medium transition-colors ${
                inviteRole === "ASSISTANT" ? "bg-red text-white" : "text-smoke-3 hover:text-white"
              }`}
            >
              Assistant coach
            </button>
          )}
        </div>
        <button
          onClick={generateInvite}
          className="btn-primary !px-4 !py-2.5 text-xs"
          disabled={generating}
        >
          <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
          {generating ? "Generating…" : "Generate invite link"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-glow">{error}</p>}

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="eyebrow">Recent invitations</span>
          {showViewAll && invites && invites.length > (limit ?? 0) && (
            <Link href="/dashboard/coach/invitations" className="text-xs font-medium text-red hover:text-red-glow">
              View all
            </Link>
          )}
        </div>

        {!invites && (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-md bg-white/5" />
            ))}
          </div>
        )}

        {invites && invites.length === 0 && (
          <p className="rounded-md border border-dashed border-line-1 px-3 py-4 text-center text-xs text-smoke-3">
            No invitations sent yet. Generate one above to get started.
          </p>
        )}

        <div className="flex flex-col gap-2">
          {visible?.map((invite) => (
            <div
              key={invite.id}
              className={`rounded-md border p-3 transition-colors ${
                highlightId === invite.id ? "border-red/50 bg-red/5" : "border-white/5 bg-ink-3"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-smoke-4">
                    {invite.role === "ASSISTANT" ? "Assistant" : "Player"}
                  </span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[invite.status]}`}>
                    {STATUS_LABEL[invite.status]}
                  </span>
                  <span className="text-[11px] text-smoke-3">{relativeTime(invite.createdAt)}</span>
                </div>
                <code className="truncate text-xs text-smoke-4" title={invite.url}>
                  {shortenUrlForDisplay(invite.url)}
                </code>
              </div>

              {invite.status === "pending" && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <button onClick={() => copy(invite)} className="btn-ghost !px-2.5 !py-1.5 text-[11px]">
                    <CopyIcon className="mr-1 h-3.5 w-3.5" />
                    {copiedId === invite.id ? "Copied" : "Copy link"}
                  </button>
                  <button onClick={() => sendViaWhatsApp(invite)} className="btn-ghost !px-2.5 !py-1.5 text-[11px]">
                    <WhatsAppIcon className="mr-1 h-3.5 w-3.5" />
                    WhatsApp
                  </button>
                  <button onClick={() => sendViaTelegram(invite)} className="btn-ghost !px-2.5 !py-1.5 text-[11px]">
                    <TelegramIcon className="mr-1 h-3.5 w-3.5" />
                    Telegram
                  </button>
                  <button
                    onClick={() => revoke(invite)}
                    disabled={busyId === invite.id}
                    className="btn-ghost !px-2.5 !py-1.5 text-[11px] text-red-glow hover:border-red/50 disabled:opacity-50"
                  >
                    <TrashIcon className="mr-1 h-3.5 w-3.5" />
                    Revoke
                  </button>
                </div>
              )}

              {(invite.status === "revoked" || invite.status === "expired") && (
                <div className="mt-2.5">
                  <button
                    onClick={() => regenerate(invite)}
                    disabled={busyId === invite.id}
                    className="btn-ghost !px-2.5 !py-1.5 text-[11px] disabled:opacity-50"
                  >
                    <RefreshIcon className="mr-1 h-3.5 w-3.5" />
                    {busyId === invite.id ? "Generating…" : "Regenerate link"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
