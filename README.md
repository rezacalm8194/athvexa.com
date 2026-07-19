# Athvexa — app.athvexa.com

Phase 1 of the Athvexa football performance platform: auth with role
selection (player vs. coach), a Player Today Dashboard, a Coach roster
dashboard, invite links, and a basic PWA shell.

Marketing site (`athvexa.com`) lives separately in `marketing-site/index.html`
— it's the static landing page you already have; deploy it as its own site
and keep this Next.js app on the `app.` subdomain.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS — theme tokens in `tailwind.config.ts` mirror the landing
  page's palette (`#E02020` red / `#0A0A0A` black) and fonts (Barlow
  Condensed for display, Inter for body)
- PostgreSQL in production / SQLite for zero-setup local dev — via Prisma ORM
- JWT auth (httpOnly cookies, `jose` + `bcryptjs`), no third-party auth
  provider required

## Getting started

```bash
npm install
cp .env.example .env      # then edit JWT_SECRET
npm run db:push           # creates dev.db (SQLite) from the Prisma schema
npm run db:seed           # optional: 1 demo coach + 4 demo players
npm run dev                # http://localhost:3000
```

Demo logins after seeding (password for all: `password123`):

| Role  | Email               |
|-------|---------------------|
| Coach | coach@athvexa.com   |
| Player| ali@athvexa.com     |
| Player| omar@athvexa.com    |
| Player| yusuf@athvexa.com   |
| Player| tariq@athvexa.com   |

## How the role split works

`POST /api/auth/register` requires `role: "PLAYER" | "COACH"`. The
registration UI (`src/components/RegisterForm.tsx`) asks the person to
choose **"I'm a player"** or **"I'm a coach"** as the very first step, before
any other field, and that choice decides which dashboard they land on:

- `PLAYER` → `/dashboard/player` — the Today Dashboard
- `COACH` / `ASSISTANT` → `/dashboard/coach` — the roster view

`/dashboard` itself is just a role router (`src/app/dashboard/page.tsx`);
`middleware.ts` gates all of `/dashboard/*` behind a valid session cookie.

A coach can generate a shareable invite link ("Invite a player" button on
their dashboard → `POST /api/invite`). Whoever opens `/invite/[token]` gets
the registration form pre-set to `PLAYER` and, on sign-up, is attached to
that coach automatically (`coachId` on the new `User`).

## Project structure

```
prisma/schema.prisma         Data model: User, DailyLog, Task, CoachNote, Invite,
                              PlanItem, Habit, HabitLog, Goal
src/middleware.ts             Route protection + redirect rules
src/lib/auth.ts               Password hashing + JWT sign/verify
src/lib/session.ts            Reads the session from cookies (server components/routes)
src/lib/week.ts                Mon–Sun week math shared by Planner + Habits
src/app/(auth)/login          Sign-in page
src/app/(auth)/register       Registration page (role choice lives here)
src/app/invite/[token]        Player-specific invite landing page
src/app/dashboard/player      Today Dashboard (score, sleep, water, wellness, tasks, coach note)
src/app/dashboard/player/planner  Weekly Planner (7-day grid, add/toggle/delete items)
src/app/dashboard/player/habits   Habits tracker (weekly dot grid, streak count)
src/app/dashboard/player/goals    Goals list (progress bar, categories, target dates)
src/app/dashboard/coach       Roster + invite link generator
src/app/api/...               Route handlers for all of the above
public/manifest.json, sw.js   PWA shell — see note below
marketing-site/index.html     Your existing athvexa.com landing page
```

## Weekly Planner + Habits + Goals (Phase 2, part 1)

- **Planner** (`/dashboard/player/planner`) — a 7-day grid, Monday–Sunday,
  addressed by the Monday's date so you can page forward/back a week at a
  time. Each day holds its own `PlanItem`s (label + category — Training,
  Gym, Match, Recovery, Rest, Other), independent of the `Task`/`DailyLog`
  model that powers today's readiness score, since planner items can live in
  the future. `src/lib/week.ts` centralizes the Mon–Sun math both the
  Planner and Habits screens rely on.
- **Habits** (`/dashboard/player/habits`) — recurring habits with a weekly
  target (times/week) and a 7-dot grid for the current week; tapping a dot
  creates/deletes a `HabitLog` for that date. Archiving a habit soft-deletes
  it (`active: false`) so history isn't lost.
- **Goals** (`/dashboard/player/goals`) — longer-horizon targets with a
  category, optional target date, and a 0–100 progress slider; hitting 100%
  auto-marks the goal done, active and completed goals are separated on the
  page.

All three are player-only, gated the same way as the Today Dashboard, and
follow the existing visual language (ink/red palette, `.card`, `.eyebrow`,
`.btn-primary`/`.btn-ghost` utility classes). A new `PlayerSubNav` tab bar
(Today / Planner / Habits / Goals) ties the four screens together.

**Not built yet from the Phase 2 list:** full Wellness Check-in
history/trends, notifications, assistant-coach permissions, performance
analytics, AR/FA localization, calendar sync, offline write-queue.

After pulling this update, run `npm run db:push` again to apply the new
`PlanItem`, `Habit`, `HabitLog`, and `Goal` tables to your dev database.

## Auto-save

Sleep, water, and the six wellness sliders on the player dashboard save
automatically 500ms after the last change (`StatInput.tsx`,
`WellnessSlider.tsx`), and the daily readiness score recalculates on every
save (`computeScore` in `src/app/api/player/today/route.ts` — a simple,
transparent formula meant to be replaced by a coach-tunable model later).

## PWA — what's built vs. what's next

`public/sw.js` caches the dashboard shell so the app still opens offline and
serves cached data if a GET request fails. What's **not** built yet: an
IndexedDB write-queue so a check-in made while offline syncs once the
connection returns — that's real, standalone work and belongs in Phase 2.
You'll also want to drop real `icon-192.png` / `icon-512.png` files into
`public/` (referenced by `manifest.json` but not included here).

## Moving to Postgres for production

1. In `prisma/schema.prisma`, change `provider = "sqlite"` to
   `provider = "postgresql"`.
2. Set `DATABASE_URL` in your environment to your Postgres connection string.
3. Run `npx prisma migrate deploy` (or `db push` for a quick first pass).

## Roadmap (from the original brief)

**Phase 1 (this scaffold):** auth + roles, Today Dashboard, Coach Dashboard,
invite links, PWA shell.

**Phase 2 — Intelligence:** ✅ Weekly Planner + Habits module, ✅ Goals.
Still open: full Wellness Check-in history/trends, notifications,
assistant-coach permissions, performance analytics, AR/FA localization,
calendar sync, offline write-queue.

**Phase 3 — Scale:** multi-tenant support, subscription billing, data
export/import, light theme, injury tracking, video attachments, custom
domains per tenant.
