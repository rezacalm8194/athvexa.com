"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChartIcon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  GridIcon,
  MailIcon,
  SettingsIcon,
  UsersIcon,
} from "@/components/icons";

const TABS = [
  { href: "/dashboard/coach", label: "Dashboard", icon: GridIcon },
  { href: "/dashboard/coach/players", label: "Players", icon: UsersIcon },
  { href: "/dashboard/coach/programs", label: "Programs", icon: ClipboardListIcon },
  { href: "/dashboard/coach/assessments", label: "Assessments", icon: ClipboardCheckIcon },
  { href: "/dashboard/coach/reports", label: "Reports", icon: BarChartIcon },
  { href: "/dashboard/coach/invitations", label: "Invitations", icon: MailIcon },
  { href: "/dashboard/coach/settings", label: "Settings", icon: SettingsIcon },
];

export default function CoachNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-[57px] z-20 border-b border-white/5 bg-ink-2/70 backdrop-blur">
      <div className="mx-auto flex max-w-[1280px] gap-1 overflow-x-auto px-4">
        {TABS.map((tab) => {
          const active = tab.href === "/dashboard/coach" ? pathname === tab.href : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex shrink-0 items-center gap-2 whitespace-nowrap px-3.5 py-3 text-sm font-medium transition-colors ${
                active ? "text-white" : "text-smoke-3 hover:text-paper-pure"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {active && <span className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-red" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
