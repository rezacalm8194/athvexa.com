# Sync Protocol

## Purpose

Define how offline changes are queued, retried, deduplicated, acknowledged, and applied to server state.

## Status

Stage 3 architecture draft. No sync implementation is added in this stage.

## Operation Shape

Each client operation contains:

- `client_operation_id`
- `workspace_id`
- `user_id`
- `device_id`
- `entity_type`
- `entity_id`
- `operation_type`
- `payload`
- `base_version`
- `created_at`
- `attempt_count`

## Idempotency

- Client generates stable `client_operation_id`.
- Server stores processed operations in `sync_operations`.
- Server rejects or returns previous result for duplicate operations.
- Unique key: `(workspace_id, user_id, client_operation_id)`.

## Sync Flow

1. Client saves operation locally.
2. Client marks operation as waiting to sync.
3. Client sends operation when online.
4. Server authenticates session.
5. Server validates payload.
6. Server checks workspace membership and permissions.
7. Server checks idempotency.
8. Server checks `base_version`.
9. Server applies operation in a transaction.
10. Server writes `sync_operations`.
11. Server returns updated entity and version.
12. Client marks operation synced or conflict.

## Retry Policy

- Retry transient network/server errors with backoff.
- Do not retry validation or permission errors without user action.
- Keep failed operation visible to user.
- Do not drop local data silently.

## Ordering

- Operations from the same entity should be applied in local creation order.
- Server still validates version to prevent stale writes.
- Independent entities may sync in parallel later, but MVP can keep a simple queue.

## Server Acknowledgement

Server returns:

- Operation status.
- Server entity ID.
- Server version.
- Conflict details if any.
- User-safe error code.

## Security

- Sync endpoint must not trust client `workspace_id` alone.
- Permission check must match the operation target.
- Payload is validated per entity and operation type.
