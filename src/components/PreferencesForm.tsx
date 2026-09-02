"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const FALLBACK_ZONES = ["UTC", "America/New_York", "America/Los_Angeles", "Europe/London", "Europe/Paris", "Asia/Tehran", "Asia/Dubai", "Asia/Tokyo", "Australia/Sydney"];
const zones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : FALLBACK_ZONES;

export default function PreferencesForm({ settings = false }: { settings?: boolean }) {
  const router = useRouter();
  const [locale, setLocale] = useState<"en" | "fa">("en");
  const [timeZone, setTimeZone] = useState("");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filteredZones = useMemo(() => zones.filter((zone) => zone.toLowerCase().includes(query.toLowerCase())).slice(0, 250), [query]);

  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    setTimeZone(detected);
    fetch("/api/auth/me").then((res) => res.ok ? res.json() : null).then((data) => {
      if (data?.user) {
        setLocale(data.user.locale === "fa" ? "fa" : "en");
        setTimeZone(data.user.timeZone || detected);
      }
    }).catch(() => undefined);
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError(null);
    try {
      const res = await fetch("/api/user/preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale, timeZone }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save preferences.");
      document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; samesite=lax`;
      if (settings) router.refresh(); else router.push(data.user?.role === "PLAYER" ? "/dashboard/player" : "/dashboard/coach");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save preferences."); }
    finally { setSaving(false); }
  }

  const fa = locale === "fa";
  return <form onSubmit={save} className="flex flex-col gap-5" dir={fa ? "rtl" : "ltr"}>
    <label className="flex flex-col gap-2"><span className="text-sm font-medium text-smoke-4">{fa ? "زبان" : "Language"}</span>
      <select className="input-field" value={locale} onChange={(e) => setLocale(e.target.value as "en" | "fa")}><option value="en">English</option><option value="fa">فارسی</option></select>
    </label>
    <label className="flex flex-col gap-2"><span className="text-sm font-medium text-smoke-4">{fa ? "منطقه زمانی" : "Time zone"}</span>
      <input className="input-field" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={fa ? "جستجوی منطقه زمانی" : "Search time zones"} aria-label="Search time zones" />
      <select className="input-field" value={timeZone} onChange={(e) => setTimeZone(e.target.value)} size={Math.min(7, Math.max(3, filteredZones.length))} required>
        {!filteredZones.includes(timeZone) && <option value={timeZone}>{timeZone}</option>}{filteredZones.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
      </select>
      <span className="text-xs text-smoke-3">{fa ? "به‌صورت خودکار از مرورگر تشخیص داده شد؛ قابل تغییر است." : "Detected from your browser; you can change it."}</span>
    </label>
    {error && <p className="text-sm text-red-glow">{error}</p>}
    <button className="btn-primary" disabled={saving}>{saving ? (fa ? "در حال ذخیره…" : "Saving…") : (settings ? (fa ? "ذخیره تنظیمات" : "Save preferences") : (fa ? "ادامه" : "Continue"))}</button>
  </form>;
}
