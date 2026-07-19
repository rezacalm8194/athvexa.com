// Week math shared by the Planner and Habits modules. Weeks run Monday →
// Sunday and are addressed by their Monday's "YYYY-MM-DD" key, so a week can
// be passed around as a single string (e.g. in a `?week=` query param).

export function toKey(d: Date) {
  return d.toISOString().slice(0, 10);
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
  const start = weekKey ? mondayOf(new Date(weekKey + "T00:00:00")) : mondayOf();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return toKey(d);
  });
}

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function addDays(weekKey: string, days: number) {
  const d = new Date(weekKey + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toKey(mondayOf(d));
}

export function shortLabel(dateKey: string) {
  const d = new Date(dateKey + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
