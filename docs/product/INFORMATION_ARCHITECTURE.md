# Information Architecture

## Purpose

Define the MVP page map and navigation model for mobile, tablet, and desktop.

## Status

Stage 2 product draft. Ready for review before architecture and database design.

## IA Principles

- Mobile-first for players and daily execution.
- Coach desktop/tablet views can be denser but must remain usable on mobile.
- Player, assistant, coach, and owner navigation are role-aware.
- English defaults to LTR. Persian and Arabic use RTL.
- Navigation labels must come from translation keys in implementation.

## Public And Authentication Pages

Marketing website pages are planned for a later stage, but authentication routes belong to the app:

- `/login`
- `/signup`
- `/forgot-password`
- `/reset-password`
- `/sessions`
- `/onboarding`

Notes:

- `/signup` creates only coach-owner accounts.
- Invitation acceptance routes will handle player, assistant, and collaborator coach entry.
- Email verification is disabled in MVP but future routes should not be blocked by the IA.

## Player Mobile Page Map

Primary mobile navigation:

- Today
- Week
- Training
- Progress
- Settings

Player pages:

- `/today`
  - Today’s Schedule
  - Today’s Tasks
  - Training Today
  - Sleep Status
  - Water Intake
  - Daily Progress
  - Daily Completion Score
  - Coach Message
  - Wellness Status
  - Incomplete Items
- `/routine`
  - Daily Routine
  - Routine Item Detail
  - Completion Reason
- `/week`
  - Weekly Calendar
  - Day Timeline
  - Weekly Objectives
  - Planned Versus Completed
- `/training/today`
  - Session Overview
  - Exercise Detail
  - Timer
  - Actual Result
  - RPE and Pain
  - Complete, Partial, Skip
- `/wellness`
  - Daily Check-In
  - Pain Body Map
  - Wellness History
- `/habits`
  - Today Habits
  - Habit Detail
  - Suggest Habit
- `/goals`
  - Goal List
  - Goal Detail
  - Progress Update
  - Suggest Goal
- `/progress`
  - Training Completion
  - Habit Completion
  - Goal Progress
  - Wellness Trends
- `/notifications`
- `/settings`
  - Profile
  - Language
  - Calendar
  - Timezone
  - Hour Format
  - Theme
  - Offline Data

Mobile behavior:

- Use bottom navigation for the main player tabs.
- Use full-screen flows for wellness, training execution, and pain body map.
- Use drawers or bottom sheets for lightweight filters and completion reasons.

## Coach Mobile Page Map

Primary mobile navigation:

- Dashboard
- Players
- Plan
- Tasks
- Settings

Coach pages:

- `/coach`
  - Priority Attention
  - Player Status
  - Missing Wellness
  - Missed Training
  - Injury Alerts
  - Assistant Tasks
- `/coach/players`
  - List
  - Search
  - Filters
  - Add Manually
  - Invite
- `/coach/players/[playerId]`
  - Overview
  - Today
  - Training
  - Wellness
  - Habits
  - Goals
  - Assessments
  - Attendance
  - Reports
  - Notes
  - Files
  - Activity
- `/coach/teams`
  - Team List
  - Team Detail
  - Team Members
  - Assigned Coaches
- `/coach/planner`
  - Weekly Planner
  - Team Plan
  - Individual Override
- `/coach/training`
  - Plan Builder
  - Templates
  - Drafts
  - Published Plans
- `/coach/exercises`
  - Exercise Library
  - Exercise Detail
  - Media
- `/coach/habits`
  - Assign Habits
  - Review Suggestions
- `/coach/goals`
  - Assign Goals
  - Review Suggestions
- `/coach/attendance`
- `/coach/assessments`
- `/coach/tasks`
- `/coach/messages`
- `/coach/reports`
- `/coach/members`
- `/coach/invitations`
- `/coach/settings`

Mobile behavior:

- Coach mobile screens prioritize quick review and action.
- Dense planning can be simplified to list-first mobile views.
- Player profile tabs may become a horizontal tab list.

## Assistant Mobile Page Map

Primary mobile navigation:

- Tasks
- Players
- Attendance
- Notifications
- Settings

Assistant pages:

- `/assistant/tasks`
- `/assistant/tasks/[taskId]`
- `/assistant/players`
- `/assistant/players/[playerId]`
- `/assistant/attendance`
- `/assistant/notifications`
- `/assistant/settings`

Mobile behavior:

- The assistant experience is task-first.
- Player and attendance pages are filtered by assigned scope.

## Tablet Page Map

Tablet layout keeps mobile navigation logic but can show two panes:

- List and detail for Players.
- Week and selected day for Planner.
- Task list and task detail for Assistant.
- Dashboard summary and selected Priority Attention detail.

Tablet behavior:

- Bottom navigation may remain for player views.
- Coach and assistant views may use a compact side rail when space allows.
- Forms should avoid overly wide line lengths.

## Desktop Page Map

Desktop layout favors persistent navigation and denser decision views:

- Left sidebar for coach and assistant.
- Main content area with optional right detail panel.
- Player profile with tabbed content.
- Coach Dashboard with filters and linked attention cards.
- Weekly Planner with team/player context switching.

Desktop pages follow the same route families as mobile:

- `/coach/*`
- `/assistant/*`
- `/today`, `/week`, `/training/*`, `/wellness`, `/habits`, `/goals`, `/progress`, `/settings`

Desktop behavior:

- Avoid separate desktop-only information architecture.
- Use responsive layouts over different feature sets.
- Keep player routes simple enough for mobile even when opened on desktop.

## Platform Admin IA

Platform admin is planned for a later stage at:

- `/platform`

Future pages:

- Workspaces
- Coaches
- Active Users
- Storage Usage
- Plans
- Subscriptions
- Payments
- Suspensions
- System Notifications
- Backup Status
- Error Overview
- Security Events

MVP note:

- Do not implement Platform Admin in MVP product modules.
- No platform admin may access private workspace data without audit logging in the later stage.

## Navigation Hierarchy

Owner:

- Coach Dashboard
- Players
- Teams
- Planner
- Training
- Exercise Library
- Habits
- Goals
- Attendance
- Assessments
- Tasks
- Messages
- Reports
- Members
- Invitations
- Settings

Coach:

- Same as Owner, filtered by permissions.
- No workspace ownership controls unless granted.

Assistant:

- Tasks
- Assigned Players
- Attendance
- Notifications
- Settings

Player:

- Today
- Week
- Training
- Wellness
- Habits
- Goals
- Progress
- Notifications
- Settings

## Cross-Role Access

- A user may belong to multiple workspaces.
- A user may have different roles in different workspaces.
- Workspace switcher is required once a user has more than one workspace.
- Backend access checks must use active workspace, membership, role, and scope.

## Open Questions And Decisions

- Decide whether player and coach route families should share a single app shell or separate shells.
- Decide when to introduce a workspace switcher in UI if most MVP users start with one workspace.
- Decide whether assistant pages use `/assistant/*` routes or permission-filtered `/coach/*` routes.
