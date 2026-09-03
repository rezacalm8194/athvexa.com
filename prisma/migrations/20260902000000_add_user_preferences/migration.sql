-- Personal display preferences are intentionally stored on User, not Team.
ALTER TABLE "User" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'en';
ALTER TABLE "User" ADD COLUMN "timeZone" TEXT;
ALTER TABLE "User" ADD COLUMN "onboardingCompletedAt" DATETIME;
