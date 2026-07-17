CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "user_status" AS ENUM ('active', 'locked', 'disabled');
CREATE TYPE "member_status" AS ENUM ('invited', 'active', 'suspended', 'removed');
CREATE TYPE "role_key" AS ENUM ('owner', 'coach', 'assistant', 'player');
CREATE TYPE "scope_mode" AS ENUM ('all', 'assigned', 'none');
CREATE TYPE "theme_preference" AS ENUM ('dark', 'light', 'system');
CREATE TYPE "locale_preference" AS ENUM ('en', 'fa', 'ar');
CREATE TYPE "calendar_preference" AS ENUM ('gregorian', 'persian', 'hijri');
CREATE TYPE "hour_format_preference" AS ENUM ('12', '24');

CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" varchar(320) NOT NULL,
  "email_normalized" varchar(320) NOT NULL,
  "password_hash" text NOT NULL,
  "email_verified_at" timestamptz,
  "name" varchar(160),
  "avatar_file_id" uuid,
  "status" "user_status" DEFAULT 'active' NOT NULL,
  "default_locale" "locale_preference" DEFAULT 'en' NOT NULL,
  "default_timezone" varchar(80) DEFAULT 'UTC' NOT NULL,
  "default_calendar" "calendar_preference" DEFAULT 'gregorian' NOT NULL,
  "default_hour_format" "hour_format_preference" DEFAULT '24' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "deleted_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL
);

CREATE TABLE "devices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "label" varchar(160),
  "fingerprint_hash" text,
  "last_seen_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "revoked_at" timestamptz
);

CREATE TABLE "sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "device_id" uuid REFERENCES "devices"("id") ON DELETE set null,
  "token_hash" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "revoked_at" timestamptz,
  "last_seen_at" timestamptz,
  "ip_hash" text,
  "user_agent" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE "workspaces" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(160) NOT NULL,
  "slug" varchar(120) NOT NULL,
  "country" varchar(2),
  "timezone" varchar(80) DEFAULT 'UTC' NOT NULL,
  "default_locale" "locale_preference" DEFAULT 'en' NOT NULL,
  "default_calendar" "calendar_preference" DEFAULT 'gregorian' NOT NULL,
  "default_hour_format" "hour_format_preference" DEFAULT '24' NOT NULL,
  "theme" "theme_preference" DEFAULT 'dark' NOT NULL,
  "activity_type" varchar(80),
  "approx_player_count" integer,
  "created_by" uuid REFERENCES "users"("id") ON DELETE set null,
  "updated_by" uuid REFERENCES "users"("id") ON DELETE set null,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "deleted_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL
);

CREATE TABLE "roles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid REFERENCES "workspaces"("id") ON DELETE cascade,
  "key" "role_key" NOT NULL,
  "name" varchar(80) NOT NULL,
  "description" text,
  "is_system" boolean DEFAULT false NOT NULL,
  "created_by" uuid REFERENCES "users"("id") ON DELETE set null,
  "updated_by" uuid REFERENCES "users"("id") ON DELETE set null,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "deleted_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL
);

CREATE TABLE "permissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "role_id" uuid NOT NULL REFERENCES "roles"("id") ON DELETE cascade,
  "resource" varchar(80) NOT NULL,
  "action" varchar(80) NOT NULL,
  "scope" varchar(80) DEFAULT 'workspace' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "permissions_role_resource_action_scope_uidx" UNIQUE ("role_id", "resource", "action", "scope")
);

CREATE TABLE "workspace_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "role_id" uuid NOT NULL REFERENCES "roles"("id") ON DELETE restrict,
  "status" "member_status" DEFAULT 'active' NOT NULL,
  "joined_at" timestamptz,
  "invited_by" uuid REFERENCES "users"("id") ON DELETE set null,
  "team_scope_mode" "scope_mode" DEFAULT 'all' NOT NULL,
  "player_scope_mode" "scope_mode" DEFAULT 'all' NOT NULL,
  "created_by" uuid REFERENCES "users"("id") ON DELETE set null,
  "updated_by" uuid REFERENCES "users"("id") ON DELETE set null,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "deleted_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL
);

CREATE TABLE "activity_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid REFERENCES "workspaces"("id") ON DELETE set null,
  "actor_user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "actor_member_id" uuid REFERENCES "workspace_members"("id") ON DELETE set null,
  "action" varchar(120) NOT NULL,
  "entity_type" varchar(120) NOT NULL,
  "entity_id" uuid,
  "before" jsonb,
  "after" jsonb,
  "ip_hash" text,
  "user_agent" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "users_email_normalized_uidx" ON "users" ("email_normalized");
CREATE INDEX "users_status_idx" ON "users" ("status");
CREATE INDEX "devices_user_id_idx" ON "devices" ("user_id");
CREATE UNIQUE INDEX "sessions_token_hash_uidx" ON "sessions" ("token_hash");
CREATE INDEX "sessions_user_id_idx" ON "sessions" ("user_id");
CREATE INDEX "sessions_expires_at_idx" ON "sessions" ("expires_at");
CREATE UNIQUE INDEX "workspaces_slug_uidx" ON "workspaces" ("slug");
CREATE INDEX "workspaces_slug_idx" ON "workspaces" ("slug");
CREATE UNIQUE INDEX "roles_system_key_uidx" ON "roles" ("key") WHERE "workspace_id" IS NULL;
CREATE UNIQUE INDEX "roles_workspace_key_uidx" ON "roles" ("workspace_id", "key") WHERE "workspace_id" IS NOT NULL AND "deleted_at" IS NULL;
CREATE INDEX "roles_workspace_id_idx" ON "roles" ("workspace_id");
CREATE INDEX "permissions_role_id_idx" ON "permissions" ("role_id");
CREATE UNIQUE INDEX "workspace_members_active_workspace_user_uidx" ON "workspace_members" ("workspace_id", "user_id") WHERE "deleted_at" IS NULL;
CREATE INDEX "workspace_members_workspace_user_idx" ON "workspace_members" ("workspace_id", "user_id");
CREATE INDEX "workspace_members_workspace_role_idx" ON "workspace_members" ("workspace_id", "role_id");
CREATE INDEX "workspace_members_status_idx" ON "workspace_members" ("status");
CREATE INDEX "activity_logs_workspace_created_at_idx" ON "activity_logs" ("workspace_id", "created_at");
CREATE INDEX "activity_logs_entity_idx" ON "activity_logs" ("entity_type", "entity_id");
CREATE INDEX "activity_logs_actor_idx" ON "activity_logs" ("actor_user_id");

ALTER TABLE "workspaces" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workspace_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activity_logs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspaces_workspace_isolation" ON "workspaces"
  USING (
    "id" = nullif(current_setting('app.current_workspace_id', true), '')::uuid
    AND EXISTS (
      SELECT 1
      FROM "workspace_members"
      WHERE "workspace_members"."workspace_id" = "workspaces"."id"
        AND "workspace_members"."user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid
        AND "workspace_members"."status" = 'active'
        AND "workspace_members"."deleted_at" IS NULL
    )
  );

CREATE POLICY "workspace_members_workspace_isolation" ON "workspace_members"
  USING ("workspace_id" = nullif(current_setting('app.current_workspace_id', true), '')::uuid);

CREATE POLICY "roles_workspace_isolation" ON "roles"
  USING (
    "workspace_id" IS NULL
    OR "workspace_id" = nullif(current_setting('app.current_workspace_id', true), '')::uuid
  );

CREATE POLICY "permissions_role_workspace_isolation" ON "permissions"
  USING (
    EXISTS (
      SELECT 1
      FROM "roles"
      WHERE "roles"."id" = "permissions"."role_id"
        AND (
          "roles"."workspace_id" IS NULL
          OR "roles"."workspace_id" = nullif(current_setting('app.current_workspace_id', true), '')::uuid
        )
    )
  );

CREATE POLICY "activity_logs_workspace_isolation" ON "activity_logs"
  USING (
    "workspace_id" IS NULL
    OR "workspace_id" = nullif(current_setting('app.current_workspace_id', true), '')::uuid
  );
