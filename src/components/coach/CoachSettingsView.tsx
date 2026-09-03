import {
  AlertIcon,
  BellIcon,
  CheckCircleIcon,
  ClipboardListIcon,
  MailIcon,
  SettingsIcon,
  UsersIcon,
} from "@/components/icons";
import DangerZoneSettings from "@/components/coach/DangerZoneSettings";
import NotificationSettings from "@/components/coach/NotificationSettings";
import PlayerDefaultsSettings from "@/components/coach/PlayerDefaultsSettings";
import SecuritySettings from "@/components/coach/SecuritySettings";
import StaffSettings from "@/components/coach/StaffSettings";
import SubscriptionSettings from "@/components/coach/SubscriptionSettings";
import TeamProfileSettings from "@/components/coach/TeamProfileSettings";
import type { CoachSettingsModel } from "@/lib/coachSettingsData";
import { t } from "@/lib/i18n";

const SETTINGS_NAV = [
  { id: "team-profile", labelKey: "coach.settings.navTeamProfile", Icon: SettingsIcon },
  { id: "staff-management", labelKey: "coach.settings.navStaff", Icon: UsersIcon },
  { id: "player-defaults", labelKey: "coach.settings.navDefaults", Icon: ClipboardListIcon },
  { id: "notifications", labelKey: "coach.settings.navNotifications", Icon: BellIcon },
  { id: "security", labelKey: "coach.settings.navSecurity", Icon: CheckCircleIcon },
  { id: "subscription", labelKey: "coach.settings.navSubscription", Icon: MailIcon },
  { id: "danger-zone", labelKey: "coach.settings.navDanger", Icon: AlertIcon },
] as const;

export default function CoachSettingsView({ model }: { model: CoachSettingsModel }) {
  const {
    locale,
    session,
    team,
    workspace,
    staffMembers,
    playerCount,
    canManageRoles,
    canEditWorkspace,
    notificationPrefs,
    roleLabel,
    canEditProfile,
  } = model;

  return (
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
          <div id="team-profile" className="scroll-mt-28">
            <TeamProfileSettings
              team={team}
              ownerName={session.name}
              roleLabel={roleLabel}
              canEdit={canEditProfile}
              locale={locale}
            />
          </div>

          <div id="staff-management" className="scroll-mt-28">
            <StaffSettings locale={locale} teamId={team?.id ?? null} canManage={canManageRoles} initialMembers={staffMembers} />
          </div>

          <div id="player-defaults" className="scroll-mt-28">
            <PlayerDefaultsSettings locale={locale} teamId={team?.id ?? null} canEdit={canEditWorkspace} initial={workspace} />
          </div>

          <div id="notifications" className="scroll-mt-28">
            <NotificationSettings locale={locale} initial={notificationPrefs} />
          </div>

          <div id="security" className="scroll-mt-28">
            <SecuritySettings
              locale={locale}
              teamId={team?.id ?? null}
              canEdit={canEditWorkspace}
              ownerName={session.name}
              currentRole={roleLabel}
              playerCount={playerCount}
              sessionLabel={t(locale, "coach.settings.secureSession")}
              initialWorkspace={workspace}
              accessMembers={staffMembers}
            />
          </div>

          <div id="subscription" className="scroll-mt-28">
            <SubscriptionSettings locale={locale} teamId={team?.id ?? null} canEdit={canEditWorkspace} playerCount={playerCount} initial={workspace} />
          </div>

          <div id="danger-zone" className="scroll-mt-28">
            <DangerZoneSettings
              locale={locale}
              teamId={team?.id ?? null}
              teamName={team?.name ?? ""}
              canManage={canManageRoles}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
