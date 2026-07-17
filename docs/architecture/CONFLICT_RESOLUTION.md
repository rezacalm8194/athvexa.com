# Conflict Resolution

## Purpose

Define how offline and server-side changes are detected, surfaced, and resolved.

## Status

Stage 3 architecture draft. No conflict implementation is added in this stage.

## Conflict Detection

A conflict occurs when:

- Client sends `base_version`.
- Server current `version` differs from `base_version`.
- Operation is not safely mergeable.

Other conflicts:

- Unique constraint collision.
- Deleted/archived entity updated offline.
- Permission changed before sync.

## Version Field

- Mutable business records start at `version = 1`.
- Server increments version on update.
- Client stores version with downloaded data.
- Sync uses version for optimistic concurrency.

## Auto-Merge Candidates

Safe candidates:

- Distinct habit logs by date.
- New wellness record when no daily record exists.
- New task completion note if task is still open.

Unsafe candidates:

- Editing training plan structure.
- Editing permission scopes.
- Updating same wellness record from two devices.
- Updating archived player/team data.

## User Review

Conflict UI should show:

- Local value.
- Server value.
- Last updated time.
- Actor if available and allowed.
- Choices: keep server, apply local as new update, or cancel local change.

## Audit Trail

Resolved conflicts should write:

- Entity type.
- Entity ID.
- Actor.
- Resolution action.
- Before/after summary.

## Medical-Sensitive Note

Pain and wellness conflicts must never hide data. If two reports conflict, preserve both or require explicit review rather than overwriting.
