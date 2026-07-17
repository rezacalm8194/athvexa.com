CREATE TABLE "password_reset_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "token_hash" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "used_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE "login_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email_normalized" varchar(320),
  "user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "ip_hash" text,
  "user_agent" text,
  "success" boolean DEFAULT false NOT NULL,
  "failure_reason" varchar(120),
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "password_reset_tokens_token_hash_uidx" ON "password_reset_tokens" ("token_hash");
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens" ("user_id");
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens" ("expires_at");
CREATE INDEX "login_attempts_email_created_at_idx" ON "login_attempts" ("email_normalized", "created_at");
CREATE INDEX "login_attempts_user_created_at_idx" ON "login_attempts" ("user_id", "created_at");
