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
import { getCurrentTeamMembership, teamRoleLabel } from "@/lib/teamContext";
import { getUserPreferences } from "@/lib/userPreferences";
import { t } from "@/lib/i18n";
import { roleLabel as translateRole } from "@/lib/i18n";

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
            {[
              ["Team Profile", SettingsIcon],
              ["Staff Management", UsersIcon],
              ["Player Defaults", ClipboardListIcon],
              ["Notifications", BellIcon],
              ["Security", CheckCircleIcon],
              ["Subscription", MailIcon],
              ["Danger Zone", AlertIcon],
            ].map(([label, Icon]) => {
              const TypedIcon = Icon as typeof SettingsIcon;
              return (
                <a key={label as string} href={`#${String(label).toLowerCase().replace(/\s+/g, "-")}`} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-smoke-3 hover:bg-white/5 hover:text-white">
                  <TypedIcon className="h-4 w-4" />
                  {label as string}
                </a>
              );
            })}
          </aside>

          <div className="space-y-5">
            <div id="team-profile">
              <TeamProfileSettings
                team={team}
                ownerName={session.name}
                roleLabel={membership ? teamRoleLabel(membership.role) : translateRole(session.role, locale)}
                canEdit={session.role === "ASSISTANT" || canManageRoles || membership?.role === "OWNER" || membership?.role === "HEAD_COACH"}
              />
            </div>

            <div id="staff-management">
              <SettingCard
                title="Staff Management"
                description="Assistants have full day-to-day operational access. Staff roles, ownership, billing, and other sensitive controls remain with the head coach."
                action={<PlaceholderButton>{canManageRoles ? "Invite staff" : "Coach only"}</PlaceholderButton>}
              >
                <div className="grid gap-3 md:grid-cols-3">
                  <SettingRow label="Current permission" value={canManageRoles ? "Owner controls enabled" : "Full operational access"} />
                  <SettingRow label="Assistant invites" value={canManageRoles ? "Available" : "Restricted"} />
                  <SettingRow label="Role changes" value="Owner only" />
                </div>
              </SettingCard>
            </div>

            <div id="player-defaults">
              <SettingCard
                title="Player Defaults"
                description="Default check-in expectations and roster-level preferences. These controls are placeholders until defaults are persisted."
                action={<PlaceholderButton>Update defaults</PlaceholderButton>}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <SettingRow label="Daily check-in reminder" value="Enabled by default" />
                  <SettingRow label="Readiness attention threshold" value="Below 40" />
                  <SettingRow label="Sleep attention threshold" value="Below 6 hours" />
                  <SettingRow label="Program assignment visibility" value="Active programs only" />
                </div>
              </SettingCard>
            </div>

            <div id="notifications">
              <SettingCard
                title="Notifications"
                description="Choose which operational alerts should be surfaced. Delivery preferences will be wired later."
                action={<PlaceholderButton>Save preferences</PlaceholderButton>}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <TogglePlaceholder label="Player check-ins" checked />
                  <TogglePlaceholder label="Low readiness alerts" checked />
                  <TogglePlaceholder label="Session completion alerts" checked />
                  <TogglePlaceholder label="Weekly summary email" />
                </div>
              </SettingCard>
            </div>

            <div id="security">
              <SettingCard
                title="Security"
                description="Account and access controls for the team workspace. Advanced controls are shown as placeholders."
                action={<PlaceholderButton>Review access</PlaceholderButton>}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <SettingRow label="Team ownership" value="Coach-scoped access" />
                  <SettingRow label="Player data access" value="Roster only" />
                  <SettingRow label="Session policy" value="Secure HTTP-only session" />
                  <SettingRow label="Assistant activity" value="Visible in dashboard and notifications" />
                </div>
              </SettingCard>
            </div>

            <div id="subscription">
              <SettingCard
                title="Subscription"
                description="Plan, billing, and usage limits. Billing integration is not active yet."
                action={<PlaceholderButton>Manage plan</PlaceholderButton>}
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <SettingRow label="Plan" value="Athvexa Team" />
                  <SettingRow label="Billing status" value="Placeholder" />
                  <SettingRow label="Roster capacity" value="Not enforced" />
                </div>
              </SettingCard>
            </div>

            <div id="danger-zone">
              <SettingCard
                title="Danger Zone"
                description="High-impact actions are collected here and intentionally disabled until backend safeguards are implemented."
                tone="danger"
                action={<TrashIcon className="h-5 w-5 text-red-glow" />}
              >
                <div className="flex flex-col gap-3 sm:flex-row">
                  <PlaceholderButton danger>Archive team</PlaceholderButton>
                  <PlaceholderButton danger>Remove all invitations</PlaceholderButton>
                  <PlaceholderButton danger>Delete team workspace</PlaceholderButton>
                </div>
              </SettingCard>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
