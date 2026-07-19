"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard/player", label: "Today" },
  { href: "/dashboard/player/planner", label: "Planner" },
  { href: "/dashboard/player/habits", label: "Habits" },
  { href: "/dashboard/player/goals", label: "Goals" },
];

export default function PlayerSubNav() {
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
              {tab.label}
              {active && <span className="absolute inset-x-4 bottom-0 h-[2px] rounded-full bg-red" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
