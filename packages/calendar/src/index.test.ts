import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatTime,
  getLocalDateParts,
  hijriCalendarDecision,
  resolveCalendar,
  resolveHourFormat
} from "./index";

describe("calendar infrastructure", () => {
  const instant = new Date("2026-07-17T12:30:00.000Z");

  it("resolves calendar and hour format with safe defaults", () => {
    expect(resolveCalendar("persian")).toBe("persian");
    expect(resolveCalendar("unknown")).toBe("gregorian");
    expect(resolveHourFormat("12")).toBe("12");
    expect(resolveHourFormat("bad")).toBe("24");
  });

  it("formats Gregorian, Persian, and Hijri dates", () => {
    expect(formatDate({ instant, locale: "en", calendar: "gregorian", timezone: "UTC" })).toContain(
      "2026"
    );
    expect(formatDate({ instant, locale: "fa", calendar: "persian", timezone: "Asia/Tehran" }))
      .not.toHaveLength(0);
    expect(formatDate({ instant, locale: "ar", calendar: "hijri", timezone: "UTC" })).not.toHaveLength(
      0
    );
  });

  it("formats time by timezone and hour preference", () => {
    expect(formatTime({ instant, locale: "en", timezone: "UTC", hourFormat: "12" })).toMatch(/PM/);
    expect(formatTime({ instant, locale: "en", timezone: "UTC", hourFormat: "24" })).toContain(
      "12:30"
    );
  });

  it("extracts local date parts in a timezone", () => {
    expect(getLocalDateParts({ instant, timezone: "UTC" })).toEqual({
      year: "2026",
      month: "07",
      day: "17"
    });
  });

  it("documents deterministic Hijri display choice", () => {
    expect(hijriCalendarDecision).toContain("islamic-civil");
  });
});
