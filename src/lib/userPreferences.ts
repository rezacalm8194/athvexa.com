import { cookies, headers } from "next/headers";
import { db, ensureDatabase } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import { getSession } from "@/lib/session";

export type CoachNotificationPrefs = {
  checkIns: boolean;
  lowReadiness: boolean;
  sessionComplete: boolean;
  weeklyEmail: boolean;
};

const PREF_NOTIFICATION_TYPES: Record<keyof Omit<CoachNotificationPrefs, "weeklyEmail">, string[]> = {
  checkIns: ["PLAYER_CHECK_IN_SUBMITTED", "PLAYER_NO_CHECK_IN"],
  lowReadiness: ["PLAYER_LOW_READINESS"],
  sessionComplete: ["PLAYER_SESSION_COMPLETED", "PLAYER_SESSION_SKIPPED"],
};

export function parseCoachNotificationPrefs(user?: {
  notifyCheckIns?: boolean | null;
  notifyLowReadiness?: boolean | null;
  notifySessionComplete?: boolean | null;
  notifyWeeklyEmail?: boolean | null;
} | null): CoachNotificationPrefs {
  return {
    checkIns: user?.notifyCheckIns !== false,
    lowReadiness: user?.notifyLowReadiness !== false,
    sessionComplete: user?.notifySessionComplete !== false,
    weeklyEmail: user?.notifyWeeklyEmail === true,
  };
}

export function hiddenNotificationTypes(prefs: CoachNotificationPrefs): string[] {
  return (Object.keys(PREF_NOTIFICATION_TYPES) as Array<keyof typeof PREF_NOTIFICATION_TYPES>).flatMap((key) =>
    prefs[key] ? [] : PREF_NOTIFICATION_TYPES[key]
  );
}

export function allowsNotificationType(prefs: CoachNotificationPrefs, type: string): boolean {
  return !hiddenNotificationTypes(prefs).includes(type);
}

export async function getUserPreferences(userId: string): Promise<{ locale: Locale; timeZone: string | null }> {
  await ensureDatabase();
  const user = await db.user.findUnique({ where: { id: userId }, select: { locale: true, timeZone: true } });
  return { locale: user?.locale === "fa" ? "fa" : "en", timeZone: user?.timeZone ?? null };
}

export async function getCoachNotificationPrefs(userId: string): Promise<CoachNotificationPrefs> {
  await ensureDatabase();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      notifyCheckIns: true,
      notifyLowReadiness: true,
      notifySessionComplete: true,
      notifyWeeklyEmail: true,
    },
  });
  return parseCoachNotificationPrefs(user);
}

/** Resolve locale for any request: logged-in user → cookie → Accept-Language → en */
export async function getRequestLocale(): Promise<Locale> {
  const session = await getSession();
  if (session) {
    const { locale } = await getUserPreferences(session.sub);
    return locale;
  }
  const cookieLocale = (await cookies()).get("NEXT_LOCALE")?.value;
  if (cookieLocale === "fa" || cookieLocale === "en") return cookieLocale;
  const acceptLanguage = (await headers()).get("accept-language")?.toLowerCase() ?? "";
  return acceptLanguage.startsWith("fa") ? "fa" : "en";
}
