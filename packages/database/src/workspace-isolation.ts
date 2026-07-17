export const workspaceScopedTables = [
  "workspaces",
  "roles",
  "permissions",
  "workspace_members",
  "invitations",
  "activity_logs"
] as const;

export const rlsSessionVariables = [
  "app.current_user_id",
  "app.current_workspace_id",
  "app.current_member_id",
  "app.current_role"
] as const;

export function assertWorkspaceId(workspaceId: string): string {
  if (!workspaceId) {
    throw new Error("workspace_id is required for workspace-scoped operations");
  }

  return workspaceId;
}

export function buildWorkspaceContextSql(options: {
  userId: string;
  workspaceId: string;
  memberId?: string;
  role?: string;
}) {
  assertWorkspaceId(options.workspaceId);

  return [
    ["app.current_user_id", options.userId],
    ["app.current_workspace_id", options.workspaceId],
    ["app.current_member_id", options.memberId ?? ""],
    ["app.current_role", options.role ?? ""]
  ] as const;
}
