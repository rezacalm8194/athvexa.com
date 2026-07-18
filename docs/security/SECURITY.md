# Security

## Purpose

Define security principles, threat areas, access checks, and sensitive operations.

## Status

Stage 7 security draft for authentication foundations.

## Authentication Security

- Passwords are hashed with Node.js `scrypt`.
- Password verification uses timing-safe comparison.
- Session tokens are generated from secure random bytes.
- Session tokens are stored as hashes in the database.
- Session cookies are HttpOnly, SameSite=Lax, expiring, and Secure in production.
- Email verification remains future-ready but does not block MVP login.

## Authorization

- Authentication only proves identity.
- Workspace access still requires active membership, role, permission, and scope checks.
- UI hiding is never the authorization boundary.

## Workspace Isolation

- Stage 6 enables RLS on workspace-sensitive base tables.
- Backend operations must still apply workspace-aware checks before querying data.

## Secret Handling

- No real secrets are committed.
- `.env` remains ignored.
- `.env.example` contains sample placeholders only.
- Passwords, session tokens, reset tokens, and refresh-token-like values must never be stored in localStorage or IndexedDB.

## Audit Logging

Sensitive auth-related events should be logged:

- Signup.
- Login success and failure.
- Password reset request.
- Password reset completion.
- Session revocation.
- Device revocation.
- Workspace membership changes.
- Invitation creation requires an active session, active workspace membership, and owner or member-management permission before a hashed token record is stored.
- Invitation acceptance checks the hashed token, expiration, revocation, usage limit, invited email, and existing membership before creating workspace access.

## Rate Limiting

- Stage 7 includes in-process rate-limit primitives.
- `login_attempts` supports persistent login attempt logging.
- Multi-process deployments should use database-backed or shared rate limiting.
