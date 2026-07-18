# Database Package

## Status

Stage 10 invitations and members. Team/player product tables are intentionally not implemented yet.

## Implemented Tables

- `users`
- `devices`
- `sessions`
- `workspaces`
- `roles`
- `permissions`
- `workspace_members`
- `activity_logs`
- `password_reset_tokens`
- `login_attempts`
- `invitations`

## Migration

The first migration is:

- `drizzle/0000_base_identity_workspace.sql`

It creates identity, workspace, role, permission, membership, session, device, and activity log tables. It also enables Row-Level Security on workspace-sensitive tables as defense in depth.

Stage 7 adds:

- `drizzle/0001_auth_reset_and_attempts.sql`

It creates password reset token storage and login attempt logging. Reset tokens are stored as hashes only.

Stage 10 adds:

- `drizzle/0002_invitations.sql`

It creates role-based workspace invitations with hashed token storage, expiration, usage limits, approval state, revocation state, acceptance metadata, indexes, and RLS. `team_id` and `player_scope_id` are nullable UUID placeholders until the team and player tables are introduced.

Stage 10 also adds:

- `drizzle/0005_invitation_scope_modes.sql`

It keeps `team_scope_mode` and `player_scope_mode` on pending invitations so acceptance can create a correctly scoped workspace member before team and player records exist.

## Development Seed

`src/seed.ts` exports role and permission seed data for development. It does not contain real users, passwords, tokens, or secrets.

## Rollback Guidance

For local development only, the safe rollback path is to drop the Stage 6 tables and enum types in reverse dependency order after backing up any useful local data.

Do not run destructive rollback in staging or production without a backup and explicit approval.
