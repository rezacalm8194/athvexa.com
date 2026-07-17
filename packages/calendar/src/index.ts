import type { SupportedLocale } from "@fpp/i18n";

export const calendarSystems = ["gregorian", "persian", "hijri"] as const;
export type CalendarSystem = (typeof calendarSystems)[number];

export const hourFormats = ["12", "24"] as const;
export type HourFormat = (typeof hourFormats)[number];

export const defaultCalendar: CalendarSystem = "gregorian";
export const defaultTimezone = "UTC";
export const defaultHourFormat: HourFormat = "24";

const calendarBySystem: Record<CalendarSystem, string> = {
  gregorian: "gregory",
  persian: "persian",
  hijri: "islamic-civil"
};

export function isCalendarSystem(value: string): value is CalendarSystem {
  return calendarSystems.includes(value as CalendarSystem);
}

export function isHourFormat(value: string): value is HourFormat {
  return hourFormats.includes(value as HourFormat);
}

export function resolveCalendar(value?: string | null): CalendarSystem {
  return value && isCalendarSystem(value) ? value : defaultCalendar;
}

export function resolveHourFormat(value?: string | null): HourFormat {
  return value && isHourFormat(value) ? value : defaultHourFormat;
}

export function formatDate(options: {
  instant: Date;
  locale: SupportedLocale;
  calendar: CalendarSystem;
  timezone: string;
}): string {
  return new Intl.DateTimeFormat(`${options.locale}-u-ca-${calendarBySystem[options.calendar]}`, {
    calendar: calendarBySystem[options.calendar],
    dateStyle: "full",
    timeZone: options.timezone
  }).format(options.instant);
}

export function formatTime(options: {
  instant: Date;
  locale: SupportedLocale;
  timezone: string;
  hourFormat: HourFormat;
}): string {
  return new Intl.DateTimeFormat(options.locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: options.hourFormat === "12",
    timeZone: options.timezone,
    timeZoneName: "short"
  }).format(options.instant);
}

export function getLocalDateParts(options: { instant: Date; timezone: string }) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    calendar: "gregory",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: options.timezone
  }).formatToParts(options.instant);

  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: value("year"),
    month: value("month"),
    day: value("day")
  };
}

export const hijriCalendarDecision =
  "Use Intl's islamic-civil calendar for deterministic Hijri display in MVP.";
