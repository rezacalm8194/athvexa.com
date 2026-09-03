"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PlusIcon, UsersIcon } from "@/components/icons";
import { t, type Locale } from "@/lib/i18n";

type Team = {
  id: string;
  name: string;
  sport?: string | null;
  ageGroup?: string | null;
  season?: string | null;
  country?: string | null;
  timeZone?: string | null;
  logo?: string | null;
  units?: string | null;
  defaultLanguage?: string | null;
  role?: string;
  roleLabel: string;
  playerCount: number;
  staffCount: number;
};

const initialForm = {
  name: "",
  sport: "",
  ageGroup: "",
  season: "",
  country: "",
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
  logo: "",
  units: "METRIC",
  defaultLanguage: "en",
};

function LogoMark({ team }: { team: Team }) {
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-red/15 text-lg font-black text-red">
      {team.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.logo} alt="" className="h-full w-full object-cover" />
      ) : (
        team.name.charAt(0).toUpperCase()
      )}
    </div>
  );
}

function teamRoleDisplay(role: string | undefined, fallback: string, locale: Locale) {
  const keyByRole: Record<string, string> = {
    OWNER: "coach.teams.roleOwner",
    HEAD_COACH: "coach.teams.roleHeadCoach",
    ASSISTANT_COACH: "coach.teams.roleAssistantCoach",
    ANALYST: "coach.teams.roleAnalyst",
    PHYSIO: "coach.teams.rolePhysio",
    PLAYER: "coach.teams.rolePlayer",
  };
  if (role && keyByRole[role]) return t(locale, keyByRole[role]);
  return fallback;
}

export default function TeamsPageView({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const currentTeam = useMemo(() => teams.find((team) => team.id === currentTeamId), [teams, currentTeamId]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/coach/teams", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? t(locale, "coach.teams.loadError"));
      setTeams(data.teams ?? []);
      setCurrentTeamId(data.currentTeamId ?? data.teams?.[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "coach.teams.loadError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("create") === "1") setShowCreate(true);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createTeam(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/coach/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? t(locale, "coach.teams.createError"));
      setSuccess(t(locale, "coach.teams.created"));
      setForm(initialForm);
      setShowCreate(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "coach.teams.createError"));
    } finally {
      setSaving(false);
    }
  }

  async function openTeam(teamId: string, href: string) {
    await fetch(`/api/coach/teams/${teamId}/switch`, { method: "POST" });
    setCurrentTeamId(teamId);
    router.push(href);
    router.refresh();
  }

  const createFields: { key: keyof typeof initialForm; label: string; placeholder: string; required?: boolean }[] = [
    { key: "name", label: t(locale, "coach.teams.fieldName"), placeholder: t(locale, "coach.teams.phName"), required: true },
    { key: "sport", label: t(locale, "coach.teams.fieldSport"), placeholder: t(locale, "coach.teams.phSport") },
    { key: "ageGroup", label: t(locale, "coach.teams.fieldAgeGroup"), placeholder: t(locale, "coach.teams.phAge") },
    { key: "season", label: t(locale, "coach.teams.fieldSeason"), placeholder: t(locale, "coach.teams.phSeason") },
    { key: "country", label: t(locale, "coach.teams.fieldCountry"), placeholder: t(locale, "coach.teams.phCountry") },
    { key: "timeZone", label: t(locale, "coach.teams.fieldTimeZone"), placeholder: t(locale, "coach.teams.phTz") },
    { key: "logo", label: t(locale, "coach.teams.fieldLogo"), placeholder: t(locale, "coach.teams.phLogo") },
    { key: "defaultLanguage", label: t(locale, "coach.teams.fieldLanguage"), placeholder: t(locale, "coach.teams.phLang") },
  ];

  return (
    <section className="mx-auto max-w-[1280px] px-6 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="eyebrow">{t(locale, "coach.teams.eyebrow")}</div>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-wide text-white">{t(locale, "coach.teams.title")}</h1>
          <p className="mt-2 text-sm text-smoke-3">{t(locale, "coach.teams.subtitle")}</p>
        </div>
        <button className="btn-primary justify-center gap-2 !px-4 !py-3 text-sm" onClick={() => setShowCreate(true)}>
          <PlusIcon className="h-4 w-4" />
          {t(locale, "coach.teams.create")}
        </button>
      </div>

      {success && <div className="mt-5 rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-200">{success}</div>}
      {error && <div className="mt-5 rounded-md border border-red/40 bg-red/10 px-4 py-3 text-sm text-red-glow">{error}</div>}

      <div className="mt-8">
        {loading ? (
          <div className="card p-8 text-sm text-smoke-3">{t(locale, "coach.teams.loading")}</div>
        ) : teams.length === 0 ? (
          <div className="card flex flex-col items-center justify-center p-10 text-center">
            <UsersIcon className="h-8 w-8 text-smoke-3" />
            <h2 className="mt-4 font-display text-2xl font-bold text-white">{t(locale, "coach.teams.emptyTitle")}</h2>
            <p className="mt-2 max-w-md text-sm text-smoke-3">{t(locale, "coach.teams.emptyBody")}</p>
            <button className="btn-primary mt-5 !px-4 !py-3 text-sm" onClick={() => setShowCreate(true)}>
              {t(locale, "coach.teams.create")}
            </button>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {teams.map((team) => (
              <article key={team.id} className={`card p-5 ${team.id === currentTeam?.id ? "border-red/40" : ""}`}>
                <div className="flex items-start gap-4">
                  <LogoMark team={team} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-display text-2xl font-bold text-white">{team.name}</h2>
                      {team.id === currentTeam?.id && (
                        <span className="rounded bg-red/15 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-red">
                          {t(locale, "coach.teams.current")}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-smoke-3">
                      {[team.sport, team.ageGroup, team.season].filter(Boolean).join(" / ") || t(locale, "coach.teams.detailsPending")}
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                    <div className="text-xl font-black text-white">{team.playerCount}</div>
                    <div className="mt-1 text-xs text-smoke-3">{t(locale, "coach.teams.players")}</div>
                  </div>
                  <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                    <div className="text-xl font-black text-white">{team.staffCount}</div>
                    <div className="mt-1 text-xs text-smoke-3">{t(locale, "coach.teams.staff")}</div>
                  </div>
                  <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                    <div className="truncate text-sm font-bold text-white">
                      {teamRoleDisplay(team.role, team.roleLabel, locale)}
                    </div>
                    <div className="mt-1 text-xs text-smoke-3">{t(locale, "coach.teams.yourRole")}</div>
                  </div>
                  <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                    <div className="truncate text-sm font-bold text-white">
                      {team.units === "IMPERIAL"
                        ? t(locale, "coach.teams.unitsImperial")
                        : t(locale, "coach.teams.unitsMetric")}
                    </div>
                    <div className="mt-1 text-xs text-smoke-3">{t(locale, "coach.teams.units")}</div>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openTeam(team.id, `/dashboard/coach/teams/${team.id}/players`)}
                    className="btn-primary !px-4 !py-2.5 text-xs"
                  >
                    {t(locale, "coach.teams.openTeam")}
                  </button>
                  <button
                    type="button"
                    onClick={() => openTeam(team.id, `/dashboard/coach/teams/${team.id}/settings`)}
                    className="btn-ghost !px-4 !py-2.5 text-xs"
                  >
                    {t(locale, "coach.teams.teamSettings")}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm">
          <form onSubmit={createTeam} className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="eyebrow">{t(locale, "coach.teams.newEyebrow")}</div>
                <h2 className="mt-1 font-display text-2xl font-bold text-white">{t(locale, "coach.teams.create")}</h2>
              </div>
              <button type="button" className="btn-ghost !px-3 !py-2 text-xs" onClick={() => setShowCreate(false)} disabled={saving}>
                {t(locale, "coach.teams.close")}
              </button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {createFields.map(({ key, label, placeholder, required }) => (
                <label key={key} className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-smoke-4">{label}</span>
                  <input
                    className="input-field"
                    value={form[key]}
                    onChange={(event) => setForm((value) => ({ ...value, [key]: event.target.value }))}
                    placeholder={placeholder}
                    required={required}
                  />
                </label>
              ))}
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-smoke-4">{t(locale, "coach.teams.units")}</span>
                <select className="input-field" value={form.units} onChange={(event) => setForm((value) => ({ ...value, units: event.target.value }))}>
                  <option value="METRIC">{t(locale, "coach.teams.unitsMetric")}</option>
                  <option value="IMPERIAL">{t(locale, "coach.teams.unitsImperial")}</option>
                </select>
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="btn-ghost !px-4 !py-2.5 text-sm" onClick={() => setShowCreate(false)} disabled={saving}>
                {t(locale, "common.cancel")}
              </button>
              <button type="submit" className="btn-primary !px-4 !py-2.5 text-sm" disabled={saving}>
                {saving ? t(locale, "coach.teams.creating") : t(locale, "coach.teams.create")}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
