# User Flows

## Purpose

Document the main MVP flows for coach-owners, collaborator coaches, assistants, and players.

## Status

Stage 10 invitations and members implemented locally. Email delivery, live persistence, and team/player modules are staged for later backend-connected work.

## Flow Principles

- Public signup creates only a coach-owner account.
- Players, assistants, and collaborator coaches enter through invitation.
- Email verification is disabled in MVP, but the future field and flow must remain possible.
- Every protected flow is checked in the backend against workspace membership, role, and scoped permissions.
- Player flows are mobile-first.

## Coach-Owner Flows

### Signup And Workspace Creation

1. Coach opens signup.
2. Coach enters email and password.
3. System creates user account without requiring email verification.
4. System creates an owner session.
5. Coach enters onboarding.
6. Coach creates workspace name.
7. Coach selects country, timezone, language, calendar, and hour format.
8. Coach selects activity type and approximate player count.
9. Coach optionally creates first team.
10. Coach lands on Coach Dashboard.

Acceptance notes:

- Signup is available only for future workspace owners.
- Password and session secrets are never stored in localStorage or IndexedDB.
- Return-to-safe-page behavior is supported after login.
- `/onboarding` now collects workspace name, country, timezone, language, calendar, hour format, activity type, approximate player count, and optional first team.
- Optional onboarding steps can be skipped and surfaced later from the Coach Dashboard shell.
- `/coach` is currently a post-onboarding entry shell only; full dashboard behavior remains reserved for the Coach Dashboard and report stages.

### Create First Team

1. Owner opens onboarding or Teams.
2. Owner enters team name and optional description.
3. Owner confirms.
4. Team appears in workspace team list.
5. Owner can invite players or assign coaches.

Acceptance notes:

- Team belongs to one workspace.
- Creation is activity-logged.

### Invite Player

1. Owner opens Players or Team Members.
2. Owner selects Invite Player.
3. Owner enters player email and optional team.
4. Owner sets expiration, usage limit, and approval requirement if needed.
5. System creates non-guessable invitation token.
6. System sends email through mail service.
7. Invitation appears in pending invitations.
8. Player accepts invitation and joins the workspace.

Acceptance notes:

- Invitation can be revoked.
- Existing accounts attach invitation to their account.
- New accounts see player-specific signup.
- Stage 10 adds the local invitation schema, migration, validation contract, and owner invitation UI.
- Player invitations remain single-use.
- Team selection is deferred until teams exist in Stage 11.

### Invite Assistant Or Coach

1. Owner opens Members and Permissions.
2. Owner selects role: Coach or Assistant.
3. Owner optionally limits access by team or player.
4. Owner sends invitation.
5. Invitee accepts and becomes workspace member.
6. Owner can edit or revoke access later.

Acceptance notes:

- Assistant permissions should be limited by default.
- Collaborator coach access can be broad or scoped.
- Assistant invitations cannot default to all-team access in validation.
- Member roster UI shows role, status, and scope as the future access-control surface.

### Build And Publish Training Plan

1. Coach opens Training Plan Builder.
2. Coach selects individual, team, or template plan.
3. Coach adds sessions and exercises.
4. Coach configures sets, reps, weight, duration, distance, rest, intensity, and notes.
5. Coach saves draft.
6. Coach previews affected players.
7. Coach publishes.
8. Players see Training Today on assigned dates.

Acceptance notes:

- Draft is not player-visible.
- Published version history is preserved.
- Individual override does not mutate the team plan unexpectedly.

### Review Priority Attention

1. Coach opens Coach Dashboard.
2. System shows Priority Attention cards.
3. Coach filters by team or status.
4. Coach opens a card.
5. Coach lands on the relevant player profile tab and source record.
6. Coach assigns follow-up task, sends message, or adjusts plan.

Acceptance notes:

- Each card links to evidence, not only summary text.
- Coach sees only permitted players.

## Collaborator Coach Flows

### Accept Coach Invitation

1. Invited coach opens invitation link.
2. System validates token, expiration, role, usage limit, and workspace.
3. If account exists, coach logs in.
4. If account does not exist, coach creates account with email and password.
5. System creates workspace membership.
6. Coach enters the workspace with assigned scope.

Acceptance notes:

- Public signup is not used for collaborator coach entry.
- Email verification remains disabled in MVP.

### Manage Assigned Players Or Teams

1. Coach opens Players or Teams.
2. System filters by assigned scope.
3. Coach views allowed profiles.
4. Coach assigns training, habits, goals, or feedback within permission scope.
5. System blocks access outside scope.

Acceptance notes:

- Hidden UI is not enough; backend checks are required.

## Assistant Flows

### Accept Assistant Invitation

1. Assistant opens invitation link.
2. System validates invitation.
3. Assistant logs in or creates account.
4. System creates assistant workspace membership.
5. Assistant sees task-focused workspace entry.

Acceptance notes:

- Assistant does not receive owner-level controls.
- Assistant access can be team-scoped or player-scoped.

### Complete Delegated Task

1. Assistant opens Tasks.
2. Assistant selects assigned task.
3. Assistant reviews player/team context.
4. Assistant completes checklist items.
5. Assistant attaches optional file if permitted.
6. Assistant adds completion note.
7. Assistant marks task done.
8. Coach receives in-app notification.

Acceptance notes:

- Task changes are activity-logged.
- Assistant cannot access unrelated player data through task context.

### Mark Attendance

1. Assistant opens session attendance for permitted team.
2. Assistant marks present, absent, late, or excused.
3. Assistant adds reason when needed.
4. System saves attendance.
5. Coach dashboard reflects missed/repeated absence signals.

Acceptance notes:

- Attendance editing must be permissioned.
- Repeated absence contributes to Priority Attention.

## Player Flows

### Accept Player Invitation

1. Player opens invitation link.
2. System validates token and role.
3. If player has account, player logs in.
4. If player has no account, player creates account with email and password.
5. System attaches player to workspace and optional team.
6. Player lands on player onboarding or Today Dashboard.

Acceptance notes:

- Player cannot create a workspace through this flow.
- Player sees only their own player experience.

### Daily Today Flow

1. Player opens app on mobile.
2. Player sees Today Dashboard.
3. Player reviews schedule, tasks, training, wellness, habits, and incomplete items.
4. Player completes wellness check-in.
5. Player completes routine checklist.
6. Player executes training if assigned.
7. Player checks habits.
8. Player reviews daily progress score.

Acceptance notes:

- Offline data is clearly marked when stale or pending sync.
- Empty states are simple and not punitive.

### Wellness And Pain Flow

1. Player opens wellness check-in.
2. Player enters sleep quality, sleep duration, energy, fatigue, soreness, stress, mood, motivation, readiness, pain, and injury notes.
3. If pain is present, player opens body map.
4. Player selects body area, severity, start time, pain type, new/ongoing status, description, and optional image.
5. System saves record.
6. Alert rules may create coach attention item.

Acceptance notes:

- Target completion time is under 60 seconds.
- Readiness score is not presented as medical diagnosis.

### Training Execution Flow

1. Player opens Training Today.
2. Player reviews assigned session.
3. Player starts session and timer.
4. Player records actual result, RPE, pain, completion state, and skip reason if needed.
5. System saves locally if offline.
6. System syncs when online.
7. Coach sees execution state.

Acceptance notes:

- Repeated sync attempts must not create duplicates.
- Partial and skipped sessions require reasons.

### Habit And Goal Flow

1. Player opens Habits or Goals.
2. Player completes daily habit checks.
3. Player views streak and completion.
4. Player updates goal progress.
5. Player may suggest a new habit or goal.
6. Coach reviews, approves, edits, or rejects the suggestion.

Acceptance notes:

- Player proposals should not become assigned coach-approved work without review.

## Cross-Role Flows

### Login

1. User opens login.
2. User enters email and password.
3. System rate-limits attempts.
4. System returns generic errors for failure.
5. System creates secure database session for success.
6. User is redirected to last safe page or role-appropriate home.

Acceptance notes:

- Email verification does not block login in MVP.
- Session cookie is HttpOnly, secure in production, SameSite appropriate, expiring, and revocable.

### Logout

1. User selects logout.
2. System revokes current session.
3. User returns to login.

Acceptance notes:

- Logout from one device and all devices are handled in authentication stage.

### Offline Sync

1. User performs offline-capable action.
2. App saves to IndexedDB with pending sync state.
3. App retries when online.
4. Server applies operation idempotently.
5. App shows synced state or conflict state.

Acceptance notes:

- Conflicts are not overwritten silently.

## Open Questions And Decisions

- Decide whether player onboarding asks profile details before or after first Today Dashboard.
- Decide whether assistant default landing page is Tasks or Coach Dashboard with limited panels.
- Decide whether player-to-coach messages are allowed in MVP or only coach-to-player messages.
