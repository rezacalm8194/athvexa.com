"use client";

import { useEffect, useState } from "react";
import type { TeamWorkspace } from "@/lib/teamWorkspace";
import { t, type Locale } from "@/lib/i18n";

export default function SubscriptionSettings({
  locale,
  teamId,
  canEdit,
  playerCount,
  initial,
}: {
  locale: Locale;
  teamId: string | null;
  canEdit: boolean;
  playerCount: number;
  initial: TeamWorkspace;
}) {
  const [capacity, setCapacity] = useState(initial.rosterCapacity);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setCapacity(initial.rosterCapacity);
  }, [initial.rosterCapacity]);

  async function save() {
    if (!teamId || !canEdit) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/coach/teams/${teamId}/workspace`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rosterCapacity: capacity }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t(locale, "coach.settings.subSaveError"));
      if (data.workspace?.rosterCapacity) setCapacity(data.workspace.rosterCapacity);
      setSuccess(t(locale, "coach.settings.subSaved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "coach.settings.subSaveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-lg border border-white/5 bg-ink-3 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-white">{t(locale, "coach.settings.subTitle")}</h2>
          <p className="mt-1 max-w-2xl text-sm text-smoke-3">{t(locale, "coach.settings.subDesc")}</p>
        </div>
        <button className="btn-ghost !px-3.5 !py-2 text-xs" type="button" onClick={save} disabled={!canEdit || saving || !teamId}>
          {saving ? t(locale, "coach.settings.saving") : t(locale, "coach.settings.managePlan")}
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-line-1 bg-ink-2 p-3">
          <div className="eyebrow">{t(locale, "coach.settings.plan")}</div>
          <div className="mt-1 text-sm font-semibold text-white">{t(locale, "coach.settings.planValue")}</div>
        </div>
        <div className="rounded-md border border-line-1 bg-ink-2 p-3">
          <div className="eyebrow">{t(locale, "coach.settings.billingStatus")}</div>
          <div className="mt-1 text-sm font-semibold text-white">{t(locale, "coach.settings.billingIncluded")}</div>
        </div>
        <label className="rounded-md border border-line-1 bg-ink-2 p-3">
          <div className="eyebrow">{t(locale, "coach.settings.rosterCapacity")}</div>
          <input
            className="mt-1 w-full bg-transparent text-sm font-semibold text-white outline-none"
            type="number"
            min={Math.max(5, playerCount)}
            max={500}
            value={capacity}
            disabled={!canEdit || saving}
            onChange={(event) => setCapacity(Number(event.target.value))}
          />
          <p className="mt-1 text-xs text-smoke-3">{t(locale, "coach.settings.rosterUsed", { used: playerCount, capacity })}</p>
        </label>
      </div>

      {error ? <p className="mt-4 text-sm text-red-glow">{error}</p> : null}
      {success ? <p className="mt-4 text-sm text-green-300">{success}</p> : null}
    </section>
  );
}
