"use client";

import { useEffect, useState } from "react";
import type { CoachNotificationPrefs } from "@/lib/userPreferences";
import { t, type Locale } from "@/lib/i18n";
import SettingToggle from "@/components/coach/settings/SettingToggle";

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
        <SettingToggle
          label={t(locale, "coach.settings.notifCheckIns")}
          checked={prefs.checkIns}
          disabled={saving}
          onChange={(value) => update("checkIns", value)}
        />
        <SettingToggle
          label={t(locale, "coach.settings.notifLowReadiness")}
          checked={prefs.lowReadiness}
          disabled={saving}
          onChange={(value) => update("lowReadiness", value)}
        />
        <SettingToggle
          label={t(locale, "coach.settings.notifSession")}
          checked={prefs.sessionComplete}
          disabled={saving}
          onChange={(value) => update("sessionComplete", value)}
        />
        <SettingToggle
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
