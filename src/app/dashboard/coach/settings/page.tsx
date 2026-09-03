import type { ReactNode } from "react";
import ServerDashboardNav from "@/components/ServerDashboardNav";
import CoachNav from "@/components/coach/CoachNav";
import {
  AlertIcon,
  BellIcon,
  CheckCircleIcon,
  ClipboardListIcon,
  MailIcon,
  SettingsIcon,
  TrashIcon,
  UsersIcon,
} from "@/components/icons";
import TeamProfileSettings from "@/components/coach/TeamProfileSettings";
import { getCoachContext } from "@/lib/coachContext";
import { getCurrentTeamMembership } from "@/lib/teamContext";
import { getUserPreferences } from "@/lib/userPreferences";
import { roleLabel as translateRole, t, teamRoleLabel } from "@/lib/i18n";

function SettingCard({
  title,
  description,
  children,
  action,
  tone = "default",
}: {
  title: string;
  description: string;
  children?: ReactNode;
  action?: ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <section className={`rounded-lg border p-5 ${tone === "danger" ? "border-red/25 bg-red/5" : "border-white/5 bg-ink-3"}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-white">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm text-smoke-3">{description}</p>
        </div>
        {action}
      </div>
      {children ? <div className="mt-5">{children}</div> : null}
    </section>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line-1 bg-ink-2 p-3">
      <div className="eyebrow">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function PlaceholderButton({ children, danger = false }: { children: ReactNode; danger?: boolean }) {
  return (
    <button
      className={`${danger ? "btn-ghost text-red-glow" : "btn-ghost"} !px-3.5 !py-2 text-xs opacity-70`}
      type="button"
      disabled
    >
      {children}
    </button>
  );
}

function TogglePlaceholder({ label, checked = false }: { label: string; checked?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-line-1 bg-ink-2 p-3">
      <span className="text-sm text-paper">{label}</span>
      <span className={`h-6 w-11 rounded-full p-1 ${checked ? "bg-red" : "bg-white/10"}`}>
        <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : ""}`} />
      </span>
    </div>
  );
}

const SETTINGS_NAV = [
  { id: "team-profile", labelKey: "coach.settings.navTeamProfile", Icon: SettingsIcon },
  { id: "staff-management", labelKey: "coach.settings.navStaff", Icon: UsersIcon },
  { id: "player-defaults", labelKey: "coach.settings.navDefaults", Icon: ClipboardListIcon },
  { id: "notifications", labelKey: "coach.settings.navNotifications", Icon: BellIcon },
  { id: "security", labelKey: "coach.settings.navSecurity", Icon: CheckCircleIcon },
  { id: "subscription", labelKey: "coach.settings.navSubscription", Icon: MailIcon },
  { id: "danger-zone", labelKey: "coach.settings.navDanger", Icon: AlertIcon },
] as const;

export default async function SettingsPage() {
  const { session, team: fallbackTeam, canManageRoles } = await getCoachContext();
  const { locale } = await getUserPreferences(session.sub);
  const membership = await getCurrentTeamMembership(session.sub);
  const team = membership?.team ?? fallbackTeam;

  return (
    <main className="min-h-screen bg-ink">
      <ServerDashboardNav name={session.name} locale={locale} settingsHref="/dashboard/coach/settings" />
      <CoachNav locale={locale} />

      <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-red">{t(locale, "coach.settings.eyebrow")}</p>
          <h1 className="mt-2 font-display text-3xl font-black text-white sm:text-4xl">{t(locale, "coach.settings.title")}</h1>
          <p className="mt-2 max-w-2xl text-sm text-smoke-3">{t(locale, "coach.settings.subtitle")}</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
          <aside className="h-fit rounded-lg border border-white/5 bg-ink-3 p-3 lg:sticky lg:top-24">
            {SETTINGS_NAV.map(({ id, labelKey, Icon }) => (
              <a key={id} href={`#${id}`} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-smoke-3 hover:bg-white/5 hover:text-white">
                <Icon className="h-4 w-4" />
                {t(locale, labelKey)}
              </a>
            ))}
          </aside>

          <div className="space-y-5">
            <div id="team-profile">
              <TeamProfileSettings
                team={team}
                ownerName={session.name}
                roleLabel={membership ? teamRoleLabel(membership.role, locale) : translateRole(session.role, locale)}
                canEdit={session.role === "ASSISTANT" || canManageRoles || membership?.role === "OWNER" || membership?.role === "HEAD_COACH"}
                locale={locale}
              />
            </div>

            <div id="staff-management">
              <SettingCard
                title={t(locale, "coach.settings.staffTitle")}
                description={t(locale, "coach.settings.staffDesc")}
                action={<PlaceholderButton>{canManageRoles ? t(locale, "coach.settings.inviteStaff") : t(locale, "coach.settings.coachOnly")}</PlaceholderButton>}
              >
                <div className="grid gap-3 md:grid-cols-3">
                  <SettingRow label={t(locale, "coach.settings.currentPermission")} value={canManageRoles ? t(locale, "coach.settings.ownerControls") : t(locale, "coach.settings.fullOps")} />
                  <SettingRow label={t(locale, "coach.settings.assistantInvites")} value={canManageRoles ? t(locale, "coach.settings.available") : t(locale, "coach.settings.restricted")} />
                  <SettingRow label={t(locale, "coach.settings.roleChanges")} value={t(locale, "coach.settings.ownerOnly")} />
                </div>
              </SettingCard>
            </div>

            <div id="player-defaults">
              <SettingCard
                title={t(locale, "coach.settings.defaultsTitle")}
                description={t(locale, "coach.settings.defaultsDesc")}
                action={<PlaceholderButton>{t(locale, "coach.settings.updateDefaults")}</PlaceholderButton>}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <SettingRow label={t(locale, "coach.settings.dailyReminder")} value={t(locale, "coach.settings.enabledDefault")} />
                  <SettingRow label={t(locale, "coach.settings.readinessThreshold")} value={t(locale, "coach.settings.below40")} />
                  <SettingRow label={t(locale, "coach.settings.sleepThreshold")} value={t(locale, "coach.settings.below6h")} />
                  <SettingRow label={t(locale, "coach.settings.programVisibility")} value={t(locale, "coach.settings.activeOnly")} />
                </div>
              </SettingCard>
            </div>

            <div id="notifications">
              <SettingCard
                title={t(locale, "coach.settings.notifTitle")}
                description={t(locale, "coach.settings.notifDesc")}
                action={<PlaceholderButton>{t(locale, "coach.settings.savePrefs")}</PlaceholderButton>}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <TogglePlaceholder label={t(locale, "coach.settings.notifCheckIns")} checked />
                  <TogglePlaceholder label={t(locale, "coach.settings.notifLowReadiness")} checked />
                  <TogglePlaceholder label={t(locale, "coach.settings.notifSession")} checked />
                  <TogglePlaceholder label={t(locale, "coach.settings.notifWeekly")} />
                </div>
              </SettingCard>
            </div>

            <div id="security">
              <SettingCard
                title={t(locale, "coach.settings.securityTitle")}
                description={t(locale, "coach.settings.securityDesc")}
                action={<PlaceholderButton>{t(locale, "coach.settings.reviewAccess")}</PlaceholderButton>}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <SettingRow label={t(locale, "coach.settings.teamOwnership")} value={t(locale, "coach.settings.coachScoped")} />
                  <SettingRow label={t(locale, "coach.settings.playerDataAccess")} value={t(locale, "coach.settings.rosterOnly")} />
                  <SettingRow label={t(locale, "coach.settings.sessionPolicy")} value={t(locale, "coach.settings.secureSession")} />
                  <SettingRow label={t(locale, "coach.settings.assistantActivity")} value={t(locale, "coach.settings.activityVisible")} />
                </div>
              </SettingCard>
            </div>

            <div id="subscription">
              <SettingCard
                title={t(locale, "coach.settings.subTitle")}
                description={t(locale, "coach.settings.subDesc")}
                action={<PlaceholderButton>{t(locale, "coach.settings.managePlan")}</PlaceholderButton>}
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <SettingRow label={t(locale, "coach.settings.plan")} value={t(locale, "coach.settings.planValue")} />
                  <SettingRow label={t(locale, "coach.settings.billingStatus")} value={t(locale, "coach.settings.placeholder")} />
                  <SettingRow label={t(locale, "coach.settings.rosterCapacity")} value={t(locale, "coach.settings.notEnforced")} />
                </div>
              </SettingCard>
            </div>

            <div id="danger-zone">
              <SettingCard
                title={t(locale, "coach.settings.dangerTitle")}
                description={t(locale, "coach.settings.dangerDesc")}
                tone="danger"
                action={<TrashIcon className="h-5 w-5 text-red-glow" />}
              >
                <div className="flex flex-col gap-3 sm:flex-row">
                  <PlaceholderButton danger>{t(locale, "coach.settings.archiveTeam")}</PlaceholderButton>
                  <PlaceholderButton danger>{t(locale, "coach.settings.removeInvites")}</PlaceholderButton>
                  <PlaceholderButton danger>{t(locale, "coach.settings.deleteWorkspace")}</PlaceholderButton>
                </div>
              </SettingCard>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
