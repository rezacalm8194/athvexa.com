"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ConfirmModal from "@/components/coach/shared/ConfirmModal";
import { t, teamRoleLabel, type Locale } from "@/lib/i18n";

type StaffMember = {
  id: string;
  role: string;
  user: { id: string; name: string; email: string | null; phone: string | null };
};

const STAFF_ROLES = ["HEAD_COACH", "ASSISTANT_COACH", "ANALYST", "PHYSIO"] as const;

export default function StaffSettings({
  locale,
  teamId,
  canManage,
  initialMembers,
}: {
  locale: Locale;
  teamId: string | null;
  canManage: boolean;
  initialMembers: StaffMember[];
}) {
  const [members, setMembers] = useState(initialMembers);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);

  useEffect(() => {
    setMembers(initialMembers);
  }, [initialMembers]);

  async function generateInvite() {
    if (!canManage) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "ASSISTANT" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t(locale, "coach.settings.staffInviteError"));
      setInviteUrl(data.url ?? null);
      setSuccess(t(locale, "coach.settings.staffInviteCreated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "coach.settings.staffInviteError"));
    } finally {
      setBusy(false);
    }
  }

  async function copyInvite() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  async function changeRole(memberId: string, role: string) {
    if (!teamId) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/coach/teams/${teamId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t(locale, "coach.settings.staffRoleError"));
      setMembers((current) => current.map((member) => (member.id === memberId ? data.member : member)));
      setSuccess(t(locale, "coach.settings.staffRoleSaved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "coach.settings.staffRoleError"));
    } finally {
      setBusy(false);
    }
  }

  async function removeMember() {
    if (!teamId || !removeId) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/coach/teams/${teamId}/members?memberId=${encodeURIComponent(removeId)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t(locale, "coach.settings.staffRemoveError"));
      setMembers((current) => current.filter((member) => member.id !== removeId));
      setSuccess(t(locale, "coach.settings.staffRemoved"));
      setRemoveId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "coach.settings.staffRemoveError"));
    } finally {
      setBusy(false);
    }
  }

  if (!teamId) {
    return (
      <section className="rounded-lg border border-white/5 bg-ink-3 p-5">
        <h2 className="font-display text-lg font-bold text-white">{t(locale, "coach.settings.staffTitle")}</h2>
        <p className="mt-1 text-sm text-smoke-3">{t(locale, "coach.settings.staffNeedTeam")}</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-white/5 bg-ink-3 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-white">{t(locale, "coach.settings.staffTitle")}</h2>
          <p className="mt-1 max-w-2xl text-sm text-smoke-3">{t(locale, "coach.settings.staffDesc")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/coach/invitations" className="btn-ghost !px-3.5 !py-2 text-xs">
            {t(locale, "coach.settings.viewInvitations")}
          </Link>
          <button className="btn-ghost !px-3.5 !py-2 text-xs" type="button" onClick={generateInvite} disabled={!canManage || busy}>
            {busy ? t(locale, "coach.settings.saving") : t(locale, "coach.settings.inviteStaff")}
          </button>
        </div>
      </div>

      {!canManage ? (
        <p className="mt-3 text-xs text-smoke-4">{t(locale, "coach.settings.staffOwnerOnlyHint")}</p>
      ) : null}

      {inviteUrl ? (
        <div className="mt-4 flex flex-col gap-2 rounded-md border border-line-1 bg-ink-2 p-3 sm:flex-row sm:items-center sm:justify-between">
          <code className="truncate text-xs text-smoke-3">{inviteUrl}</code>
          <button className="btn-ghost !px-3 !py-1.5 text-xs" type="button" onClick={copyInvite}>
            {copied ? t(locale, "coach.settings.copied") : t(locale, "coach.settings.copyLink")}
          </button>
        </div>
      ) : null}

      <div className="mt-5 space-y-2">
        {members.length === 0 ? (
          <p className="rounded-md border border-dashed border-line-1 px-3 py-6 text-center text-sm text-smoke-3">
            {t(locale, "coach.settings.staffEmpty")}
          </p>
        ) : (
          members.map((member) => (
            <div key={member.id} className="flex flex-col gap-3 rounded-md border border-line-1 bg-ink-2 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{member.user.name}</p>
                <p className="truncate text-xs text-smoke-3">{member.user.email || member.user.phone || teamRoleLabel(member.role, locale)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {canManage && member.role !== "OWNER" ? (
                  <select
                    className="rounded-md border border-line-1 bg-ink-3 px-2 py-1.5 text-xs text-white"
                    value={STAFF_ROLES.includes(member.role as (typeof STAFF_ROLES)[number]) ? member.role : "ASSISTANT_COACH"}
                    disabled={busy}
                    onChange={(event) => changeRole(member.id, event.target.value)}
                  >
                    {STAFF_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {teamRoleLabel(role, locale)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="rounded bg-white/10 px-2 py-1 text-[11px] font-semibold text-smoke-4">
                    {teamRoleLabel(member.role, locale)}
                  </span>
                )}
                {canManage && member.role !== "OWNER" ? (
                  <button
                    type="button"
                    className="btn-ghost !px-2.5 !py-1.5 text-xs text-red-glow"
                    disabled={busy}
                    onClick={() => setRemoveId(member.id)}
                  >
                    {t(locale, "coach.settings.staffRemove")}
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      {error ? <p className="mt-4 text-sm text-red-glow">{error}</p> : null}
      {success ? <p className="mt-4 text-sm text-green-300">{success}</p> : null}

      <ConfirmModal
        open={Boolean(removeId)}
        title={t(locale, "coach.settings.staffRemove")}
        description={t(locale, "coach.settings.staffRemoveConfirm")}
        confirmLabel={t(locale, "coach.settings.staffRemove")}
        cancelLabel={t(locale, "common.cancel")}
        busy={busy}
        onConfirm={removeMember}
        onCancel={() => setRemoveId(null)}
      />
    </section>
  );
}
