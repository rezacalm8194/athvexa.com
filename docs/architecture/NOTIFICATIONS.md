# Notifications

## Purpose

Define notification channels, reminder scheduling, preferences, quiet hours, and delivery boundaries.

## Status

Stage 3 architecture draft. No notification implementation is added in this stage.

## Channels

- In-app notifications.
- Browser push after permission.
- Email where required.

Out of MVP:

- SMS.
- WhatsApp or external chat integrations.

## Notification Types

- Invitation.
- Task assignment.
- Task completed.
- Training reminder.
- Wellness reminder.
- Habit reminder.
- Goal reminder.
- Pain or injury attention.
- Missing wellness.
- Missed training.
- Daily digest.

## Permission Rule

Browser push cannot be requested silently. The UI must first explain the value, then ask for browser permission.

## Preferences

Preferences should support:

- Channel enable/disable.
- Immediate vs digest.
- Quiet hours.
- Reminder categories.
- Workspace-specific defaults.
- User overrides.

## Worker Responsibilities

The worker should:

- Find due reminders.
- Respect quiet hours.
- Create in-app notifications.
- Send email when required.
- Send push only when permission and subscription exist.
- Mark delivery status.
- Retry transient failures.

## Data Model Links

Core tables:

- `reminders`
- `notifications`
- `activity_logs`

Future table:

- `push_subscriptions`

## Safety

- Notifications must not leak private player information to unauthorized users.
- Payloads should contain IDs and translation keys, not unnecessary sensitive text.
