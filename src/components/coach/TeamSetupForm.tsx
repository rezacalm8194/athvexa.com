"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Locale } from "@/lib/i18n";

export default function TeamSetupForm({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [sport, setSport] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, sport: sport.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? t(locale, "coach.teams.setupError"));
        return;
      }
      router.push("/dashboard/coach");
      router.refresh();
    } catch {
      setError(t(locale, "coach.teams.setupConnError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-smoke-4">{t(locale, "coach.teams.fieldName")}</span>
        <input
          className="input-field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t(locale, "coach.teams.setupPhName")}
          autoComplete="off"
          required
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-smoke-4">{t(locale, "coach.teams.setupSportOptional")}</span>
        <input
          className="input-field"
          value={sport}
          onChange={(e) => setSport(e.target.value)}
          placeholder={t(locale, "coach.teams.setupPhSport")}
          autoComplete="off"
        />
      </label>

      {error && <p className="text-sm text-red-glow">{error}</p>}

      <button type="submit" className="btn-primary mt-1" disabled={loading}>
        {loading ? t(locale, "coach.teams.setupCreating") : t(locale, "coach.teams.create")}
      </button>
    </form>
  );
}
