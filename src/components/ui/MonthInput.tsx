"use client";

import { JALALI_MONTHS_FA, gregorianToJalali } from "@/lib/jalali";
import { t, type Locale } from "@/lib/i18n";

type MonthInputProps = {
  value: string;
  onChange: (value: string) => void;
  locale: Locale;
  className?: string;
  "aria-label"?: string;
};

const MONTH = /^(\d{4})-(\d{2})$/;

export default function MonthInput({ value, onChange, locale, className, "aria-label": ariaLabel }: MonthInputProps) {
  if (locale !== "fa") {
    return (
      <input
        type="month"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={className}
        aria-label={ariaLabel}
      />
    );
  }

  const match = MONTH.exec(value);
  const now = new Date();
  const today = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const year = match ? Number(match[1]) : today.jy;
  const month = match ? Number(match[2]) : 1;
  const years = Array.from({ length: 16 }, (_, i) => today.jy - 5 + i);
  if (match && !years.includes(year)) years.unshift(year);
  const selectClass = [className, "min-w-0 flex-1 !w-auto"].filter(Boolean).join(" ");

  function emit(nextYear: number, nextMonth: number) {
    onChange(`${nextYear}-${String(nextMonth).padStart(2, "0")}`);
  }

  return (
    <div className="flex w-full gap-1.5" dir="rtl">
      <select
        aria-label={ariaLabel ? `${ariaLabel} — ${t(locale, "common.dateMonth")}` : t(locale, "common.dateMonth")}
        className={selectClass}
        value={match ? String(month) : ""}
        onChange={(event) => {
          const nextMonth = Number(event.target.value);
          if (!nextMonth) {
            onChange("");
            return;
          }
          emit(year, nextMonth);
        }}
      >
        {!match ? <option value="">{t(locale, "common.dateMonth")}</option> : null}
        {JALALI_MONTHS_FA.map((name, index) => (
          <option key={name} value={index + 1}>
            {name}
          </option>
        ))}
      </select>
      <select
        aria-label={t(locale, "common.dateYear")}
        className={selectClass}
        value={match ? String(year) : ""}
        onChange={(event) => {
          const nextYear = Number(event.target.value);
          if (!nextYear) {
            onChange("");
            return;
          }
          emit(nextYear, match ? month : 1);
        }}
      >
        {!match ? <option value="">{t(locale, "common.dateYear")}</option> : null}
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}
