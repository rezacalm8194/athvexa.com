# Internationalization

## Purpose

Define languages, translation keys, directionality, and locale preference storage.

## Status

Stage 5 infrastructure draft. Locale registry, direction mapping, preference resolution, and base translation keys are implemented in `packages/i18n`.

## Languages

- English: default, LTR.
- Persian: RTL.
- Arabic: RTL.

## Preference Resolution

Resolve locale in this order:

1. User preference.
2. Workspace default.
3. Browser hint.
4. English fallback.

## Storage

User fields:

- `default_locale`
- `default_calendar`
- `default_timezone`
- `default_hour_format`

Workspace fields:

- `default_locale`
- `default_calendar`
- `timezone`
- `default_hour_format`

## Translation Strategy

- No hard-coded user-facing strings in feature components.
- Use stable translation keys.
- Store notification `title_key` and `body_key` plus payload data.
- Avoid storing translated text unless it is user-generated content.
- The Stage 5 locale lab uses package translation keys instead of route-local display strings for preview labels.

## Directionality

- Set `dir="ltr"` for English.
- Set `dir="rtl"` for Persian and Arabic.
- Layout components must be direction-aware.
- Icons that imply direction need RTL behavior.

## Formatting

Locale-aware formatting applies to:

- Dates.
- Times.
- Numbers.
- Percentages.
- Units where applicable.

## QA Requirements

For each UI feature stage:

- English LTR.
- Persian RTL.
- Arabic RTL.
- Dark and Light theme with all directions.

## Stage 5 Implementation

- `supportedLocales`: English, Persian, Arabic.
- `defaultLocale`: English.
- `localeDirections`: English LTR, Persian RTL, Arabic RTL.
- `resolveLocale`: user preference, workspace default, browser hint, English fallback.
- `createTranslator`: stable key lookup with English fallback.
- `/locale-lab`: preview route for language, direction, theme, calendar, timezone, and hour format.
