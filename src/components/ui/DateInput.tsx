"use client";

import { JALALI_MONTHS_FA, gregorianIsoToJalali, jalaliMonthLength, jalaliToGregorianIso, gregorianToJalali } from "@/lib/jalali";
import { t, type Locale } from "@/lib/i18n";

type DateInputProps = {
  value: string;
  onChange: (value: string) => void;
  locale: Locale;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
};

export default function DateInput({ value, onChange, locale, className, required, disabled, id, "aria-label": ariaLabel }: DateInputProps) {
  if (locale !== "fa") {
    return (
      <input
        id={id}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={className}
        required={required}
        disabled={disabled}
        aria-label={ariaLabel}
      />
    );
  }

  const jalali = value ? gregorianIsoToJalali(value) : null;
  const now = new Date();
  const today = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const year = jalali?.jy ?? today.jy;
  const month = jalali?.jm ?? 1;
  const day = jalali?.jd ?? 1;
  const years = Array.from({ length: 16 }, (_, i) => today.jy - 5 + i);
  if (jalali && !years.includes(jalali.jy)) years.unshift(jalali.jy);
  const days = Array.from({ length: jalaliMonthLength(year, month) }, (_, i) => i + 1);

  function emit(nextYear: number, nextMonth: number, nextDay: number) {
    const maxDay = jalaliMonthLength(nextYear, nextMonth);
    onChange(jalaliToGregorianIso(nextYear, nextMonth, Math.min(nextDay, maxDay)));
  }

  const selectClass = [className, "min-w-0 flex-1 !w-auto"].filter(Boolean).join(" ");

  return (
    <div className="flex w-full gap-1.5" dir="rtl">
      <select
        id={id}
        disabled={disabled}
        required={required}
        aria-label={ariaLabel ? `${ariaLabel} — ${t(locale, "common.dateDay")}` : t(locale, "common.dateDay")}
        className={selectClass}
        value={jalali ? String(day) : ""}
        onChange={(event) => {
          const nextDay = Number(event.target.value);
          if (!nextDay) {
            onChange("");
            return;
          }
          emit(year, month, nextDay);
        }}
      >
        {!required && !jalali ? <option value="">{t(locale, "common.dateDay")}</option> : null}
        {days.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
      <select
        disabled={disabled}
        aria-label={t(locale, "common.dateMonth")}
        className={selectClass}
        value={jalali ? String(month) : ""}
        onChange={(event) => {
          const nextMonth = Number(event.target.value);
          if (!nextMonth) {
            onChange("");
            return;
          }
          emit(year, nextMonth, jalali?.jd ?? 1);
        }}
      >
        {!required && !jalali ? <option value="">{t(locale, "common.dateMonth")}</option> : null}
        {JALALI_MONTHS_FA.map((name, index) => (
          <option key={name} value={index + 1}>
            {name}
          </option>
        ))}
      </select>
      <select
        disabled={disabled}
        aria-label={t(locale, "common.dateYear")}
        className={selectClass}
        value={jalali ? String(year) : ""}
        onChange={(event) => {
          const nextYear = Number(event.target.value);
          if (!nextYear) {
            onChange("");
            return;
          }
          emit(nextYear, jalali?.jm ?? 1, jalali?.jd ?? 1);
        }}
      >
        {!required && !jalali ? <option value="">{t(locale, "common.dateYear")}</option> : null}
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}
