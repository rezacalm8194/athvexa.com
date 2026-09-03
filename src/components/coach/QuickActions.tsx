import Link from "next/link";
import { BarChartIcon, ClipboardListIcon, MailIcon, UsersIcon } from "@/components/icons";
import { t, type Locale } from "@/lib/i18n";

export default function QuickActions({ canManageRoles, locale }: { canManageRoles: boolean; locale: Locale }) {
  const actions = [
    { href: "#invite-panel", label: t(locale, "coach.dashboard.invitePlayer"), icon: MailIcon },
    { href: "/dashboard/coach/players", label: t(locale, "coach.dashboard.viewPlayers"), icon: UsersIcon },
    { href: "/dashboard/coach/programs", label: t(locale, "coach.dashboard.buildProgram"), icon: ClipboardListIcon },
    { href: "/dashboard/coach/reports", label: t(locale, "coach.dashboard.viewReports"), icon: BarChartIcon },
  ];

  return (
    <div className="card p-5">
      <h2 className="mb-3 font-display text-lg font-bold tracking-wide text-white">{t(locale, "coach.dashboard.quickActions")}</h2>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="flex flex-col items-center gap-2 rounded-md border border-line-1 px-3 py-4 text-center text-xs font-medium text-smoke-4 transition-colors hover:border-red/40 hover:bg-red/5 hover:text-paper-pure"
            >
              <Icon className="h-5 w-5" />
              {action.label}
            </Link>
          );
        })}
      </div>
      {!canManageRoles && (
        <p className="mt-3 text-[11px] text-smoke-3">{t(locale, "coach.dashboard.assistantInviteHint")}</p>
      )}
    </div>
  );
}
