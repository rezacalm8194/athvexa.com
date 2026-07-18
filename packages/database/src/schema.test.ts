import { describe, expect, it } from "vitest";
import { baseSchemaTables, memberSchemaTables } from "./schema";
import { getDevelopmentSeed } from "./seed";
import { buildWorkspaceContextSql, workspaceScopedTables } from "./workspace-isolation";

describe("base database schema", () => {
  it("exports only the Stage 6 base tables", () => {
    expect(Object.keys(baseSchemaTables).sort()).toEqual([
      "activityLogs",
      "devices",
      "permissions",
      "roles",
      "sessions",
      "users",
      "workspaceMembers",
      "workspaces"
    ]);
  });

  it("keeps product tables out of the Stage 6 schema", () => {
    expect(Object.keys(baseSchemaTables)).not.toContain("playerProfiles");
    expect(Object.keys(baseSchemaTables)).not.toContain("teams");
    expect(Object.keys(baseSchemaTables)).not.toContain("trainingPlans");
    expect(Object.keys(baseSchemaTables)).not.toContain("wellnessChecks");
  });

  it("exports Stage 10 member and invitation tables without player/team tables", () => {
    expect(Object.keys(memberSchemaTables).sort()).toEqual([
      "activityLogs",
      "devices",
      "invitations",
      "loginAttempts",
      "passwordResetTokens",
      "permissions",
      "platformAdmins",
      "platformSettings",
      "roles",
      "sessions",
      "users",
      "workspaceMembers",
      "workspaces"
    ]);
    expect(Object.keys(memberSchemaTables)).not.toContain("teams");
    expect(Object.keys(memberSchemaTables)).not.toContain("playerProfiles");
  });


  it("defines development seed without real users or secrets", () => {
    const seed = getDevelopmentSeed();

    expect(seed.roles.map((role) => role.key)).toEqual(["owner", "coach", "assistant", "player"]);
    expect(seed.platformAdmins).toEqual([
      "r.hasantabar7@gmail.com",
      "rezasafarinet1@gmail.com"
    ]);
    expect(JSON.stringify(seed)).not.toMatch(/password|token|secret/i);
  });

  it("builds workspace context variables for RLS-aware operations", () => {
    expect(
      buildWorkspaceContextSql({
        userId: "user-id",
        workspaceId: "workspace-id",
        memberId: "member-id",
        role: "owner"
      })
    ).toEqual([
      ["app.current_user_id", "user-id"],
      ["app.current_workspace_id", "workspace-id"],
      ["app.current_member_id", "member-id"],
      ["app.current_role", "owner"]
    ]);
  });

  it("lists workspace-sensitive tables for isolation checks", () => {
    expect(workspaceScopedTables).toEqual([
      "workspaces",
      "roles",
      "permissions",
      "workspace_members",
      "invitations",
      "activity_logs"
    ]);
  });
});
