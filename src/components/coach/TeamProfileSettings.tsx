"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

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
}: {
  team: TeamProfileValue | null;
  ownerName: string;
  roleLabel: string;
  canEdit: boolean;
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
      if (!res.ok) throw new Error(data.error ?? "Could not save team profile.");
      setSuccess("Team profile saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save team profile.");
    } finally {
      setSaving(false);
    }
  }

  if (!team) {
    return (
      <section className="rounded-lg border border-white/5 bg-ink-3 p-5">
        <h2 className="font-display text-lg font-bold text-white">Team Profile</h2>
        <p className="mt-1 max-w-2xl text-sm text-smoke-3">Create a team before you can edit its public identity and sport context.</p>
        <a href="/dashboard/coach/teams?create=1" className="btn-primary mt-5 !px-3.5 !py-2 text-xs">
          Create team
        </a>
      </section>
    );
  }

  const inputClass = "w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:font-normal placeholder:text-smoke-3 disabled:cursor-not-allowed disabled:opacity-70";

  return (
    <form onSubmit={save} className="rounded-lg border border-white/5 bg-ink-3 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-white">Team Profile</h2>
          <p className="mt-1 max-w-2xl text-sm text-smoke-3">
            {canEdit
              ? "Update the public identity and core sport context for this team."
              : "Only a head coach can change this team's public identity."}
          </p>
        </div>
        <button className="btn-ghost !px-3.5 !py-2 text-xs" type="submit" disabled={!canEdit || saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Field label="Team name">
          <input
            className={inputClass}
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="e.g. Athvexa U19"
            required
            disabled={!canEdit || saving}
          />
        </Field>
        <Field label="Sport">
          <input
            className={inputClass}
            value={form.sport}
            onChange={(event) => updateField("sport", event.target.value)}
            placeholder="e.g. Football"
            disabled={!canEdit || saving}
          />
        </Field>
        <Field label="Age group">
          <input
            className={inputClass}
            value={form.ageGroup}
            onChange={(event) => updateField("ageGroup", event.target.value)}
            placeholder="e.g. U19"
            disabled={!canEdit || saving}
          />
        </Field>
        <Field label="Season">
          <input
            className={inputClass}
            value={form.season}
            onChange={(event) => updateField("season", event.target.value)}
            placeholder="e.g. 2026/27"
            disabled={!canEdit || saving}
          />
        </Field>
        <Field label="Country">
          <input
            className={inputClass}
            value={form.country}
            onChange={(event) => updateField("country", event.target.value)}
            placeholder="Country"
            disabled={!canEdit || saving}
          />
        </Field>
        <Field label="Time zone">
          <input
            className={inputClass}
            value={form.timeZone}
            onChange={(event) => updateField("timeZone", event.target.value)}
            placeholder="e.g. Asia/Tehran"
            disabled={!canEdit || saving}
          />
        </Field>
        <Field label="Units">
          <select
            className={`${inputClass} bg-ink-2`}
            value={form.units}
            onChange={(event) => updateField("units", event.target.value)}
            disabled={!canEdit || saving}
          >
            <option value="METRIC">Metric</option>
            <option value="IMPERIAL">Imperial</option>
          </select>
        </Field>
        <Field label="Default language">
          <input
            className={inputClass}
            value={form.defaultLanguage}
            onChange={(event) => updateField("defaultLanguage", event.target.value)}
            placeholder="en"
            disabled={!canEdit || saving}
          />
        </Field>
        <ReadOnlyField label="Owner" value={ownerName} />
        <ReadOnlyField label="Role" value={roleLabel} />
      </div>

      {error ? <p className="mt-4 text-sm text-red-glow">{error}</p> : null}
      {success ? <p className="mt-4 text-sm text-green-300">{success}</p> : null}
    </form>
  );
}
