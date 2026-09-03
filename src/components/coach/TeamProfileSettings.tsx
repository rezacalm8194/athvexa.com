"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { t, type Locale } from "@/lib/i18n";

export type TeamProfileValue = {
  id: string;
  name: string;
  sport?: string | null;
  ageGroup?: string | null;
  season?: string | null;
  country?: string | null;
  timeZone?: string | null;
  units?: string | null;
  defaultLanguage?: string | null;
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block rounded-md border border-line-1 bg-ink-2 p-3">
      <span className="eyebrow">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line-1 bg-ink-2 p-3">
      <div className="eyebrow">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

export default function TeamProfileSettings({
  team,
  ownerName,
  roleLabel,
  canEdit,
  locale,
}: {
  team: TeamProfileValue | null;
  ownerName: string;
  roleLabel: string;
  canEdit: boolean;
  locale: Locale;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: team?.name ?? "",
    sport: team?.sport ?? "",
    ageGroup: team?.ageGroup ?? "",
    season: team?.season ?? "",
    country: team?.country ?? "",
    timeZone: team?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "",
    units: team?.units === "IMPERIAL" ? "IMPERIAL" : "METRIC",
    defaultLanguage: team?.defaultLanguage ?? "en",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      name: team?.name ?? "",
      sport: team?.sport ?? "",
      ageGroup: team?.ageGroup ?? "",
      season: team?.season ?? "",
      country: team?.country ?? "",
      timeZone: team?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "",
      units: team?.units === "IMPERIAL" ? "IMPERIAL" : "METRIC",
      defaultLanguage: team?.defaultLanguage ?? "en",
    });
  }, [team]);

  function updateField(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setSuccess(null);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!team || !canEdit) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/coach/teams/${team.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? t(locale, "coach.settings.saveError"));
      setSuccess(t(locale, "coach.settings.saved"));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "coach.settings.saveError"));
    } finally {
      setSaving(false);
    }
  }

  if (!team) {
    return (
      <section className="rounded-lg border border-white/5 bg-ink-3 p-5">
        <h2 className="font-display text-lg font-bold text-white">{t(locale, "coach.settings.profileTitle")}</h2>
        <p className="mt-1 max-w-2xl text-sm text-smoke-3">{t(locale, "coach.settings.profileEmpty")}</p>
        <a href="/dashboard/coach/teams?create=1" className="btn-primary mt-5 !px-3.5 !py-2 text-xs">
          {t(locale, "coach.settings.createTeam")}
        </a>
      </section>
    );
  }

  const inputClass = "w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:font-normal placeholder:text-smoke-3 disabled:cursor-not-allowed disabled:opacity-70";

  return (
    <form onSubmit={save} className="rounded-lg border border-white/5 bg-ink-3 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-white">{t(locale, "coach.settings.profileTitle")}</h2>
          <p className="mt-1 max-w-2xl text-sm text-smoke-3">
            {canEdit ? t(locale, "coach.settings.profileEditHint") : t(locale, "coach.settings.profileReadOnlyHint")}
          </p>
        </div>
        <button className="btn-ghost !px-3.5 !py-2 text-xs" type="submit" disabled={!canEdit || saving}>
          {saving ? t(locale, "coach.settings.saving") : t(locale, "coach.settings.saveChanges")}
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Field label={t(locale, "coach.settings.fieldName")}>
          <input
            className={inputClass}
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder={t(locale, "coach.settings.placeholderName")}
            required
            disabled={!canEdit || saving}
          />
        </Field>
        <Field label={t(locale, "coach.settings.fieldSport")}>
          <input
            className={inputClass}
            value={form.sport}
            onChange={(event) => updateField("sport", event.target.value)}
            placeholder={t(locale, "coach.settings.placeholderSport")}
            disabled={!canEdit || saving}
          />
        </Field>
        <Field label={t(locale, "coach.settings.fieldAgeGroup")}>
          <input
            className={inputClass}
            value={form.ageGroup}
            onChange={(event) => updateField("ageGroup", event.target.value)}
            placeholder={t(locale, "coach.settings.placeholderAge")}
            disabled={!canEdit || saving}
          />
        </Field>
        <Field label={t(locale, "coach.settings.fieldSeason")}>
          <input
            className={inputClass}
            value={form.season}
            onChange={(event) => updateField("season", event.target.value)}
            placeholder={t(locale, "coach.settings.placeholderSeason")}
            disabled={!canEdit || saving}
          />
        </Field>
        <Field label={t(locale, "coach.settings.fieldCountry")}>
          <input
            className={inputClass}
            value={form.country}
            onChange={(event) => updateField("country", event.target.value)}
            placeholder={t(locale, "coach.settings.fieldCountry")}
            disabled={!canEdit || saving}
          />
        </Field>
        <Field label={t(locale, "coach.settings.fieldTimeZone")}>
          <input
            className={inputClass}
            value={form.timeZone}
            onChange={(event) => updateField("timeZone", event.target.value)}
            placeholder={t(locale, "coach.settings.placeholderTz")}
            disabled={!canEdit || saving}
          />
        </Field>
        <Field label={t(locale, "coach.settings.fieldUnits")}>
          <select
            className={`${inputClass} bg-ink-2`}
            value={form.units}
            onChange={(event) => updateField("units", event.target.value)}
            disabled={!canEdit || saving}
          >
            <option value="METRIC">{t(locale, "coach.settings.unitsMetric")}</option>
            <option value="IMPERIAL">{t(locale, "coach.settings.unitsImperial")}</option>
          </select>
        </Field>
        <Field label={t(locale, "coach.settings.fieldLanguage")}>
          <select
            className={`${inputClass} bg-ink-2`}
            value={form.defaultLanguage}
            onChange={(event) => updateField("defaultLanguage", event.target.value)}
            disabled={!canEdit || saving}
          >
            <option value="en">{t(locale, "coach.settings.langEn")}</option>
            <option value="fa">{t(locale, "coach.settings.langFa")}</option>
          </select>
        </Field>
        <ReadOnlyField label={t(locale, "coach.settings.fieldOwner")} value={ownerName} />
        <ReadOnlyField label={t(locale, "coach.settings.fieldRole")} value={roleLabel} />
      </div>

      {error ? <p className="mt-4 text-sm text-red-glow">{error}</p> : null}
      {success ? <p className="mt-4 text-sm text-green-300">{success}</p> : null}
    </form>
  );
}
