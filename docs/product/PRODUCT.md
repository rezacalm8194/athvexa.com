# Product

## Purpose

Define the product, the user problem, the first-version boundaries, and the success signals for the football performance platform.

## Status

Stage 2 product draft. Ready for review before architecture and database design.

## Product Definition

The product is a mobile-first, offline-first SaaS platform for football coaches, assistants, and players. It helps coaches plan training, routines, habits, goals, wellness checks, attendance, assessments, and follow-up tasks in one workspace while giving players a simple daily execution app.

The first version is a modular monolith with multi-tenant workspaces. Each coach-owner creates a workspace. Players, assistants, and collaborator coaches join through invitations.

The technical placeholder name is `football-performance-platform`. Brand name, logo, colors, and public copy must remain configurable and must not be hard-coded into product logic.

## Core Problem

Football development work is often scattered across chat apps, spreadsheets, paper plans, informal reminders, and memory. This creates several problems:

- Coaches do not have a reliable daily view of player readiness, missed work, injury signals, and progress.
- Players do not have one clear mobile place for today’s schedule, routine, training, wellness, habits, and goals.
- Assistants can receive tasks, but delegation and completion tracking are usually informal.
- Important health and workload signals are detected late because check-ins and pain reports are inconsistent.
- Offline or poor-connectivity environments make web-only workflows unreliable during training, travel, or match days.

## Value Proposition

For coaches:

- Turn player development into a structured, trackable daily system.
- See attention-priority signals before problems become bigger.
- Assign plans, habits, goals, assessments, and tasks across players and teams.
- Keep workspace data isolated and permissioned.

For players:

- Know exactly what to do today.
- Complete routines, training, wellness, habits, and goals from a mobile phone.
- Keep working offline when connectivity is poor.
- Report readiness, pain, and progress in less time.

For assistants:

- Receive clear delegated tasks.
- Track responsibilities by team, player, deadline, and status.
- Support the coach without needing full workspace control.

## Audience

Primary audience:

- Independent football coaches working with individual players or small groups.
- Academy coaches managing teams and player development workflows.

Secondary audience:

- Assistant coaches, physical trainers, goalkeeper coaches, analysts, and medical-adjacent support staff.
- Players who need daily structure and coach-guided accountability.

Non-target audience for MVP:

- Full club ERP buyers.
- Medical diagnosis systems.
- Public social networks for athletes.
- Marketplace or content-selling platforms.

## Roles

- Platform Admin: Operates the SaaS platform and subscription foundations. This role is not part of normal workspace coaching workflows.
- Owner: The main coach who creates and owns a workspace.
- Coach: A collaborator coach invited into a workspace.
- Assistant: A limited operational role for delegated tasks and selected player/team access.
- Player: A participant who follows assigned plans and reports daily data.

## Usage Scenarios

- A coach signs up, creates a workspace, sets locale/timezone/calendar preferences, and creates the first team.
- A coach invites players to join the workspace and assigns them to a team.
- A player opens the mobile app in the morning and sees today’s schedule, routine, wellness check, habits, and training.
- A player completes wellness in under 60 seconds and reports pain if needed.
- A coach reviews Priority Attention and identifies players with high pain, poor sleep, missing wellness, missed sessions, or readiness decline.
- A coach builds a training plan and assigns it to a team with individual overrides.
- An assistant receives a task related to a player, completes checklist items, and leaves a completion note.
- A player works offline during training and the app syncs safely later without duplicate records.

## Success Metrics

Activation:

- Owner creates a workspace and first team.
- Owner invites at least one player.
- Player accepts invitation and completes onboarding.

Engagement:

- Player daily check-in completion rate.
- Training execution completion rate.
- Habit completion rate.
- Weekly active coaches and players.

Coach value:

- Number of actionable Priority Attention items reviewed.
- Reduction in missing wellness/training data.
- Number of assigned plans, habits, goals, and tasks completed.

Reliability:

- Offline actions sync without duplicates.
- No cross-workspace data leakage.
- Health check and core app routes remain available.

## Version-One Constraints

- Email/password authentication only.
- Email verification is disabled in MVP but `email_verified_at` may exist for future activation.
- Free public signup is only for the coach-owner role.
- Players, assistants, and collaborator coaches join only by invitation.
- Payments, subscriptions, platform admin tools, and production deployment hardening come later in the staged plan.
- Readiness score is a coaching support signal, not medical diagnosis.
- The app must be usable mobile-first before tablet and desktop refinements.
- Offline support prioritizes daily execution workflows, not every admin/security operation.

## Risks

- Scope creep across many modules may slow the MVP unless acceptance criteria remain narrow.
- Offline sync and conflict handling can become complex if the data model is not designed early.
- Permission boundaries must be enforced in the backend, not only hidden in the UI.
- Health-related wording must avoid medical diagnosis claims.
- Multi-calendar support can introduce confusing date behavior unless storage and display rules are strict.
- Coaches may need customization, but too much customization in MVP can weaken the core workflow.

## Open Questions And Decisions

- Decide whether player self-created custom habits require coach visibility by default or explicit player sharing.
- Decide whether player notes are private to the player, visible to coaches, or configurable.
- Decide whether assistants can message players directly in MVP.
- Decide which countries/timezones receive first QA priority beyond the default timezone behavior.
- Decide whether MVP reports are screen-only or include PDF export later.
