# Deployment

## Purpose

Define the current production deployment contract for ATHVEXA on `https://athvexa.com`.

## Current Production Shape

- Marketing and web app share the same public origin: `https://athvexa.com`.
- The app process may bind internally to `0.0.0.0:3001`.
- `0.0.0.0` is a bind address only. It must never be emitted as a browser redirect, canonical URL, email link, sitemap URL, manifest URL, or Open Graph URL.
- Public browser-facing URLs must be HTTPS in production.

## Required Production Variables

Build-time public variables:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_MARKETING_URL`

Runtime server variables:

- `DATABASE_URL`
- `NODE_ENV`

Runtime variables for later file, email, and notification delivery:

- `S3_ENDPOINT`
- `S3_PUBLIC_ENDPOINT`
- `S3_REGION`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_FROM`

Do not commit real values for secrets, passwords, access keys, or database URLs.

## Build-Time Notes

`NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_MARKETING_URL` are consumed by the Next.js app for public URLs, metadata, manifest, robots, and sitemap generation. Changing either value requires a new production build.

Current target values:

```text
NEXT_PUBLIC_APP_URL=https://athvexa.com
NEXT_PUBLIC_MARKETING_URL=https://athvexa.com
```

## Runtime Notes

`DATABASE_URL` is required for signup, login, sessions, password reset storage, and invitation persistence. Apply database migrations before enabling production auth traffic:

```text
packages/database/drizzle/0000_base_identity_workspace.sql
packages/database/drizzle/0001_auth_reset_and_attempts.sql
packages/database/drizzle/0002_invitations.sql
```

Do not run migrations against production without an approved backup and release window.

## Reverse Proxy

Pachim/Nginx should terminate HTTPS and forward traffic to the internal app bind address. The app must not construct production browser URLs directly from untrusted `Host`, `x-forwarded-host`, or `x-forwarded-proto` headers. Public production URLs are built from the configured canonical origin first.

Required proxy behavior:

- Serve public traffic over HTTPS.
- Forward requests to the internal app bind address.
- Preserve request method and body for auth form posts.
- Pass cookies unchanged.
- Avoid rewriting redirects to `localhost`, `127.0.0.1`, `0.0.0.0`, or `[::]`.

## Auth Redirect Contract

- Successful public owner signup redirects to `/onboarding`.
- Signup validation or persistence failure redirects to `/signup` with a generic error code.
- Successful login redirects to a safe internal `returnTo` path, defaulting to `/onboarding`.
- Failed login redirects to `/login` with a generic error code.
- External redirect destinations are rejected.
- In production, redirect URLs are built from `NEXT_PUBLIC_APP_URL`.
- In development and test, `0.0.0.0` and `[::]` browser redirects are normalized to `localhost`.

## Local Development Values

Localhost values in `.env.example`, `README.md`, `compose.yaml`, and Playwright config are development or test fixtures. They should remain local and must not be copied into production secrets.
