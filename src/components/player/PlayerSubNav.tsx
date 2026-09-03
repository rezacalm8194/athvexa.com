"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { t, type Locale } from "@/lib/i18n";

const TABS = [
  { href: "/dashboard/player", key: "nav.player.today" },
  { href: "/dashboard/player/training", key: "nav.player.training" },
  { href: "/dashboard/player/planner", key: "nav.player.planner" },
  { href: "/dashboard/player/habits", key: "nav.player.habits" },
  { href: "/dashboard/player/goals", key: "nav.player.goals" },
  { href: "/dashboard/messages", key: "nav.player.messages" },
] as const;

export default function PlayerSubNav({ locale }: { locale: Locale }) {
  const pathname = usePathname();

  return (
    <nav className="border-b border-white/5 bg-ink-2/50">
      <div className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-6">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${
                active ? "text-white" : "text-smoke-3 hover:text-paper-pure"
              }`}
            >
              {t(locale, tab.key)}
              {active && <span className="absolute inset-x-4 bottom-0 h-[2px] rounded-full bg-red" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
