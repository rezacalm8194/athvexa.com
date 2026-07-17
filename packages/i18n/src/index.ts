export const supportedLocales = ["en", "fa", "ar"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

export type Direction = "ltr" | "rtl";

export const defaultLocale: SupportedLocale = "en";

export const localeDirections: Record<SupportedLocale, Direction> = {
  en: "ltr",
  fa: "rtl",
  ar: "rtl"
};

export const localeLabels: Record<SupportedLocale, string> = {
  en: "English",
  fa: "فارسی",
  ar: "العربية"
};

const messages = {
  en: {
    "lab.title": "Locale Lab",
    "lab.subtitle": "Language, calendar, theme, direction, timezone, and hour format preview.",
    "lab.language": "Language",
    "lab.calendar": "Calendar",
    "lab.theme": "Theme",
    "lab.timezone": "Timezone",
    "lab.hourFormat": "Hour format",
    "lab.direction": "Direction",
    "lab.sampleDate": "Sample date",
    "lab.sampleTime": "Sample time",
    "lab.workspaceDefaults": "Workspace defaults",
    "lab.userPreferences": "User preferences",
    "lab.savedPreference": "Preference can be stored per user and workspace.",
    "theme.dark": "Dark",
    "theme.light": "Light",
    "theme.system": "System",
    "calendar.gregorian": "Gregorian",
    "calendar.persian": "Persian",
    "calendar.hijri": "Hijri",
    "hour.12": "12-hour",
    "hour.24": "24-hour"
  },
  fa: {
    "lab.title": "آزمایش زبان",
    "lab.subtitle": "پیش‌نمایش زبان، تقویم، تم، جهت، منطقه زمانی و قالب ساعت.",
    "lab.language": "زبان",
    "lab.calendar": "تقویم",
    "lab.theme": "تم",
    "lab.timezone": "منطقه زمانی",
    "lab.hourFormat": "قالب ساعت",
    "lab.direction": "جهت",
    "lab.sampleDate": "تاریخ نمونه",
    "lab.sampleTime": "زمان نمونه",
    "lab.workspaceDefaults": "پیش‌فرض‌های فضای کاری",
    "lab.userPreferences": "ترجیحات کاربر",
    "lab.savedPreference": "ترجیحات می‌تواند برای کاربر و فضای کاری ذخیره شود.",
    "theme.dark": "تیره",
    "theme.light": "روشن",
    "theme.system": "سیستم",
    "calendar.gregorian": "میلادی",
    "calendar.persian": "شمسی",
    "calendar.hijri": "قمری",
    "hour.12": "۱۲ ساعته",
    "hour.24": "۲۴ ساعته"
  },
  ar: {
    "lab.title": "مختبر اللغة",
    "lab.subtitle": "معاينة اللغة والتقويم والسمة والاتجاه والمنطقة الزمنية وتنسيق الساعة.",
    "lab.language": "اللغة",
    "lab.calendar": "التقويم",
    "lab.theme": "السمة",
    "lab.timezone": "المنطقة الزمنية",
    "lab.hourFormat": "تنسيق الساعة",
    "lab.direction": "الاتجاه",
    "lab.sampleDate": "تاريخ نموذجي",
    "lab.sampleTime": "وقت نموذجي",
    "lab.workspaceDefaults": "إعدادات مساحة العمل",
    "lab.userPreferences": "تفضيلات المستخدم",
    "lab.savedPreference": "يمكن حفظ التفضيلات لكل مستخدم ومساحة عمل.",
    "theme.dark": "داكن",
    "theme.light": "فاتح",
    "theme.system": "النظام",
    "calendar.gregorian": "ميلادي",
    "calendar.persian": "فارسي",
    "calendar.hijri": "هجري",
    "hour.12": "١٢ ساعة",
    "hour.24": "٢٤ ساعة"
  }
} satisfies Record<SupportedLocale, Record<string, string>>;

export type MessageKey = keyof (typeof messages)[SupportedLocale];

export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return supportedLocales.includes(locale as SupportedLocale);
}

export function getDirection(locale: SupportedLocale): Direction {
  return localeDirections[locale];
}

export function resolveLocale(options: {
  userLocale?: string | null;
  workspaceLocale?: string | null;
  browserLocale?: string | null;
}): SupportedLocale {
  const candidates = [options.userLocale, options.workspaceLocale, options.browserLocale];

  for (const candidate of candidates) {
    const normalized = candidate?.split("-")[0]?.toLowerCase();
    if (normalized && isSupportedLocale(normalized)) {
      return normalized;
    }
  }

  return defaultLocale;
}

export function createTranslator(locale: SupportedLocale) {
  return function translate(key: MessageKey): string {
    return messages[locale][key] ?? messages[defaultLocale][key] ?? key;
  };
}
