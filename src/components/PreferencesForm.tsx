"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Locale } from "@/lib/i18n";

const FALLBACK_ZONES = [
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tehran",
  "Asia/Dubai",
  "Asia/Tokyo",
  "Australia/Sydney",
];
const zones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : FALLBACK_ZONES;

export default function PreferencesForm({
  settings = false,
  onboarding = false,
  initialLocale = "en",
  initialTimeZone = null,
}: {
  settings?: boolean;
  onboarding?: boolean;
  /** Server-known locale so labels are correct on first paint (avoids English flash). */
  initialLocale?: Locale;
  initialTimeZone?: string | null;
}) {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [timeZone, setTimeZone] = useState(initialTimeZone || "");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filteredZones = useMemo(
    () => zones.filter((zone) => zone.toLowerCase().includes(query.toLowerCase())).slice(0, 250),
    [query]
  );

  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    if (!initialTimeZone) setTimeZone(detected);
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setLocale(data.user.locale === "fa" ? "fa" : "en");
          setTimeZone(data.user.timeZone || detected);
        }
      })
      .catch(() => undefined);
  }, [initialTimeZone]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, timeZone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t(locale, "preferences.saveError"));
      document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; samesite=lax`;
      if (settings) router.refresh();
      else router.push(data.user?.role === "PLAYER" ? "/dashboard/player" : "/dashboard/coach");
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "preferences.saveError"));
    } finally {
      setSaving(false);
    }
  }

  const fa = locale === "fa";
  return (
    <form onSubmit={save} className="flex flex-col gap-5" dir={fa ? "rtl" : "ltr"}>
      {onboarding && (
        <div>
          <h1 className="font-display text-3xl font-bold text-white">{t(locale, "preferences.title")}</h1>
          <p className="mt-2 text-sm text-smoke-3">{t(locale, "preferences.subtitle")}</p>
        </div>
      )}
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-smoke-4">{t(locale, "preferences.language")}</span>
        <select className="input-field" value={locale} onChange={(e) => setLocale(e.target.value as Locale)}>
          <option value="en">English</option>
          <option value="fa">فارسی</option>
        </select>
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-smoke-4">{t(locale, "preferences.timezone")}</span>
        <input
          className="input-field"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(locale, "preferences.timezoneSearch")}
          aria-label={t(locale, "preferences.timezoneSearch")}
        />
        <select
          className="input-field"
          value={timeZone}
          onChange={(e) => setTimeZone(e.target.value)}
          size={Math.min(7, Math.max(3, filteredZones.length))}
          required
        >
          {!filteredZones.includes(timeZone) && timeZone ? <option value={timeZone}>{timeZone}</option> : null}
          {filteredZones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
        <span className="text-xs text-smoke-3">{t(locale, "preferences.timezoneHint")}</span>
      </label>
      {error && <p className="text-sm text-red-glow">{error}</p>}
      <button className="btn-primary" disabled={saving}>
        {saving
          ? t(locale, "preferences.saving")
          : settings
            ? t(locale, "preferences.save")
            : t(locale, "preferences.continue")}
      </button>
    </form>
  );
}
