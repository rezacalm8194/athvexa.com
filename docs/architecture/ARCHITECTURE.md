# Architecture

## Purpose

Define the modular monolith architecture, app boundaries, package responsibilities, runtime model, and deployment shape for the football performance platform.

## Status

Stage 3 architecture draft. No code or migrations are implemented in this stage.

## Architecture Summary

The product is a multi-tenant SaaS delivered as a modular monolith. The first production shape should remain operationally simple: one web app, one worker process, one PostgreSQL database, one S3-compatible object store, and one reverse proxy.

The modular monolith choice means:

- The deployable backend remains one application boundary at first.
- Domain modules are separated by packages and folder ownership, not by separate services.
- Cross-module calls happen through typed server-side interfaces.
- Database transactions can span modules where necessary.
- Future extraction into services remains possible only if a module develops real operational pressure.

## Tenancy Model

- A `workspace` is the tenant boundary.
- Every business entity that belongs to coaching work carries `workspace_id`.
- Users are global identities and can belong to multiple workspaces.
- Workspace membership determines role, scope, and permissions.
- Backend access checks must combine user session, active workspace, membership status, role, permissions, team scope, and player scope.
- UI filtering is a convenience only and is never the security boundary.

## Applications

### apps/web

Responsibilities:

- Next.js App Router application.
- Server-rendered and client-rendered web UI.
- Route handlers and server actions where appropriate.
- Authentication entry points.
- Mobile-first player, coach, assistant, and future platform admin shells.
- Health check route.

Boundaries:

- Must validate all server inputs using shared validation package.
- Must use backend authorization helpers for every protected operation.
- Must not query tenant data without a workspace-aware access path.

### apps/worker

Responsibilities:

- Scheduled reminders.
- Notification delivery.
- Email jobs.
- Future digest generation.
- Future backup/import/export orchestration hooks.
- Retryable background work.

Boundaries:

- Worker must execute with explicit system context and auditable actor metadata.
- Worker must not bypass workspace isolation.
- Worker jobs should be idempotent.

## Packages

### packages/database

Responsibilities:

- Drizzle schema.
- Migrations.
- Database connection.
- Transaction helpers.
- Repository primitives where useful.
- RLS policy definitions and migration helpers when implemented.

### packages/auth

Responsibilities:

- Password hashing.
- Session creation, lookup, rotation, and revocation.
- Device tracking.
- Rate-limit helpers.
- Safe auth errors.
- Future email verification primitives.

### packages/validation

Responsibilities:

- Zod schemas for all server inputs.
- Shared scalar validation such as email, IDs, locale, timezone, date ranges, and pagination.
- API request and form validation.

### packages/i18n

Responsibilities:

- Locale registry.
- Translation key structure.
- Direction mapping.
- Locale preference resolution.

### packages/calendar

Responsibilities:

- Calendar preference types.
- Gregorian, Persian, and Hijri display adapters.
- Timezone and hour-format helpers.
- UTC storage rules.

### packages/offline

Responsibilities:

- IndexedDB/Dexie models.
- Sync operation shape.
- Local pending-state helpers.
- Conflict-state types.

### packages/notifications

Responsibilities:

- Notification event types.
- Reminder scheduling contracts.
- Push/email/in-app delivery abstractions.
- Preference and quiet-hours logic.

### packages/ui

Responsibilities:

- Shared UI primitives.
- Design token exports after Stage 4.
- Direction-aware and theme-aware component infrastructure.

### packages/config

Responsibilities:

- Environment parsing.
- App runtime config.
- Feature flag defaults.
- Shared constants that are not product content.

## Backend Access Pattern

Every protected backend operation should follow this order:

1. Authenticate session.
2. Validate input with Zod.
3. Resolve active workspace.
4. Load workspace membership.
5. Check membership status.
6. Check role/permission/scope.
7. Execute query with `workspace_id` filter.
8. Write activity log for sensitive operations.
9. Return a response that does not leak unauthorized existence.

## Runtime Architecture

```text
Browser / PWA
  |
  | HTTPS
  v
Caddy Reverse Proxy
  |
  v
Next.js Web App
  |        \
  |         \ background job enqueue
  v          v
PostgreSQL  Worker
  |
  v
S3-compatible Object Storage / MinIO

Mail testing service is used in development.
```

## Storage Boundaries

- PostgreSQL stores normalized application state, audit logs, sessions, sync operations, and metadata.
- Object storage stores uploaded files and exercise media.
- Browser IndexedDB stores offline-capable user/workspace data and pending sync operations.
- Sensitive session tokens are not stored in localStorage or IndexedDB.

## Deployment Architecture

Development:

- Local Next.js dev server.
- Docker Compose services for PostgreSQL, MinIO, and mail testing.

Staging:

- Same application shape as production.
- Separate database, object storage, secrets, and domains.
- Used before any production release.

Production:

- Ubuntu server.
- Docker Compose.
- Caddy for HTTPS and reverse proxy.
- PostgreSQL.
- S3-compatible object storage or MinIO.
- Worker.
- Backup and monitoring.

Current local note:

- The project is intentionally still local. Server migration should wait until the early architecture, design, database, and authentication foundations are stable.

## Security Architecture

- Authentication uses secure database sessions and HttpOnly cookies.
- Authorization is enforced in backend operations.
- Multi-tenant data access always includes workspace isolation.
- Sensitive operations produce activity logs.
- Future PostgreSQL Row-Level Security should protect sensitive workspace tables as a defense-in-depth layer.
- Secrets live in environment variables and are never committed.

## Future Extraction Rules

Do not extract a module to a separate service unless at least one condition is true:

- It needs independent scaling.
- It has distinct operational reliability requirements.
- It has a separate deployment cadence.
- It integrates with external systems in a way that would threaten the main app’s stability.

Until then, keep modules inside the monolith.
