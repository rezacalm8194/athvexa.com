import { db, ensureDatabase } from "@/lib/db";
import type { Locale } from "@/lib/i18n";

export async function getUserPreferences(userId: string): Promise<{ locale: Locale; timeZone: string | null }> {
  await ensureDatabase();
  const user = await db.user.findUnique({ where: { id: userId }, select: { locale: true, timeZone: true } });
  return { locale: user?.locale === "fa" ? "fa" : "en", timeZone: user?.timeZone ?? null };
}
