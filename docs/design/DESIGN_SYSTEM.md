# Design System

## Purpose

Define the visual tokens, component behavior, interaction states, and UI foundations for a mobile-first football performance platform.

## Status

Stage 4 design draft with UI infrastructure preview. Product pages are intentionally not implemented yet.

## Design Direction

The default experience is dark, red, black, athletic, energetic, and professional. The UI should feel like a focused coaching tool, not a marketing page. It should prioritize clarity, quick scanning, and decisive action.

The system supports:

- Dark theme as default.
- Light theme.
- System theme.
- English LTR.
- Persian RTL.
- Arabic RTL.
- Mobile-first layout.

## Color Tokens

Colors must be consumed through CSS variables or exported token names. Pages and components should not hard-code raw color values.

### Dark Theme

| Token | Value | Usage |
| --- | --- | --- |
| `--color-background` | `#090A0D` | Page background |
| `--color-surface` | `#14161B` | Main surfaces |
| `--color-elevated` | `#1E2128` | Raised panels, overlays |
| `--color-primary` | `#EF233C` | Primary actions, focus, active state |
| `--color-primary-strong` | `#B80F2E` | Pressed and strong action |
| `--color-text` | `#F7F7F8` | Primary text |
| `--color-text-muted` | `#A4A8B3` | Secondary text |
| `--color-success` | `#22C55E` | Success state |
| `--color-warning` | `#F59E0B` | Warning state |
| `--color-info` | `#3B82F6` | Informational state |
| `--color-border` | derived | Borders and dividers |
| `--color-danger` | primary red | Errors and destructive emphasis |

### Light Theme

| Token | Value | Usage |
| --- | --- | --- |
| `--color-background` | `#F5F6F8` | Page background |
| `--color-surface` | `#FFFFFF` | Main surfaces |
| `--color-elevated` | `#EAECF0` | Raised panels, overlays |
| `--color-primary` | `#D90429` | Primary actions |
| `--color-primary-strong` | `#B80F2E` | Pressed and strong action |
| `--color-text` | `#111318` | Primary text |
| `--color-text-muted` | `#5F6570` | Secondary text |
| `--color-success` | `#15803D` | Success state |
| `--color-warning` | `#B45309` | Warning state |
| `--color-info` | `#2563EB` | Informational state |

## Typography

- Font stack: system UI first for speed and broad language support.
- Display headings: strong, compact, used sparingly.
- Section headings: medium weight, dense spacing.
- Body: readable at mobile sizes.
- Labels: small, high contrast, never dependent on color alone.
- Letter spacing is `0`.
- Do not scale font size directly with viewport width.

## Spacing

Use spacing tokens:

- `--space-1`: 4px
- `--space-2`: 8px
- `--space-3`: 12px
- `--space-4`: 16px
- `--space-5`: 20px
- `--space-6`: 24px
- `--space-8`: 32px
- `--space-10`: 40px

## Radius

- Controls: 8px.
- Cards: 8px maximum unless a future component requires otherwise.
- Pills and icon-only controls may use full radius when shape communicates function.

## Shadows

Use restrained shadows:

- Low: subtle separation on elevated surfaces.
- Medium: overlays and popovers.
- High: modal and drawer focus.

Dark theme shadows must not create muddy low-contrast surfaces.

## Icons

- Use a standard icon library when dependency state allows it.
- Prefer familiar symbols for actions such as save, search, close, settings, undo, redo, filter, calendar, and notification.
- Icon buttons require accessible labels and hover/focus tooltip text where needed.
- Directional icons must mirror in RTL where meaning changes.

## Motion

- Motion is short and functional.
- Use motion for state transitions, drawer/modal entry, sync status, and feedback.
- Avoid decorative animation that distracts from coaching work.
- Respect reduced motion preferences.

## Components

### Buttons

Variants:

- Primary.
- Secondary.
- Ghost.
- Danger.
- Icon-only.

States:

- Default.
- Hover.
- Focus.
- Pressed.
- Disabled.
- Loading.

### Inputs

Includes:

- Text input.
- Number input.
- Search input.
- Textarea later.

Rules:

- Labels are explicit.
- Errors are text plus state color.
- Touch targets are comfortable on mobile.

### Select

- Used for option sets such as role, team, timezone, language, calendar, and status.
- Must support long localized labels without clipping.

### Checkbox

- Used for binary or checklist items.
- Must have visible label and focus state.

### Cards

- Used for repeated items and framed tools.
- Do not nest cards inside cards.
- Page sections should be unframed layouts or full-width bands, not floating cards.

### Tables

- Used for dense coach/admin views.
- Mobile behavior should become stacked rows or summary lists.
- Keep columns decision-oriented.

### Charts

- Only use charts that help a coaching decision.
- Always include labels and accessible summaries.
- Avoid decorative charts.

### Modal

- Used for focused confirmation or short forms.
- Must trap focus when implemented.
- Must have a clear close action.

### Drawer

- Used for contextual details and filters.
- Supports mobile bottom placement or side placement on larger screens.

### Bottom Sheet

- Used on mobile for completion reasons, filters, and compact action sets.

### Toast

- Used for short feedback.
- Must not hide critical errors.
- Sync-related toasts should match persistent sync state where needed.

### Skeleton

- Used while loading predictable shapes.
- Must not cause layout shift.

### Empty State

- Short title.
- Helpful action if available.
- No blame-oriented wording.

### Error State

- Clear problem statement.
- Safe retry action if possible.
- Does not expose sensitive backend details.

### Offline State

- Shows offline badge.
- Shows whether data is stale or locally saved.
- Shows pending changes count when relevant.

### Sync State

States:

- Saved locally.
- Waiting to sync.
- Syncing.
- Synced.
- Failed.

### Conflict State

- Shows local version.
- Shows server version.
- Offers explicit resolution choices.
- Never silently overwrites wellness or pain information.

## Preview Implementation

Stage 4 includes a non-product UI preview route:

- `/ui-preview`

The preview exists only to inspect tokens, themes, directionality, and primitives before product screens are built.

## Open Decisions

- Replace temporary internal preview icons with a standard icon library once dependency management is stable.
- Decide whether Storybook is needed later or whether in-app preview pages are enough for this project.
