# Roles And Permissions

## Purpose

Define MVP roles, workspace membership rules, and a permission matrix for backend-enforced access.

## Status

Stage 2 product draft. Ready for review before architecture and database design.

## Permission Principles

- Permissions are enforced in the backend for every protected operation.
- UI hiding is not a security boundary.
- All workspace business data belongs to exactly one workspace.
- Team-scoped and player-scoped permissions restrict data visibility.
- The last owner of a workspace cannot be removed or downgraded.
- Platform admin access to private workspace data is out of MVP and must require audit logging later.

## Roles

### Platform Admin

Operates the SaaS platform. This role is outside MVP feature implementation and must not be confused with workspace roles.

Future capabilities:

- View workspace metadata.
- Manage plans and subscriptions.
- Review backup and security events.
- Suspend workspaces.

Restriction:

- Cannot inspect private workspace data without explicit audited access in the later Platform Admin stage.

### Owner

The coach who creates and controls a workspace.

Capabilities:

- Manage workspace settings.
- Manage members and invitations.
- Manage teams, players, training, routines, habits, goals, attendance, assessments, tasks, messages, reports, and files.
- Assign scoped permissions.
- Archive players and teams.

Restrictions:

- Cannot remove or downgrade the final owner.
- Cannot bypass audit logging for sensitive operations.

### Coach

A collaborator coach invited into a workspace.

Capabilities:

- Manage assigned teams and players.
- Assign training, habits, goals, assessments, attendance, tasks, feedback, and messages within scope.
- View reports for permitted players.

Restrictions:

- Cannot manage billing or platform settings.
- Cannot manage owner membership.
- Cannot access teams or players outside assigned scope.

### Assistant

A support role for delegated operational work.

Capabilities:

- View assigned tasks.
- View assigned player/team context.
- Update assigned task status.
- Mark attendance if granted.
- Upload task attachments if granted.
- Add completion notes.

Restrictions:

- Cannot create workspace.
- Cannot manage members by default.
- Cannot publish training plans by default.
- Cannot access unrelated player data through task links.

### Player

A participant who executes assigned work and reports daily data.

Capabilities:

- View own Today Dashboard, routines, weekly plan, training, habits, goals, progress, messages, notifications, and settings.
- Submit wellness and pain records.
- Execute training.
- Complete habits.
- Update goal progress.
- Suggest habits and goals.

Restrictions:

- Cannot view other players.
- Cannot create workspace.
- Cannot join workspace without invitation.
- Cannot edit coach-authored plans directly.

## Permission Matrix

Legend:

- Full: can create, read, update, archive/delete where applicable.
- Scoped: limited by assigned team/player/task scope.
- Own: limited to the user’s own player data.
- Read: read-only.
- None: no access.

| Area | Owner | Coach | Assistant | Player |
| --- | --- | --- | --- | --- |
| Workspace settings | Full | Read or Scoped | None | None |
| Members | Full | Read scoped members | None | None |
| Invitations | Full | Scoped if granted | None | None |
| Roles and permissions | Full | None | None | None |
| Teams | Full | Scoped | Scoped read | Own team read |
| Players | Full | Scoped | Scoped read | Own |
| Player profile overview | Full | Scoped | Scoped read | Own |
| Daily schedule | Full | Scoped | Scoped read/update if granted | Own read |
| Daily routine templates | Full | Scoped | None | Own assigned read |
| Routine completion | Full read | Scoped read | Scoped read | Own update |
| Weekly planner | Full | Scoped | Scoped read | Own read |
| Habits | Full | Scoped | Scoped read if granted | Own update/suggest |
| Goals | Full | Scoped | Scoped read if granted | Own update/suggest |
| Wellness check-ins | Full read | Scoped read | Scoped read if granted | Own create/read |
| Pain records | Full read | Scoped read | Scoped read if granted | Own create/read |
| Exercise library | Full | Scoped | Read if granted | Assigned exercise read |
| Training plans | Full | Scoped | Read if granted | Assigned plan read |
| Training execution results | Full read | Scoped read | Scoped read if granted | Own create/update |
| Attendance | Full | Scoped | Scoped update if granted | Own read |
| Assessments | Full | Scoped | Scoped read/update if granted | Own read |
| Tasks | Full | Scoped | Assigned update | Own related read if applicable |
| Messages | Full | Scoped | Scoped if granted | Own read/respond if enabled |
| Notifications | Own plus admin-created | Own | Own | Own |
| Reports | Full | Scoped | Scoped read if granted | Own summary |
| Notes | Full | Scoped | Scoped if granted | Open decision |
| Files | Full | Scoped | Scoped if granted | Own/assigned read |
| Activity log | Full | Scoped read | Own task activity | Own relevant activity |
| Offline data | Own device cache | Own device cache | Own device cache | Own device cache |

## Workspace Ownership Rules

- A workspace must have at least one owner.
- Public signup creates a new owner and workspace.
- Collaborator coaches, assistants, and players are created or linked through invitation.
- Owner may invite another owner only if future requirements allow it; MVP can defer multi-owner support unless needed.
- Workspace deletion is outside MVP and should require a future safety flow.

## Team-Level Permissions

Team scope can allow a Coach or Assistant to access:

- Team roster.
- Team schedule.
- Team training plans.
- Team attendance.
- Team-level tasks.
- Reports for players in that team.

Team scope does not automatically allow:

- Workspace settings.
- Member management.
- Players outside the team.
- Sensitive security operations.

## Player-Level Permissions

Player scope can allow a Coach or Assistant to access:

- Specific player profile.
- Today data.
- Wellness and pain records if granted.
- Training execution.
- Habits and goals.
- Attendance and assessments.
- Notes and files if granted.

Player scope does not allow:

- Other players on the same team unless separately granted.
- Workspace-wide reports.
- Team plan editing unless separately granted.

## Invitation Permissions

Invitation includes:

- Token.
- Workspace.
- Role.
- Optional team.
- Optional player scope.
- Expiration.
- Usage limit.
- Approval requirement.
- Revocation state.
- Activity log.
- Rate limit metadata.

Rules:

- Invitation token must be non-guessable.
- Expired, revoked, or overused invitations cannot be accepted.
- Existing accounts can accept invitations after login.
- New users create accounts through role-specific invitation flow.

## Sensitive Operations

Require stronger checks and activity logging:

- Member invitation.
- Member role or scope change.
- Invitation revocation.
- Player archive.
- Team archive.
- Training plan publish.
- Permission changes.
- Session/device revocation.
- Import/export and backup operations in later stages.

## Open Questions And Decisions

- Decide whether MVP supports multiple owners per workspace.
- Decide whether assistant can see wellness and pain records by default or only with explicit permission.
- Decide whether player notes are private, coach-visible, or configurable.
- Decide whether players can respond to coach messages in MVP.
