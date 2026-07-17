# Calendar And Timezone

## Purpose

Define calendar systems, timezone storage, UTC rules, and date/time display behavior.

## Status

Stage 5 infrastructure draft. Calendar formatting, timezone display, hour format handling, and local-date helpers are implemented in `packages/calendar`.

## Calendar Systems

Supported:

- Gregorian: default.
- Persian calendar.
- Hijri calendar.

## Storage Rule

- Store instants as UTC `timestamptz`.
- Store date-only values as `date` with the intended workspace/user timezone context.
- Store timezone IDs using IANA names such as `Asia/Tehran`.
- Never store only localized display strings as source data.

## Display Rule

Resolve display settings in this order:

1. User preference.
2. Workspace default.
3. Browser/system fallback.

Display depends on:

- Locale.
- Calendar.
- Timezone.
- 12-hour or 24-hour preference.

## Gregorian

- Default calendar.
- Used for internal ISO dates and migration-safe storage.

## Persian Calendar

- Used for display and date picking when selected.
- Must map back to canonical ISO date or UTC instant before storage.

## Hijri Calendar

- MVP uses `Intl` with the `islamic-civil` calendar for deterministic Hijri display.
- This avoids country-by-country observational variance in the first version.
- If a later product requirement needs observational Hijri calendars, it must be introduced as an explicit workspace setting.

## Scheduling

For scheduled events:

- Store UTC instant for exact scheduled time.
- Store original timezone.
- Store recurrence rules in timezone-aware form.

## Date-Only Records

Examples:

- Wellness check date.
- Habit log date.
- Attendance date.

Rule:

- The date belongs to the player/workspace local day, not server UTC day.

## QA Requirements

Test:

- Gregorian, Persian, Hijri display.
- Timezone conversion around midnight.
- 12-hour and 24-hour display.
- English LTR, Persian RTL, Arabic RTL.

## Stage 5 Implementation

- `calendarSystems`: Gregorian, Persian, Hijri.
- `defaultCalendar`: Gregorian.
- `defaultTimezone`: UTC.
- `defaultHourFormat`: 24-hour.
- `formatDate`: locale, calendar, and timezone-aware date formatting.
- `formatTime`: timezone and 12/24-hour-aware time formatting.
- `getLocalDateParts`: timezone-aware local date extraction for date-only records.
- `/locale-lab`: preview route for simultaneous language, calendar, theme, direction, timezone, and hour-format checks.
