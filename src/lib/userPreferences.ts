import { cookies, headers } from "next/headers";
import { db, ensureDatabase } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import { getSession } from "@/lib/session";

export async function getUserPreferences(userId: string): Promise<{ locale: Locale; timeZone: string | null }> {
  await ensureDatabase();
  const user = await db.user.findUnique({ where: { id: userId }, select: { locale: true, timeZone: true } });
  return { locale: user?.locale === "fa" ? "fa" : "en", timeZone: user?.timeZone ?? null };
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
