# MVP Scope

## Purpose

Define the MVP modules, what is inside and outside the first version, acceptance criteria, dependencies, and priorities.

## Status

Stage 2 product draft. Ready for review before architecture and database design.

## MVP Principles

- Build daily coach-player execution first.
- Keep every workflow workspace-aware and permission-aware.
- Prefer mobile-first flows for players and dense decision views for coaches.
- Keep email verification disabled for MVP while preserving the future data model.
- Do not implement subscriptions, payments, platform admin, or production deployment features in MVP.
- Avoid decorative analytics. Every report or chart must support a coaching decision.

## Player Modules

### Today Dashboard

Inside MVP:

- Today’s schedule summary.
- Today’s tasks.
- Training Today entry point.
- Sleep status.
- Water intake.
- Daily progress.
- Daily completion score.
- Coach message preview.
- Wellness check-in status.
- Incomplete items.

Outside MVP:

- AI-generated recommendations.
- Social feed.
- Public sharing.

Acceptance criteria:

- Player sees only their own assigned data.
- Dashboard works on mobile first.
- Offline cached data shows with stale-state indicator.
- Empty state is clear when nothing is assigned.

Dependencies:

- Authentication, workspace membership, player profile, daily schedule, tasks, training, wellness, habits, notifications, offline storage.

Priority: P0.

### Daily Routine

Inside MVP:

- Wake-up time.
- Morning routine.
- Meals.
- School or study.
- Football training.
- Gym or physical training.
- Recovery.
- Free time.
- Bedtime.
- Checklist.
- Day templates: Training Day, Match Day, Recovery Day, Rest Day.
- Completion states: done, skipped, partial, and reason for not completing.

Outside MVP:

- Complex recurring-rule builder beyond basic templates.
- Automatic routine generation.

Acceptance criteria:

- Coach can assign a routine template.
- Player can record completion state per item.
- Completion history is stored by date.
- Offline completion does not duplicate after sync.

Dependencies:

- Player profile, schedule model, routine templates, offline sync.

Priority: P0.

### Weekly Planner

Inside MVP:

- Weekly calendar.
- Daily timeline.
- Training schedule.
- Match schedule.
- Recovery days.
- School and study items.
- Weekly objectives.
- Weekly completion.
- Copy week.
- Repeat item.
- Move item.
- Team plan.
- Individual override.
- Planned versus completed.

Outside MVP:

- External calendar two-way sync.
- Drag-heavy desktop planning as the primary interface.

Acceptance criteria:

- Coach can create a team weekly plan.
- Coach can override an individual player’s plan.
- Player sees their personal week.
- Mobile, tablet, and desktop layouts are usable.

Dependencies:

- Teams, players, schedules, training sessions, permissions.

Priority: P1.

### Habits

Inside MVP:

- Coach-assigned habits.
- Custom player habit proposal.
- Schedule.
- Target.
- Unit.
- Reminder.
- Daily check.
- Streak.
- Weekly completion.
- Monthly completion.
- Coach feedback.

Outside MVP:

- Habit marketplace.
- Advanced behavior scoring.

Acceptance criteria:

- Coach can assign a habit to player or team.
- Player can complete daily habit checks.
- Player can suggest a habit for coach review.
- Coach can approve, edit, or reject suggested habits.

Dependencies:

- Notifications, player profiles, permissions, offline sync.

Priority: P1.

### Goals

Inside MVP:

- Short-term, monthly, and long-term goals.
- Metric.
- Current value.
- Target value.
- Deadline.
- Milestones.
- Progress updates.
- Coach feedback.
- Status.
- History.
- Player goal proposals requiring coach approval or edits.

Outside MVP:

- Public goal sharing.
- Automated performance prediction.

Acceptance criteria:

- Coach can create and update goals.
- Player can propose goals.
- Goal history is preserved.
- Progress changes are auditable.

Dependencies:

- Player profile, permissions, activity log.

Priority: P1.

### Daily Wellness Check-In

Inside MVP:

- Sleep quality.
- Sleep duration.
- Energy.
- Fatigue.
- Muscle soreness.
- Stress.
- Mood.
- Motivation.
- Readiness.
- Pain.
- Injury notes.
- Mobile completion target under 60 seconds.

Outside MVP:

- Clinical diagnosis.
- Medical triage automation.

Acceptance criteria:

- Player can submit one check-in per day.
- Coach can see missing wellness and risk signals.
- Readiness score is labeled as coaching support, not diagnosis.
- Formula is documented and configurable later.

Dependencies:

- Player profile, health-alert rules, coach dashboard.

Priority: P0.

### Pain Body Map

Inside MVP:

- Select body area.
- Severity 0 to 10.
- Start time.
- Pain type.
- New or ongoing.
- Description.
- Optional image.
- Alert rules for pain threshold, repeated fatigue, sleep drop, readiness drop, and new injury.

Outside MVP:

- Medical body diagram precision beyond coaching-level reporting.
- Diagnosis or treatment recommendations.

Acceptance criteria:

- Pain record can trigger coach attention.
- Player can add/update pain record from mobile.
- Sensitive wording avoids diagnosis claims.

Dependencies:

- File storage, wellness, notifications, coach dashboard.

Priority: P0.

### Training Today

Inside MVP:

- Assigned session view.
- Start.
- Timer.
- Actual result.
- RPE.
- Pain during session.
- Complete.
- Partial.
- Skip with reason.
- Coach note display.

Outside MVP:

- Wearable device integration.
- Advanced video analysis.

Acceptance criteria:

- Player can execute assigned training from mobile.
- Completion state is visible to coach.
- Offline execution syncs safely.

Dependencies:

- Exercise library, training plans, offline sync.

Priority: P0.

### Progress

Inside MVP:

- Basic progress summary for habits, goals, wellness completion, and training completion.
- Simple trend summaries that support coach/player review.

Outside MVP:

- Advanced analytics dashboards.
- Predictive modeling.

Acceptance criteria:

- Player can see recent progress without needing desktop.
- Coach-visible data respects permissions.

Dependencies:

- Habits, goals, wellness, training.

Priority: P2.

### Notifications

Inside MVP:

- In-app notifications.
- Push after browser permission.
- Required email notifications where necessary.
- Preferences.
- Quiet hours.
- Immediate notifications.
- Daily digest.

Outside MVP:

- SMS.
- WhatsApp or chat-app integrations.

Acceptance criteria:

- Browser push permission is requested only after explaining value.
- User can control preferences.
- Quiet hours are respected.

Dependencies:

- Service worker, notification preferences, worker.

Priority: P1.

### Settings

Inside MVP:

- Language preference.
- Calendar preference.
- Timezone.
- 12-hour or 24-hour time.
- Theme preference.
- Basic account profile.

Outside MVP:

- Payment settings.
- Advanced security center beyond sessions/devices in authentication stage.

Acceptance criteria:

- English, Persian, and Arabic preferences are supported.
- English is LTR; Persian and Arabic are RTL.
- Gregorian default, Persian and Hijri optional.

Dependencies:

- i18n, calendar, authentication.

Priority: P0.

## Coach Modules

### Coach Dashboard

Inside MVP:

- Player list.
- Player status.
- Daily reports.
- Weekly reports.
- Assign training.
- Assign habits.
- Set goals.
- Messages.
- Injury alerts.
- Performance analytics.
- Missed training.
- Missing wellness.
- Assistant tasks.
- Priority Attention: high pain, new injury, repeated fatigue, poor sleep trend, missing sessions, repeated absence, readiness decline.

Outside MVP:

- Platform-wide analytics.
- Billing analytics.

Acceptance criteria:

- Coach sees only players they are allowed to access.
- Priority Attention links to the exact player context.
- Charts support decisions and are not decorative.

Dependencies:

- Players, teams, wellness, pain, training, attendance, tasks, messages.

Priority: P0.

### Players

Inside MVP:

- List.
- Search.
- Filters.
- Add manually.
- Add by invitation.
- Edit.
- Archive.
- Player profile.
- Status.
- Team membership.
- Profile tabs: Overview, Today, Training, Wellness, Habits, Goals, Assessments, Attendance, Reports, Notes, Files, Activity.

Outside MVP:

- Public player profiles.
- Parent/guardian accounts.

Acceptance criteria:

- All APIs enforce workspace and role access.
- Archived players are hidden from normal active lists but retained.

Dependencies:

- Workspace, roles, invitations, teams.

Priority: P0.

### Teams

Inside MVP:

- Create.
- Edit.
- Archive.
- Assign coach.
- Add players.
- Remove players.
- Multiple group membership.

Outside MVP:

- Cross-workspace teams.
- Tournament management.

Acceptance criteria:

- Team membership changes are permissioned and logged.
- Player can belong to multiple groups when needed.

Dependencies:

- Workspace members, player profiles, permissions.

Priority: P0.

### Exercise Library

Inside MVP:

- Name.
- Category.
- Objective.
- Equipment.
- Difficulty.
- Video.
- Image.
- Instructions.
- Coach tips.
- Common mistakes.
- Unit.
- Limitations.

Outside MVP:

- Public exercise marketplace.
- AI exercise generation.

Acceptance criteria:

- Coach can create reusable exercises.
- Media files use object storage.
- Exercises remain scoped to workspace unless future sharing is added.

Dependencies:

- File storage, permissions.

Priority: P1.

### Training Plan Builder

Inside MVP:

- Individual, team, and template plans.
- Sessions.
- Warm-up.
- Main.
- Cool-down.
- Sets, reps, weight, duration, distance, rest, intensity, notes.
- Copy.
- Repeat.
- Schedule.
- Draft.
- Publish.
- Version history.

Outside MVP:

- Real-time collaborative editing.
- Wearable import.

Acceptance criteria:

- Draft plans are not visible to players until published.
- Published versions preserve execution history.
- Team plan supports individual override.

Dependencies:

- Exercise library, weekly planner, teams, players.

Priority: P0.

### Attendance

Inside MVP:

- Mark present, absent, late, excused.
- Reason.
- Team and individual views.
- Repeated absence signal for Priority Attention.

Outside MVP:

- QR check-in.
- Biometric check-in.

Acceptance criteria:

- Coach or permitted assistant can mark attendance.
- Player attendance history is visible in profile.

Dependencies:

- Teams, training sessions, permissions.

Priority: P1.

### Assessments

Inside MVP:

- Create assessment.
- Record result.
- View history.
- Attach result to player profile.

Outside MVP:

- Advanced test protocols library.
- Automatic percentile ranking.

Acceptance criteria:

- Coach can define metric/unit.
- Player profile shows assessment history.

Dependencies:

- Player profile, files, permissions.

Priority: P2.

### Tasks And Delegation

Inside MVP:

- Title.
- Description.
- Assignee.
- Player or team context.
- Priority.
- Deadline.
- Checklist.
- Attachment.
- Reminder.
- Status.
- Completion note.

Outside MVP:

- Project-management style boards.
- External task integrations.

Acceptance criteria:

- Coach can assign tasks to assistants or coaches.
- Assignee can update task status.
- Activity is logged.

Dependencies:

- Workspace members, files, notifications.

Priority: P1.

### Messages

Inside MVP:

- Coach message to player or team.
- Player-visible coach message preview on Today.
- Basic in-app message history.

Outside MVP:

- Full chat replacement.
- Voice and video messaging.

Acceptance criteria:

- Messages respect workspace and player/team access.
- Coach can target a player or team.

Dependencies:

- Members, teams, notifications.

Priority: P2.

### Injury Alerts

Inside MVP:

- Alerts from pain threshold.
- New injury signal.
- Repeated fatigue.
- Sleep drop.
- Readiness drop.

Outside MVP:

- Medical diagnosis.
- Emergency escalation workflows.

Acceptance criteria:

- Alert language is coaching-oriented.
- Alert links to source wellness/pain record.

Dependencies:

- Wellness, pain body map, notifications, dashboard.

Priority: P0.

### Reports

Inside MVP:

- Daily report.
- Weekly report.
- Player profile report summaries.
- Missing data summaries.

Outside MVP:

- PDF/CSV export until import/export stage.
- Advanced business intelligence.

Acceptance criteria:

- Reports answer a coaching question.
- Reports are permission-filtered.

Dependencies:

- Training, wellness, habits, goals, attendance.

Priority: P2.

### Members And Permissions

Inside MVP:

- Workspace members.
- Owner, Coach, Assistant, Player roles.
- Team/player-scoped access.
- Basic permission matrix.

Outside MVP:

- Custom role builder with arbitrary permissions in first release unless required by invitation scope.

Acceptance criteria:

- Backend enforces access for all protected operations.
- Owner cannot remove the last owner from workspace.

Dependencies:

- Authentication, workspace, invitations.

Priority: P0.

### Invitations

Inside MVP:

- Invite token.
- Workspace.
- Role.
- Optional team.
- Expiration.
- Usage limit.
- Approval requirement.
- Revocation.
- Activity log.
- Rate limit.

Outside MVP:

- Bulk CSV invite until import/export stage.

Acceptance criteria:

- Existing account can accept invitation.
- New account sees role-appropriate signup.
- Free signup is only for coach-owner.

Dependencies:

- Authentication, members, teams, email.

Priority: P0.

### Coach Settings

Inside MVP:

- Workspace name.
- Country.
- Timezone.
- Language.
- Calendar.
- Hour format.
- Theme.
- Activity type.
- Approximate player count.

Outside MVP:

- Billing settings.
- Platform admin settings.

Acceptance criteria:

- Workspace defaults can differ from user preferences.
- Settings drive locale, calendar, and timezone display.

Dependencies:

- i18n, calendar, workspace.

Priority: P0.

## Out Of MVP

- Platform Admin and subscriptions.
- Payments.
- Production deployment automation beyond local development foundations.
- Backup/restore implementation.
- Import/export implementation.
- Public marketing website implementation.
- Advanced analytics and prediction.
- External calendar sync.
- Wearable integrations.
- Medical diagnosis or treatment recommendations.
- Social network features.

## Cross-Cutting Acceptance Criteria

- All workspace data is scoped by workspace and enforced on the backend.
- All server inputs are validated.
- Mobile layout is the primary acceptance target.
- English, Persian, Arabic and LTR/RTL behavior are considered in UI design.
- Dark, Light, and System theme support is designed before feature UI expands.
- Offline-capable MVP workflows must show local/save/sync state.
- No real secrets are committed.

## Open Questions And Decisions

- Decide whether custom roles are truly required in MVP or whether scoped Coach/Assistant permissions are enough.
- Decide whether messaging should be minimal announcement-style or conversational.
- Decide whether reports in MVP must include printable views before export features.
- Decide which assessment types are included as defaults, if any.
