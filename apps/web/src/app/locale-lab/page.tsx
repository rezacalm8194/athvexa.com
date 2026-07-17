import {
  calendarSystems,
  formatDate,
  formatTime,
  hijriCalendarDecision,
  hourFormats,
  resolveCalendar,
  resolveHourFormat,
  type CalendarSystem,
  type HourFormat
} from "@fpp/calendar";
import {
  createTranslator,
  getDirection,
  localeLabels,
  resolveLocale,
  supportedLocales,
  type SupportedLocale
} from "@fpp/i18n";
import { Card, Field, SelectField, StatusBadge } from "@fpp/ui";

type SearchParams = {
  lang?: string;
  calendar?: string;
  theme?: string;
  timezone?: string;
  hour?: string;
};

const sampleInstant = new Date("2026-07-17T12:30:00.000Z");
const supportedTimezones = ["UTC", "Asia/Tehran", "Europe/London", "America/New_York"];
const themes = ["dark", "light", "system"] as const;

function normalizeTheme(value?: string): (typeof themes)[number] {
  return themes.includes(value as (typeof themes)[number])
    ? (value as (typeof themes)[number])
    : "dark";
}

function QuerySelect({
  label,
  name,
  value,
  options
}: {
  label: string;
  name: string;
  value: string;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <Field label={label}>
      <SelectField aria-label={label} defaultValue={value} name={name}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </SelectField>
    </Field>
  );
}

export default async function LocaleLabPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const locale = resolveLocale({ userLocale: params.lang });
  const direction = getDirection(locale);
  const calendar = resolveCalendar(params.calendar);
  const hourFormat = resolveHourFormat(params.hour);
  const theme = normalizeTheme(params.theme);
  const timezone = supportedTimezones.includes(params.timezone ?? "")
    ? (params.timezone as string)
    : "Asia/Tehran";
  const t = createTranslator(locale);

  const languageOptions = supportedLocales.map((item) => ({
    label: localeLabels[item],
    value: item
  }));
  const calendarOptions = calendarSystems.map((item) => ({
    label: t(`calendar.${item}`),
    value: item
  }));
  const themeOptions = themes.map((item) => ({
    label: t(`theme.${item}`),
    value: item
  }));
  const hourOptions = hourFormats.map((item) => ({
    label: t(`hour.${item}`),
    value: item
  }));

  return (
    <main className="locale-lab" data-theme={theme} dir={direction}>
      <form className="locale-lab__inner">
        <header className="locale-lab__header">
          <p className="ui-eyebrow">Stage 5</p>
          <h1>{t("lab.title")}</h1>
          <p>{t("lab.subtitle")}</p>
        </header>

        <section className="locale-lab__controls" aria-label="Locale controls">
          <QuerySelect label={t("lab.language")} name="lang" options={languageOptions} value={locale} />
          <QuerySelect
            label={t("lab.calendar")}
            name="calendar"
            options={calendarOptions}
            value={calendar}
          />
          <QuerySelect label={t("lab.theme")} name="theme" options={themeOptions} value={theme} />
          <QuerySelect
            label={t("lab.timezone")}
            name="timezone"
            options={supportedTimezones.map((item) => ({ label: item, value: item }))}
            value={timezone}
          />
          <QuerySelect label={t("lab.hourFormat")} name="hour" options={hourOptions} value={hourFormat} />
          <button className="ui-button ui-button--primary" type="submit">
            Apply
          </button>
        </section>

        <section className="locale-lab__grid">
          <Card eyebrow={t("lab.direction")} title={direction.toUpperCase()}>
            <StatusBadge tone={direction === "rtl" ? "info" : "success"}>
              {localeLabels[locale]}
            </StatusBadge>
          </Card>

          <Card eyebrow={t("lab.sampleDate")} title={formatDate({ instant: sampleInstant, locale, calendar, timezone })}>
            <StatusBadge tone="info">{t(`calendar.${calendar as CalendarSystem}`)}</StatusBadge>
          </Card>

          <Card eyebrow={t("lab.sampleTime")} title={formatTime({ instant: sampleInstant, locale, timezone, hourFormat })}>
            <StatusBadge tone="success">{t(`hour.${hourFormat as HourFormat}`)}</StatusBadge>
          </Card>

          <Card eyebrow={t("lab.workspaceDefaults")} title={timezone}>
            <p>{t("lab.savedPreference")}</p>
          </Card>

          <Card eyebrow={t("lab.userPreferences")} title={`${localeLabels[locale]} / ${t(`theme.${theme}`)}`}>
            <p>{hijriCalendarDecision}</p>
          </Card>
        </section>
      </form>
    </main>
  );
}
