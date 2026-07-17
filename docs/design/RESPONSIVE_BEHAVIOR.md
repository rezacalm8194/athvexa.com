# Responsive Behavior

## Purpose

Define mobile-first layout behavior across mobile, tablet, and desktop.

## Status

Stage 4 design draft with preview infrastructure.

## Breakpoints

Use mobile-first breakpoints:

- Base: 0px and up.
- Small: 480px and up.
- Medium: 768px and up.
- Large: 1024px and up.
- Wide: 1280px and up.

Breakpoints are layout tools, not feature switches. Avoid building separate mobile-only and desktop-only products.

## Mobile Behavior

Mobile is the primary target for player workflows.

Rules:

- Single-column layout.
- Primary actions remain reachable.
- Bottom navigation is appropriate for main player tabs.
- Forms use full-width controls.
- Completion flows may use bottom sheets.
- Training and wellness flows can be full-screen.
- Text must wrap safely and never overlap controls.

## Tablet Behavior

Tablet can use two-pane patterns:

- List plus detail.
- Week plus day detail.
- Dashboard summary plus selected item.
- Task list plus task detail.

Rules:

- Keep touch targets comfortable.
- Avoid line lengths that become too wide.
- Preserve mobile task order.

## Desktop Behavior

Desktop supports denser coach workflows.

Rules:

- Use side navigation for coach and assistant shells.
- Use tables only when scanning and comparison improve.
- Keep content width constrained for forms and reading.
- Use right-side detail panels for contextual review.
- Avoid marketing-style oversized hero layouts in app surfaces.

## Navigation Patterns

Player:

- Mobile bottom navigation.
- Desktop can keep the same route structure with wider content.

Coach:

- Mobile compact navigation.
- Tablet side rail when space allows.
- Desktop sidebar.

Assistant:

- Task-first navigation.
- Keep assigned scope obvious.

## Layout Constraints

- Fixed-format elements need stable dimensions.
- Boards, grids, toolbars, icon buttons, counters, and tiles must not shift on hover or state changes.
- Cards use 8px radius or less.
- Do not place cards inside cards.
- Use responsive grid tracks instead of viewport-scaled font sizes.

## Directionality

LTR and RTL layouts must both work:

- Logical CSS properties are preferred.
- Directional icons mirror when meaning changes.
- Spacing should use inline/block logical properties where practical.

## Theme Behavior

- Dark is default.
- Light theme must preserve contrast.
- System theme follows user OS preference.
- Theme tokens drive components; raw color values should stay in token definitions.
