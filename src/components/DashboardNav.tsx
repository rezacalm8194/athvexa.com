"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BellIcon, ChevronDownIcon, LogOutIcon, MailIcon, SettingsIcon } from "@/components/icons";
import { t, teamRoleLabel, type Locale } from "@/lib/i18n";

type HeaderTeam = {
  id: string;
  name: string;
  role?: string;
  roleLabel: string;
  logo?: string | null;
};

export default function DashboardNav({
  name,
  roleLabel,
  locale,
  subtitle,
  notificationCount = 0,
  settingsHref,
}: {
  name: string;
  roleLabel: string;
  locale: Locale;
  /** Optional short line under the logo, e.g. a daily summary for coaches. */
  subtitle?: string;
  notificationCount?: number;
  settingsHref?: string;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [teams, setTeams] = useState<HeaderTeam[]>([]);
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(notificationCount);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const teamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (teamRef.current && !teamRef.current.contains(e.target as Node)) setTeamOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    fetch("/api/notifications", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.unreadCount === "number") setUnreadCount(data.unreadCount);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/messages/unread", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.unreadCount === "number") setUnreadMessages(data.unreadCount);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/coach/teams", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || !Array.isArray(data.teams)) return;
        setTeams(data.teams);
        setCurrentTeamId(data.currentTeamId ?? data.teams[0]?.id ?? null);
      })
      .catch(() => {});
  }, []);

  async function switchTeam(teamId: string) {
    setTeamOpen(false);
    const res = await fetch(`/api/coach/teams/${teamId}/switch`, { method: "POST" });
    if (!res.ok) return;
    setCurrentTeamId(teamId);
    router.refresh();
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/login");
    router.refresh();
  }

  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const currentTeam = teams.find((team) => team.id === currentTeamId) ?? teams[0];

  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-ink-2/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-6 py-3.5">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-display text-xl font-black tracking-wide text-white">
            ATH<span className="text-red">VEXA</span>
          </Link>
          {subtitle && (
            <>
              <span className="hidden h-5 w-px bg-white/10 sm:block" />
              <span className="hidden text-sm text-smoke-3 sm:block">{subtitle}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {currentTeam && (
            <div className="relative hidden sm:block" ref={teamRef}>
              <button
                type="button"
                onClick={() => setTeamOpen((value) => !value)}
                className="flex max-w-[220px] items-center gap-2 rounded-md border border-line-1 px-3 py-2 text-left transition-colors hover:border-smoke-4"
                aria-haspopup="menu"
                aria-expanded={teamOpen}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded bg-red/15 text-[10px] font-bold text-red">
                  {currentTeam.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={currentTeam.logo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    currentTeam.name.charAt(0).toUpperCase()
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-white">{currentTeam.name}</span>
                  <span className="block truncate text-[10px] uppercase tracking-[0.08em] text-smoke-3">
                    {currentTeam.role ? teamRoleLabel(currentTeam.role, locale) : currentTeam.roleLabel}
                  </span>
                </span>
                <ChevronDownIcon className={`h-4 w-4 shrink-0 text-smoke-3 transition-transform ${teamOpen ? "rotate-180" : ""}`} />
              </button>

              {teamOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-[calc(100%+8px)] w-64 overflow-hidden rounded-md border border-line-1 bg-ink-3 shadow-xl shadow-black/40"
                >
                  <div className="border-b border-white/5 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-smoke-3">
                    {t(locale, "nav.switchTeam")}
                  </div>
                  {teams.map((team) => (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => switchTeam(team.id)}
                      className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-white/5 ${
                        team.id === currentTeam.id ? "text-white" : "text-smoke-4"
                      }`}
                      role="menuitem"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{team.name}</span>
                        <span className="block truncate text-[10px] uppercase tracking-[0.08em] text-smoke-3">
                          {team.role ? teamRoleLabel(team.role, locale) : team.roleLabel}
                        </span>
                      </span>
                      {team.id === currentTeam.id && <span className="h-2 w-2 rounded-full bg-red" />}
                    </button>
                  ))}
                  <div className="border-t border-white/5">
                    <Link
                      href="/dashboard/coach/teams?create=1"
                      onClick={() => setTeamOpen(false)}
                      className="block px-3.5 py-2.5 text-sm text-smoke-4 transition-colors hover:bg-white/5 hover:text-paper-pure"
                      role="menuitem"
                    >
                      {t(locale, "nav.createTeam")}
                    </Link>
                    <Link
                      href="/dashboard/coach/teams"
                      onClick={() => setTeamOpen(false)}
                      className="block px-3.5 py-2.5 text-sm text-smoke-4 transition-colors hover:bg-white/5 hover:text-paper-pure"
                      role="menuitem"
                    >
                      {t(locale, "nav.manageTeams")}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          <Link
            href="/dashboard/messages"
            aria-label={t(locale, "nav.messages")}
            className="relative flex h-9 w-9 items-center justify-center rounded-md border border-line-1 text-smoke-4 transition-colors hover:border-smoke-4 hover:text-paper-pure"
          >
            <MailIcon className="h-[18px] w-[18px]" />
            {unreadMessages > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red px-1 text-[10px] font-bold text-white">
                {unreadMessages > 9 ? "9+" : unreadMessages}
              </span>
            )}
          </Link>

          <Link
            href="/dashboard/notifications"
            aria-label={t(locale, "nav.notifications")}
            className="relative flex h-9 w-9 items-center justify-center rounded-md border border-line-1 text-smoke-4 transition-colors hover:border-smoke-4 hover:text-paper-pure"
          >
            <BellIcon className="h-[18px] w-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red px-1 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-md border border-line-1 py-1.5 pl-1.5 pr-2.5 transition-colors hover:border-smoke-4"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded bg-red/15 text-xs font-bold text-red">
                {initial}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-semibold leading-tight text-white">{name}</span>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-smoke-3">
                  {roleLabel}
                </span>
              </span>
              <ChevronDownIcon className={`h-4 w-4 text-smoke-3 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-[calc(100%+8px)] w-52 overflow-hidden rounded-md border border-line-1 bg-ink-3 shadow-xl shadow-black/40"
              >
                <div className="border-b border-white/5 px-3.5 py-3 sm:hidden">
                  <div className="text-sm font-semibold text-white">{name}</div>
                  <div className="eyebrow">{roleLabel}</div>
                </div>
                <Link
                  href="/dashboard/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-smoke-4 transition-colors hover:bg-white/5 hover:text-paper-pure"
                  role="menuitem"
                >
                  <SettingsIcon className="h-4 w-4" />
                  {t(locale, "nav.preferences")}
                </Link>
                {settingsHref && (
                  <Link
                    href={settingsHref}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-smoke-4 transition-colors hover:bg-white/5 hover:text-paper-pure"
                    role="menuitem"
                  >
                    <SettingsIcon className="h-4 w-4" />
                    {t(locale, "nav.teamSettings")}
                  </Link>
                )}
                <button
                  type="button"
                  onClick={signOut}
                  role="menuitem"
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-smoke-4 transition-colors hover:bg-red/10 hover:text-red-glow"
                >
                  <LogOutIcon className="h-4 w-4" />
                  {t(locale, "nav.signOut")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
