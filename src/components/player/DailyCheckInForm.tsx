"use client";

import { FormEvent, useEffect, useState } from "react";
import { formatDate as formatAppDate } from "@/lib/format";
import { t, type Locale } from "@/lib/i18n";

type CheckIn = {
  id: string;
  date: string;
  readiness: number | null;
  sleepHours: number | null;
  fatigue: number | null;
  soreness: number | null;
  mood: number | null;
  bodyWeight: number | null;
  notes: string | null;
};

type FormState = {
  readiness: string;
  sleepHours: string;
  fatigue: string;
  soreness: string;
  mood: string;
  bodyWeight: string;
  notes: string;
};

const emptyForm: FormState = {
  readiness: "7",
  sleepHours: "",
  fatigue: "3",
  soreness: "3",
  mood: "3",
  bodyWeight: "",
  notes: "",
};

function formatDate(value: string, locale: Locale, timeZone: string | null) {
  return formatAppDate(`${value}T12:00:00Z`, { weekday: "long", month: "long", day: "numeric", year: "numeric" }, locale, timeZone);
}

function formFromCheckIn(checkIn: CheckIn | null): FormState {
  if (!checkIn) return emptyForm;
  return {
    readiness: checkIn.readiness != null ? String(checkIn.readiness) : "7",
    sleepHours: checkIn.sleepHours != null ? String(checkIn.sleepHours) : "",
    fatigue: checkIn.fatigue != null ? String(checkIn.fatigue) : "3",
    soreness: checkIn.soreness != null ? String(checkIn.soreness) : "3",
    mood: checkIn.mood != null ? String(checkIn.mood) : "3",
    bodyWeight: checkIn.bodyWeight != null ? String(checkIn.bodyWeight) : "",
    notes: checkIn.notes ?? "",
  };
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block rounded-md border border-white/5 bg-ink-3 p-4">
      <span className="eyebrow">{label}</span>
      {hint ? <span className="mt-1 block text-xs text-smoke-4">{hint}</span> : null}
      <div className="mt-3">{children}</div>
    </label>
  );
}

export default function DailyCheckInForm({ locale, timeZone }: { locale: Locale; timeZone: string | null }) {
  const [date, setDate] = useState<string | null>(null);
  const [checkIn, setCheckIn] = useState<CheckIn | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/player/check-in", { cache: "no-store" })
      .then((res) => res.json().then((payload) => ({ ok: res.ok, payload })))
      .then(({ ok, payload }) => {
        if (!ok) throw new Error(payload.error || t(locale, "player.checkIn.loadError"));
        setDate(payload.date);
        setCheckIn(payload.checkIn);
        setForm(formFromCheckIn(payload.checkIn));
      })
      .catch((err) => setError(err instanceof Error ? err.message : t(locale, "player.checkIn.loadError")))
      .finally(() => setLoading(false));
  }, [locale]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function numberValue(value: string) {
    return value.trim() === "" ? null : Number(value);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload = {
      readiness: Number(form.readiness),
      sleepHours: Number(form.sleepHours),
      fatigue: Number(form.fatigue),
      soreness: Number(form.soreness),
      mood: Number(form.mood),
      bodyWeight: numberValue(form.bodyWeight),
      notes: form.notes,
    };

    try {
      const res = await fetch("/api/player/check-in", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t(locale, "player.checkIn.saveError"));
      setCheckIn(data.checkIn);
      setForm(formFromCheckIn(data.checkIn));
      setSuccess(data.message || t(locale, "player.checkIn.saved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "player.checkIn.saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="mb-6">
        <div className="eyebrow">{t(locale, "player.checkIn.eyebrow")}</div>
        <h1 className="font-display text-3xl font-extrabold tracking-wide text-white">{t(locale, "player.checkIn.title")}</h1>
        <p className="mt-1 text-sm text-smoke-3">{date ? formatDate(date, locale, timeZone) : t(locale, "player.checkIn.loadingDate")}</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-24 animate-pulse rounded-lg bg-white/5" />
          <div className="h-24 animate-pulse rounded-lg bg-white/5" />
          <div className="h-32 animate-pulse rounded-lg bg-white/5" />
        </div>
      ) : null}

      {!loading ? (
        <form className="space-y-4" onSubmit={save}>
          <div className="rounded-lg border border-white/5 bg-ink-3 p-4">
            <div className="font-display text-lg font-bold text-white">
              {checkIn ? t(locale, "player.checkIn.editing") : t(locale, "player.checkIn.empty")}
            </div>
            <p className="mt-1 text-sm text-smoke-3">
              {checkIn ? t(locale, "player.checkIn.editingHint") : t(locale, "player.checkIn.emptyHint")}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t(locale, "player.checkIn.readiness")} hint={t(locale, "player.checkIn.readinessHint")}>
              <input
                className="input-field"
                type="number"
                min={1}
                max={10}
                value={form.readiness}
                onChange={(event) => set("readiness", event.target.value)}
                required
              />
            </Field>
            <Field label={t(locale, "player.checkIn.sleepHours")}>
              <input
                className="input-field"
                type="number"
                min={0}
                max={24}
                step={0.25}
                value={form.sleepHours}
                onChange={(event) => set("sleepHours", event.target.value)}
                required
              />
            </Field>
            <Field label={t(locale, "player.checkIn.fatigue")} hint={t(locale, "player.checkIn.fatigueHint")}>
              <input className="input-field" type="number" min={1} max={5} value={form.fatigue} onChange={(event) => set("fatigue", event.target.value)} required />
            </Field>
            <Field label={t(locale, "player.checkIn.soreness")} hint={t(locale, "player.checkIn.sorenessHint")}>
              <input className="input-field" type="number" min={1} max={5} value={form.soreness} onChange={(event) => set("soreness", event.target.value)} required />
            </Field>
            <Field label={t(locale, "player.checkIn.mood")} hint={t(locale, "player.checkIn.moodHint")}>
              <input className="input-field" type="number" min={1} max={5} value={form.mood} onChange={(event) => set("mood", event.target.value)} required />
            </Field>
            <Field label={t(locale, "player.checkIn.bodyWeight")} hint={t(locale, "player.checkIn.optional")}>
              <input
                className="input-field"
                type="number"
                min={20}
                max={400}
                step={0.1}
                value={form.bodyWeight}
                onChange={(event) => set("bodyWeight", event.target.value)}
              />
            </Field>
          </div>

          <Field label={t(locale, "player.checkIn.notes")} hint={t(locale, "player.checkIn.optional")}>
            <textarea
              className="input-field min-h-28 resize-none"
              value={form.notes}
              onChange={(event) => set("notes", event.target.value)}
              placeholder={t(locale, "player.checkIn.notesPlaceholder")}
            />
          </Field>

          {error ? <p className="rounded-md border border-red/30 bg-red/10 px-4 py-3 text-sm text-red-glow">{error}</p> : null}
          {success ? <p className="rounded-md border border-[#4CAF50]/30 bg-[#4CAF50]/10 px-4 py-3 text-sm text-[#80D987]">{success}</p> : null}

          <button className="btn-primary !px-5 !py-3 text-sm" type="submit" disabled={saving}>
            {saving ? t(locale, "player.checkIn.saving") : t(locale, "player.checkIn.save")}
          </button>
        </form>
      ) : null}
    </section>
  );
}
