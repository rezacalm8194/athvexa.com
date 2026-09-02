export type UserLocale = "en" | "fa";
export const DEFAULT_LOCALE: UserLocale = "en";
export function intlLocale(locale: string | null | undefined = DEFAULT_LOCALE) { return locale === "fa" ? "fa-IR" : "en-US"; }

export function formatDate(input: string | Date, options: Intl.DateTimeFormatOptions = {}, locale?: UserLocale | string | null, timeZone?: string | null) {
  return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: timeZone || undefined, ...options }).format(typeof input === "string" ? new Date(input) : input);
}

export function relativeTime(input: string | Date, locale: UserLocale | string | null = DEFAULT_LOCALE): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];

  for (const [unit, secondsInUnit] of units) {
    if (abs >= secondsInUnit) {
      const value = Math.round(seconds / secondsInUnit);
      return new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: "auto" }).format(value, unit);
    }
  }
  return new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: "auto" }).format(0, "second");
}
