import { t, type Locale } from "@/lib/i18n";

export const DEFAULT_DAILY_TASK_KEYS = ["weighIn", "breakfast", "football", "gym", "recovery"] as const;

const TASK_KEY_BY_LABEL: Record<string, (typeof DEFAULT_DAILY_TASK_KEYS)[number]> = {
  weighIn: "weighIn",
  breakfast: "breakfast",
  football: "football",
  gym: "gym",
  recovery: "recovery",
  "Weigh-in": "weighIn",
  "Breakfast + supplements": "breakfast",
  "Football training": "football",
  "Gym session": "gym",
  "Recovery & stretch": "recovery",
  "وزن‌کشی": "weighIn",
  "وزن‌کشی صبح": "weighIn",
  "صبحانه و مکمل": "breakfast",
  "تمرین فوتبال": "football",
  "جلسه تمرین امروز": "football",
  "تاکتیک و شکل تیمی": "football",
  "جلسه باشگاه": "gym",
  "ریکاوری و کشش": "recovery",
  "آب و ریکاوری": "recovery",
  "کشش و خواب کافی": "recovery",
};

export function defaultDailyTasks() {
  return DEFAULT_DAILY_TASK_KEYS.map((key, order) => ({ label: key, order }));
}

export function dailyTaskLabel(label: string, locale: Locale) {
  const key = TASK_KEY_BY_LABEL[label];
  return key ? t(locale, `player.today.tasks.${key}`) : label;
}
