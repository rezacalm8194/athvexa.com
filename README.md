# Football Performance Platform

Technical scaffold for a mobile-first, offline-first, multi-coach SaaS football performance platform.

## Current Status

Stage 1 scaffold only. No product modules, authentication flows, player screens, training modules, or dashboards have been implemented yet.

## Requirements

- Node.js 22 or newer
- pnpm 11
- Docker and Docker Compose

## Install

```bash
pnpm install
```

## Development Services

```bash
docker compose up -d
```

Services:

- PostgreSQL: `localhost:5432`
- MinIO API: `localhost:9000`
- MinIO Console: `localhost:9001`
- Mailpit SMTP: `localhost:1025`
- Mailpit UI: `localhost:8025`

## Run The Web App

```bash
pnpm dev
```

Open `http://localhost:3000/health`.

## Production Configuration

Production public origin:

```text
https://athvexa.com
```

Required build-time variables:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_MARKETING_URL`

Current target values:

```text
NEXT_PUBLIC_APP_URL=https://athvexa.com
NEXT_PUBLIC_MARKETING_URL=https://athvexa.com
```

Changing either `NEXT_PUBLIC_*` value requires rebuilding the Next.js app.

Required runtime variables:

- `NODE_ENV`
- `DATABASE_URL`

Runtime variables for later email and file delivery:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_FROM`
- `S3_ENDPOINT`
- `S3_PUBLIC_ENDPOINT`
- `S3_REGION`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`

Do not commit real secret values. Use `.env.production.example` for placeholder names only and configure real values in the production server or Pachim secret manager.

## Verification

```bash
pnpm typecheck
pnpm lint
pnpm test
```

## Project Structure

```text
football-performance-platform/
├── apps/
│   ├── web/
│   └── worker/
├── packages/
│   ├── database/
│   ├── auth/
│   ├── validation/
│   ├── i18n/
│   ├── calendar/
│   ├── offline/
│   ├── notifications/
│   ├── ui/
│   └── config/
├── docs/
│   ├── product/
│   ├── architecture/
│   ├── design/
│   ├── security/
│   ├── testing/
│   └── deployment/
├── infrastructure/
│   ├── docker/
│   ├── caddy/
│   ├── backup/
│   └── scripts/
├── tests/
│   ├── e2e/
│   ├── integration/
│   └── fixtures/
├── .env.example
├── AGENTS.md
├── README.md
├── package.json
├── compose.yaml
└── pnpm-workspace.yaml
```
