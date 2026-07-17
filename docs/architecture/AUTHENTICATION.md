# Authentication

## Purpose

Define authentication, sessions, device handling, password reset, rate limiting, and future email verification.

## Status

Stage 7 authentication implementation draft. Security primitives, validation, auth pages, reset/attempt migrations, and tests are implemented. Live database execution still depends on running local PostgreSQL migrations.

## Decisions

- Authentication uses email and password.
- Email verification is disabled for MVP.
- `email_verified_at` may exist for future activation but must not block MVP login.
- Sessions are stored in PostgreSQL and referenced by an HttpOnly cookie.
- Sensitive session tokens are stored only as hashes server-side.
- Session tokens, refresh tokens, and password material are never stored in localStorage or IndexedDB.

## Signup

Public signup:

- Creates user.
- Creates first workspace.
- Creates owner workspace membership.
- Starts onboarding.

Invitation signup:

- Validates invitation.
- Creates or links user.
- Creates membership for invited role.
- Applies team/player scope when present.

## Login

Login steps:

1. Normalize email.
2. Rate-limit by email and IP hash.
3. Verify password.
4. Create or update device record.
5. Create session record with token hash.
6. Set session cookie.
7. Redirect to last safe page or role home.

Error handling:

- Use generic error messages.
- Do not reveal whether email exists.
- Log attempts for lockout and audit.

## Sessions

Cookie requirements:

- HttpOnly.
- Secure in production.
- SameSite Lax by default unless a future cross-site flow requires another setting.
- Has explicit expiration.
- Revocable server-side.

Session tables:

- `sessions`
- `devices`

User controls:

- Logout current device.
- Logout all devices.
- View active devices.

Stage 7 implementation:

- Session token generation uses secure random bytes.
- Stored token value is SHA-256 hashed before database persistence.
- Cookie helper emits HttpOnly, SameSite=Lax, expiring cookies.
- Production can set the Secure flag.

## Password Reset

Flow:

1. User requests reset by email.
2. System always returns generic success message.
3. System creates hashed reset token with expiration.
4. User opens reset link.
5. System validates token.
6. User sets new password.
7. System revokes existing sessions unless product decision says otherwise.

Database note:

- Password reset token table is added in Stage 7 as `password_reset_tokens`.
- Reset tokens are stored as hashes only.

## Rate Limiting And Lock Protection

Apply to:

- Login.
- Signup.
- Password reset request.
- Invitation acceptance.

Signals:

- Email normalized.
- IP hash.
- User agent hash.
- Device fingerprint hash where available.

Lock protection:

- Slow repeated attempts.
- Temporarily lock high-risk login attempts.
- Keep errors generic.

Stage 7 implementation:

- `MemoryRateLimiter` exists for local/server-process enforcement.
- `login_attempts` migration exists for persistent attempt logging.
- Production/staging should prefer persistent or shared rate limiting if multiple app processes are introduced.

## Authorization Handoff

Authentication proves user identity only. Protected business actions still require:

- Active session.
- Active workspace.
- Active workspace membership.
- Role/permission/scope check.

## Future Email Verification

Future-ready fields:

- `users.email_verified_at`.
- Optional future verification token table.

MVP rule:

- A null `email_verified_at` must not block login.

## Stage 7 Routes

- `/login`
- `/signup`
- `/forgot-password`
- `/reset-password`
- `/sessions`
- `/onboarding`

These routes provide the auth UI shell. Full database-backed form actions require the Stage 6/7 migrations to be applied to local PostgreSQL.
