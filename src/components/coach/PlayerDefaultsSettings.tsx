"use client";

import { useEffect, useState } from "react";
import SettingToggle from "@/components/coach/settings/SettingToggle";
import type { TeamWorkspace } from "@/lib/teamWorkspace";
import { t, type Locale } from "@/lib/i18n";

export default function PlayerDefaultsSettings({
  locale,
  teamId,
  canEdit,
  initial,
}: {
  locale: Locale;
  teamId: string | null;
  canEdit: boolean;
  initial: TeamWorkspace;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  async function save() {
    if (!teamId || !canEdit) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/coach/teams/${teamId}/workspace`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dailyReminderEnabled: form.dailyReminderEnabled,
          readinessThreshold: form.readinessThreshold,
          sleepThresholdHours: form.sleepThresholdHours,
          programVisibility: form.programVisibility,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t(locale, "coach.settings.defaultsSaveError"));
      if (data.workspace) setForm((current) => ({ ...current, ...data.workspace }));
      setSuccess(t(locale, "coach.settings.defaultsSaved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "coach.settings.defaultsSaveError"));
    } finally {
      setSaving(false);
    }
  }

  const fieldClass = "mt-1 w-full bg-transparent text-sm font-semibold text-white outline-none";

  return (
    <section className="rounded-lg border border-white/5 bg-ink-3 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-white">{t(locale, "coach.settings.defaultsTitle")}</h2>
          <p className="mt-1 max-w-2xl text-sm text-smoke-3">{t(locale, "coach.settings.defaultsDesc")}</p>
        </div>
        <button className="btn-ghost !px-3.5 !py-2 text-xs" type="button" onClick={save} disabled={!canEdit || saving || !teamId}>
          {saving ? t(locale, "coach.settings.saving") : t(locale, "coach.settings.updateDefaults")}
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <SettingToggle
          label={t(locale, "coach.settings.dailyReminder")}
          checked={form.dailyReminderEnabled}
          disabled={!canEdit || saving}
          onChange={(value) => setForm((current) => ({ ...current, dailyReminderEnabled: value }))}
        />
        <label className="rounded-md border border-line-1 bg-ink-2 p-3">
          <span className="eyebrow">{t(locale, "coach.settings.readinessThreshold")}</span>
          <input
            className={fieldClass}
            type="number"
            min={10}
            max={90}
            value={form.readinessThreshold}
            disabled={!canEdit || saving}
            onChange={(event) => setForm((current) => ({ ...current, readinessThreshold: Number(event.target.value) }))}
          />
        </label>
        <label className="rounded-md border border-line-1 bg-ink-2 p-3">
          <span className="eyebrow">{t(locale, "coach.settings.sleepThreshold")}</span>
          <input
            className={fieldClass}
            type="number"
            min={3}
            max={12}
            step={0.5}
            value={form.sleepThresholdHours}
            disabled={!canEdit || saving}
            onChange={(event) => setForm((current) => ({ ...current, sleepThresholdHours: Number(event.target.value) }))}
          />
        </label>
        <label className="rounded-md border border-line-1 bg-ink-2 p-3">
          <span className="eyebrow">{t(locale, "coach.settings.programVisibility")}</span>
          <select
            className={`${fieldClass} bg-ink-2`}
            value={form.programVisibility}
            disabled={!canEdit || saving}
            onChange={(event) =>
              setForm((current) => ({ ...current, programVisibility: event.target.value === "ALL" ? "ALL" : "ACTIVE_ONLY" }))
            }
          >
            <option value="ACTIVE_ONLY">{t(locale, "coach.settings.activeOnly")}</option>
            <option value="ALL">{t(locale, "coach.settings.programAll")}</option>
          </select>
        </label>
      </div>

      {error ? <p className="mt-4 text-sm text-red-glow">{error}</p> : null}
      {success ? <p className="mt-4 text-sm text-green-300">{success}</p> : null}
    </section>
  );
}
