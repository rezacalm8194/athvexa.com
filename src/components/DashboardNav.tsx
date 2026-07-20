"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BellIcon, ChevronDownIcon, LogOutIcon, SettingsIcon } from "@/components/icons";

export default function DashboardNav({
  name,
  roleLabel,
  subtitle,
  notificationCount = 0,
  settingsHref,
}: {
  name: string;
  roleLabel: string;
  /** Optional short line under the logo, e.g. a daily summary for coaches. */
  subtitle?: string;
  notificationCount?: number;
  settingsHref?: string;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const initial = name.trim().charAt(0).toUpperCase() || "?";

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
          <button
            type="button"
            aria-label="Notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-md border border-line-1 text-smoke-4 transition-colors hover:border-smoke-4 hover:text-paper-pure"
          >
            <BellIcon className="h-[18px] w-[18px]" />
            {notificationCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red px-1 text-[10px] font-bold text-white">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </button>

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
                {settingsHref && (
                  <Link
                    href={settingsHref}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-smoke-4 transition-colors hover:bg-white/5 hover:text-paper-pure"
                    role="menuitem"
                  >
                    <SettingsIcon className="h-4 w-4" />
                    Settings
                  </Link>
                )}
                <button
                  type="button"
                  onClick={signOut}
                  role="menuitem"
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-smoke-4 transition-colors hover:bg-red/10 hover:text-red-glow"
                >
                  <LogOutIcon className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
