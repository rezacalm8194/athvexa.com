import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "packages/database/drizzle/0000_base_identity_workspace.sql"),
  "utf8"
);

describe("base database migration", () => {
  it("creates only Stage 6 base tables", () => {
    const tables = [...migration.matchAll(/CREATE TABLE "([^"]+)"/g)].map((match) => match[1]);

    expect(tables).toEqual([
      "users",
      "devices",
      "sessions",
      "workspaces",
      "roles",
      "permissions",
      "workspace_members",
      "activity_logs"
    ]);
  });

  it("does not introduce product tables yet", () => {
    expect(migration).not.toMatch(/player_profiles|teams|training_plans|wellness_checks/);
  });

  it("includes workspace isolation and audit foundations", () => {
    expect(migration).toContain('"workspace_id" uuid');
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain('CREATE POLICY "workspaces_workspace_isolation"');
    expect(migration).toContain('CREATE TABLE "activity_logs"');
  });

  it("keeps session tokens hashed and unique", () => {
    expect(migration).toContain('"token_hash" text NOT NULL');
    expect(migration).toContain('CREATE UNIQUE INDEX "sessions_token_hash_uidx"');
    expect(migration).not.toContain("refresh_token");
  });
});

const authMigration = readFileSync(
  join(process.cwd(), "packages/database/drizzle/0001_auth_reset_and_attempts.sql"),
  "utf8"
);

describe("auth database migration", () => {
  it("adds password reset and login attempt tables only", () => {
    const tables = [...authMigration.matchAll(/CREATE TABLE "([^"]+)"/g)].map((match) => match[1]);

    expect(tables).toEqual(["password_reset_tokens", "login_attempts"]);
  });

  it("stores reset tokens as hashes and logs attempts", () => {
    expect(authMigration).toContain('"token_hash" text NOT NULL');
    expect(authMigration).toContain('"success" boolean DEFAULT false NOT NULL');
    expect(authMigration).not.toContain("password text");
  });
});
