"use client";

import { useEffect, useState } from "react";
import type { CoachNotificationPrefs } from "@/lib/userPreferences";
import { t, type Locale } from "@/lib/i18n";

function Toggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-md border border-line-1 bg-ink-2 p-3 text-start disabled:opacity-70"
    >
      <span className="text-sm text-paper">{label}</span>
      <span dir="ltr" className={`relative h-6 w-11 shrink-0 rounded-full p-1 ${checked ? "bg-red" : "bg-white/10"}`}>
        <span
          className={`block h-4 w-4 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`}
        />
      </span>
    </button>
  );
}

export default function NotificationSettings({
  locale,
  initial,
}: {
  locale: Locale;
  initial: CoachNotificationPrefs;
}) {
  const [prefs, setPrefs] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setPrefs(initial);
  }, [initial]);

  function update<K extends keyof CoachNotificationPrefs>(key: K, value: CoachNotificationPrefs[K]) {
    setPrefs((current) => ({ ...current, [key]: value }));
    setSuccess(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/user/notification-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t(locale, "coach.settings.notifSaveError"));
      if (data.preferences) setPrefs(data.preferences);
      setSuccess(t(locale, "coach.settings.notifSaved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "coach.settings.notifSaveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-lg border border-white/5 bg-ink-3 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-white">{t(locale, "coach.settings.notifTitle")}</h2>
          <p className="mt-1 max-w-2xl text-sm text-smoke-3">{t(locale, "coach.settings.notifDesc")}</p>
        </div>
        <button className="btn-ghost !px-3.5 !py-2 text-xs" type="button" onClick={save} disabled={saving}>
          {saving ? t(locale, "coach.settings.saving") : t(locale, "coach.settings.savePrefs")}
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Toggle
          label={t(locale, "coach.settings.notifCheckIns")}
          checked={prefs.checkIns}
          disabled={saving}
          onChange={(value) => update("checkIns", value)}
        />
        <Toggle
          label={t(locale, "coach.settings.notifLowReadiness")}
          checked={prefs.lowReadiness}
          disabled={saving}
          onChange={(value) => update("lowReadiness", value)}
        />
        <Toggle
          label={t(locale, "coach.settings.notifSession")}
          checked={prefs.sessionComplete}
          disabled={saving}
          onChange={(value) => update("sessionComplete", value)}
        />
        <Toggle
          label={t(locale, "coach.settings.notifWeekly")}
          checked={prefs.weeklyEmail}
          disabled={saving}
          onChange={(value) => update("weeklyEmail", value)}
        />
      </div>

      {error ? <p className="mt-4 text-sm text-red-glow">{error}</p> : null}
      {success ? <p className="mt-4 text-sm text-green-300">{success}</p> : null}
    </section>
  );
}
