CREATE TABLE "invitations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
  "email_normalized" varchar(320) NOT NULL,
  "role_id" uuid NOT NULL REFERENCES "roles"("id") ON DELETE restrict,
  "team_id" uuid,
  "player_scope_id" uuid,
  "token_hash" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "usage_limit" integer DEFAULT 1 NOT NULL,
  "usage_count" integer DEFAULT 0 NOT NULL,
  "requires_approval" boolean DEFAULT false NOT NULL,
  "revoked_at" timestamptz,
  "accepted_at" timestamptz,
  "accepted_by" uuid REFERENCES "users"("id") ON DELETE set null,
  "created_by" uuid REFERENCES "users"("id") ON DELETE set null,
  "updated_by" uuid REFERENCES "users"("id") ON DELETE set null,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "deleted_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL
);

CREATE UNIQUE INDEX "invitations_token_hash_uidx" ON "invitations" ("token_hash");
CREATE INDEX "invitations_workspace_email_idx" ON "invitations" ("workspace_id", "email_normalized");
CREATE INDEX "invitations_token_hash_idx" ON "invitations" ("token_hash");
CREATE INDEX "invitations_expires_at_idx" ON "invitations" ("expires_at");
CREATE INDEX "invitations_workspace_status_idx" ON "invitations" ("workspace_id", "revoked_at", "accepted_at");

ALTER TABLE "invitations" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invitations_workspace_isolation" ON "invitations"
  USING ("workspace_id" = nullif(current_setting('app.current_workspace_id', true), '')::uuid);
