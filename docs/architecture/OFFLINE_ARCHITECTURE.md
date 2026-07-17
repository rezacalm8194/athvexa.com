# Offline Architecture

## Purpose

Define offline-first behavior, local data boundaries, IndexedDB storage, and online-only operations.

## Status

Stage 3 architecture draft. No offline implementation is added in this stage.

## Goals

- The app shell opens without network after first successful load.
- Daily player execution workflows remain usable offline.
- Pending local changes have clear status.
- Sync is idempotent and does not create duplicates.
- Conflicts are detected and shown instead of silently overwritten.

## Local Storage

Use IndexedDB through Dexie for:

- Cached user profile summary.
- Workspace membership summary.
- Player Today data.
- Downloaded routine.
- Training execution data.
- Wellness draft/submission.
- Habit logs.
- Tasks.
- Attendance where permitted.
- Notes where permitted.
- Sync queue.

Do not store:

- Session token.
- Password.
- Reset token.
- Sensitive auth secrets.

## Offline-Capable MVP Data

- Today.
- Downloaded routine.
- Training execution.
- Wellness.
- Habits.
- Tasks.
- Attendance.
- Notes.

## Online-Only Operations

- First login.
- Password reset.
- Invitation acceptance.
- Permission changes.
- Payment.
- Security operations.
- Platform admin actions.

## State Model

User-visible save states:

- Saving.
- Saved locally.
- Saved to server.
- Offline.
- Waiting to sync.
- Syncing.
- Failed.
- Conflict.

## App Shell Caching

Service worker should cache:

- Core app shell.
- Static assets.
- Translation bundles.
- Theme tokens.
- Route shell for offline-capable areas.

Do not blindly cache:

- Auth responses.
- Permission-sensitive API responses without workspace/user scoping.
- Large media unless explicitly downloaded.

## Local Identity Context

Offline records include:

- `workspace_id`
- `user_id`
- `device_id`
- `client_operation_id`
- Entity type.
- Base server version.

This allows safe sync after reconnect.
