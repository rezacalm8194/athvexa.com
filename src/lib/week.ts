// Week math shared by the Planner and Habits modules. Weeks run Monday →
// Sunday and are addressed by their Monday's "YYYY-MM-DD" key, so a week can
// be passed around as a single string (e.g. in a `?week=` query param).
//
// Keys are civil calendar dates in local time — never UTC via toISOString().
// In timezones east of UTC (e.g. Asia/Tehran), Monday 00:00 local is still
// Sunday in UTC, so a UTC key made next-week navigation a no-op.

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function toKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function parseDateKey(dateKey: string) {
  const match = DATE_KEY.exec(dateKey);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function todayKey() {
  return toKey(new Date());
}

// Monday of the week containing `d` (or today if omitted).
export function mondayOf(d: Date = new Date()) {
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// The 7 "YYYY-MM-DD" keys (Mon..Sun) for the week starting at `weekKey`
// (a Monday date key). Falls back to the current week if omitted/invalid.
export function weekDates(weekKey?: string | null) {
  const parsed = weekKey ? parseDateKey(weekKey) : null;
  const start = mondayOf(parsed ?? new Date());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return toKey(d);
  });
}

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export function weekdayLabels(locale: "en" | "fa" = "en") {
  const monday = new Date("2024-01-01T12:00:00Z");
  return Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-US", { weekday: "short" }).format(
      new Date(monday.getTime() + index * 86400000),
    ),
  );
}

export function addDays(weekKey: string, days: number) {
  const d = parseDateKey(weekKey) ?? mondayOf();
  d.setDate(d.getDate() + days);
  return toKey(mondayOf(d));
}

export function shortLabel(dateKey: string, locale: "en" | "fa" = "en", timeZone?: string | null) {
  const d = parseDateKey(dateKey);
  if (!d) return dateKey;
  d.setHours(12, 0, 0, 0);
  return d.toLocaleDateString(locale === "fa" ? "fa-IR" : "en-US", {
    month: "short",
    day: "numeric",
    timeZone: timeZone || undefined,
  });
}
