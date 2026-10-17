/** Gregorian YYYY-MM-DD <-> Jalali, using the runtime Persian calendar. */

export const JALALI_MONTHS_FA = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

function persianParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-u-ca-persian", {
    timeZone: "UTC",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const num = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { jy: num("year"), jm: num("month"), jd: num("day") };
}

export function gregorianToJalali(gy: number, gm: number, gd: number) {
  return persianParts(new Date(Date.UTC(gy, gm - 1, gd, 12)));
}

export function jalaliToGregorian(jy: number, jm: number, jd: number) {
  const start = Date.UTC(jy + 621, 1, 1, 12);
  for (let i = 0; i < 430; i += 1) {
    const date = new Date(start + i * 86400000);
    const jalali = persianParts(date);
    if (jalali.jy === jy && jalali.jm === jm && jalali.jd === jd) {
      return { gy: date.getUTCFullYear(), gm: date.getUTCMonth() + 1, gd: date.getUTCDate() };
    }
  }
  return null;
}

export function jalaliMonthLength(year: number, month: number) {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  const g = jalaliToGregorian(year, 12, 30);
  if (!g) return 29;
  const j = gregorianToJalali(g.gy, g.gm, g.gd);
  return j.jy === year && j.jm === 12 && j.jd === 30 ? 30 : 29;
}

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function gregorianIsoToJalali(iso: string) {
  const match = ISO.exec(iso);
  if (!match) return null;
  return gregorianToJalali(Number(match[1]), Number(match[2]), Number(match[3]));
}

export function jalaliToGregorianIso(jy: number, jm: number, jd: number) {
  const g = jalaliToGregorian(jy, jm, jd);
  if (!g) return "";
  return `${g.gy}-${String(g.gm).padStart(2, "0")}-${String(g.gd).padStart(2, "0")}`;
}
