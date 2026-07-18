CREATE TABLE "platform_settings" (
  "key" varchar(120) PRIMARY KEY NOT NULL,
  "value" text NOT NULL,
  "updated_by" uuid REFERENCES "users"("id") ON DELETE set null,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

INSERT INTO "platform_settings" ("key", "value")
VALUES ('default_locale', 'en')
ON CONFLICT ("key") DO NOTHING;
