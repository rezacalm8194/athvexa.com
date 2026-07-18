CREATE TABLE "platform_admins" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email_normalized" varchar(320) NOT NULL,
  "user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "granted_by" uuid REFERENCES "users"("id") ON DELETE set null,
  "revoked_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "deleted_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL
);

CREATE UNIQUE INDEX "platform_admins_active_email_uidx" ON "platform_admins" ("email_normalized")
  WHERE "revoked_at" IS NULL AND "deleted_at" IS NULL;
CREATE INDEX "platform_admins_user_id_idx" ON "platform_admins" ("user_id");

INSERT INTO "platform_admins" ("email_normalized")
VALUES
  ('r.hasantabar7@gmail.com'),
  ('rezasafarinet1@gmail.com')
ON CONFLICT DO NOTHING;
