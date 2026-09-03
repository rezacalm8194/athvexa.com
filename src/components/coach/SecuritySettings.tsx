"use client";

import { useEffect, useState } from "react";
import SettingToggle from "@/components/coach/settings/SettingToggle";
import type { TeamWorkspace } from "@/lib/teamWorkspace";
import { t, teamRoleLabel, type Locale } from "@/lib/i18n";

type AccessMember = {
  id: string;
  role: string;
  user: { id: string; name: string; email: string | null };
};

export default function SecuritySettings({
  locale,
  teamId,
  canEdit,
  ownerName,
  currentRole,
  playerCount,
  sessionLabel,
  initialWorkspace,
  accessMembers,
}: {
  locale: Locale;
  teamId: string | null;
  canEdit: boolean;
  ownerName: string;
  currentRole: string;
  playerCount: number;
  sessionLabel: string;
  initialWorkspace: TeamWorkspace;
  accessMembers: AccessMember[];
}) {
  const [assistantActivityVisible, setAssistantActivityVisible] = useState(initialWorkspace.assistantActivityVisible);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setAssistantActivityVisible(initialWorkspace.assistantActivityVisible);
  }, [initialWorkspace]);

  async function saveWorkspace() {
    if (!teamId || !canEdit) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/coach/teams/${teamId}/workspace`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assistantActivityVisible }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t(locale, "coach.settings.securitySaveError"));
      setSuccess(t(locale, "coach.settings.securitySaved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "coach.settings.securitySaveError"));
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    if (newPassword !== confirmPassword) {
      setError(t(locale, "coach.settings.passwordMismatch"));
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t(locale, "coach.settings.passwordError"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(t(locale, "coach.settings.passwordSaved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "coach.settings.passwordError"));
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "mt-1 w-full bg-transparent text-sm font-semibold text-white outline-none";

  return (
    <section className="rounded-lg border border-white/5 bg-ink-3 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-white">{t(locale, "coach.settings.securityTitle")}</h2>
          <p className="mt-1 max-w-2xl text-sm text-smoke-3">{t(locale, "coach.settings.securityDesc")}</p>
        </div>
        <button className="btn-ghost !px-3.5 !py-2 text-xs" type="button" onClick={saveWorkspace} disabled={!canEdit || saving || !teamId}>
          {saving ? t(locale, "coach.settings.saving") : t(locale, "coach.settings.reviewAccess")}
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-line-1 bg-ink-2 p-3">
          <div className="eyebrow">{t(locale, "coach.settings.teamOwnership")}</div>
          <div className="mt-1 text-sm font-semibold text-white">{ownerName}</div>
        </div>
        <div className="rounded-md border border-line-1 bg-ink-2 p-3">
          <div className="eyebrow">{t(locale, "coach.settings.fieldRole")}</div>
          <div className="mt-1 text-sm font-semibold text-white">{currentRole}</div>
        </div>
        <div className="rounded-md border border-line-1 bg-ink-2 p-3">
          <div className="eyebrow">{t(locale, "coach.settings.playerDataAccess")}</div>
          <div className="mt-1 text-sm font-semibold text-white">
            {t(locale, "coach.settings.rosterCount", { count: playerCount })}
          </div>
        </div>
        <div className="rounded-md border border-line-1 bg-ink-2 p-3">
          <div className="eyebrow">{t(locale, "coach.settings.sessionPolicy")}</div>
          <div className="mt-1 text-sm font-semibold text-white">{sessionLabel}</div>
        </div>
        <SettingToggle
          label={t(locale, "coach.settings.assistantActivity")}
          checked={assistantActivityVisible}
          disabled={!canEdit || saving}
          onChange={setAssistantActivityVisible}
        />
      </div>

      <div className="mt-5">
        <p className="eyebrow">{t(locale, "coach.settings.accessList")}</p>
        <div className="mt-2 space-y-2">
          {accessMembers.map((member) => (
            <div key={member.id} className="flex items-center justify-between rounded-md border border-line-1 bg-ink-2 px-3 py-2">
              <span className="text-sm text-white">{member.user.name}</span>
              <span className="text-xs text-smoke-3">{teamRoleLabel(member.role, locale)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <label className="rounded-md border border-line-1 bg-ink-2 p-3">
          <span className="eyebrow">{t(locale, "coach.settings.currentPassword")}</span>
          <input className={inputClass} type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
        </label>
        <label className="rounded-md border border-line-1 bg-ink-2 p-3">
          <span className="eyebrow">{t(locale, "coach.settings.newPassword")}</span>
          <input className={inputClass} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
        </label>
        <label className="rounded-md border border-line-1 bg-ink-2 p-3">
          <span className="eyebrow">{t(locale, "coach.settings.confirmPassword")}</span>
          <input className={inputClass} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
        </label>
      </div>
      <button className="btn-ghost mt-3 !px-3.5 !py-2 text-xs" type="button" onClick={changePassword} disabled={saving || !currentPassword || !newPassword}>
        {t(locale, "coach.settings.changePassword")}
      </button>

      {error ? <p className="mt-4 text-sm text-red-glow">{error}</p> : null}
      {success ? <p className="mt-4 text-sm text-green-300">{success}</p> : null}
    </section>
  );
}
