import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

// Prevent hot-reload from spawning a new PrismaClient on every save in dev.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function resolveSqliteUrl() {
  const raw = (process.env.DATABASE_URL ?? "").trim();
  const requested = raw.startsWith("file:") ? raw.slice("file:".length).replace(/^\.\//, "") : "dev.db";
  const cwd = process.cwd();
  const candidates = [
    path.resolve(cwd, requested),
    path.resolve(cwd, "dev.db"),
    path.resolve(cwd, "prisma", "dev.db"),
    path.resolve(cwd, "prisma", requested),
  ];
  const unique = [...new Set(candidates)];
  const existing = unique
    .filter((filePath) => {
      try {
        return fs.existsSync(filePath);
      } catch {
        return false;
      }
    })
    .sort((a, b) => {
      try {
        return fs.statSync(b).size - fs.statSync(a).size;
      } catch {
        return 0;
      }
    });
  const chosen = existing[0] ?? path.resolve(cwd, "prisma", "dev.db");
  try {
    fs.mkdirSync(path.dirname(chosen), { recursive: true });
  } catch (error) {
    console.error("[db] could not ensure sqlite directory", error);
  }
  return `file:${chosen.replace(/\\/g, "/")}`;
}

const sqliteUrl = resolveSqliteUrl();

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: sqliteUrl } },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

let sqliteReady: Promise<void> | null = null;

function isIgnorableSchemaError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /readonly|SQLITE_READONLY|SQLITE_BUSY|already exists|duplicate column|returned results/i.test(message);
}

async function sqliteExec(sql: string) {
  try {
    await db.$executeRawUnsafe(sql);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/returned results/i.test(message)) {
      await db.$queryRawUnsafe(sql);
      return;
    }
    if (isIgnorableSchemaError(error)) {
      console.error("[db] ignored schema statement", message.slice(0, 180));
      return;
    }
    throw error;
  }
}

/**
 * SQLite table bootstrap. Runs at most once per process — not on every query.
 * If the User table already exists (production), skip DDL so login cannot 500.
 */
export function ensureDatabase() {
  sqliteReady ??= (async () => {
    const tables = await db.$queryRawUnsafe<{ name: string }[]>(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'User' LIMIT 1`
    );
    if (tables.length === 0) {
      await ensureSqliteSchema();
    }
    await ensureUserPreferenceColumns();
    await ensureTeamWorkspaceColumns();
    await ensureAssessmentScoreIsReal();
    const { ensureRezaDemoRoster } = await import("./seedTestRoster");
    await ensureRezaDemoRoster().catch((error) => {
      console.error("[db] demo roster seed skipped", error);
    });
  })().catch((error) => {
    sqliteReady = null;
    if (isIgnorableSchemaError(error)) {
      console.error("[db] Schema bootstrap skipped", error);
      return;
    }
    throw error;
  });
  return sqliteReady;
}

async function ensureUserPreferenceColumns() {
  const columns = await db.$queryRawUnsafe<{ name: string }[]>(`PRAGMA table_info("User");`);
  if (!columns.some((column) => column.name === "locale")) {
    await sqliteExec(`ALTER TABLE "User" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'en';`);
  }
  if (!columns.some((column) => column.name === "timeZone")) {
    await sqliteExec(`ALTER TABLE "User" ADD COLUMN "timeZone" TEXT;`);
  }
  if (!columns.some((column) => column.name === "onboardingCompletedAt")) {
    await sqliteExec(`ALTER TABLE "User" ADD COLUMN "onboardingCompletedAt" DATETIME;`);
  }
  if (!columns.some((column) => column.name === "notifyCheckIns")) {
    await sqliteExec(`ALTER TABLE "User" ADD COLUMN "notifyCheckIns" BOOLEAN NOT NULL DEFAULT 1;`);
  }
  if (!columns.some((column) => column.name === "notifyLowReadiness")) {
    await sqliteExec(`ALTER TABLE "User" ADD COLUMN "notifyLowReadiness" BOOLEAN NOT NULL DEFAULT 1;`);
  }
  if (!columns.some((column) => column.name === "notifySessionComplete")) {
    await sqliteExec(`ALTER TABLE "User" ADD COLUMN "notifySessionComplete" BOOLEAN NOT NULL DEFAULT 1;`);
  }
  if (!columns.some((column) => column.name === "notifyWeeklyEmail")) {
    await sqliteExec(`ALTER TABLE "User" ADD COLUMN "notifyWeeklyEmail" BOOLEAN NOT NULL DEFAULT 0;`);
  }
}

async function ensureTeamWorkspaceColumns() {
  const tables = await db.$queryRawUnsafe<{ name: string }[]>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'Team' LIMIT 1`
  );
  if (tables.length === 0) return;

  const teamColumns = await db.$queryRawUnsafe<{ name: string }[]>(`PRAGMA table_info("Team");`);
  for (const [name, type] of [
    ["dailyReminderEnabled", "BOOLEAN NOT NULL DEFAULT 1"],
    ["readinessThreshold", "INTEGER NOT NULL DEFAULT 40"],
    ["sleepThresholdHours", "REAL NOT NULL DEFAULT 6"],
    ["programVisibility", "TEXT NOT NULL DEFAULT 'ACTIVE_ONLY'"],
    ["assistantActivityVisible", "BOOLEAN NOT NULL DEFAULT 1"],
    ["rosterCapacity", "INTEGER NOT NULL DEFAULT 40"],
  ] as const) {
    if (!teamColumns.some((column) => column.name === name)) {
      await sqliteExec(`ALTER TABLE "Team" ADD COLUMN "${name}" ${type};`);
    }
  }
}

async function ensureAssessmentScoreIsReal() {
  const tables = await db.$queryRawUnsafe<{ name: string }[]>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'Assessment' LIMIT 1`
  );
  if (tables.length === 0) return;

  const columns = await db.$queryRawUnsafe<{ name: string; type: string }[]>(`PRAGMA table_info("Assessment");`);
  const score = columns.find((column) => column.name === "score");
  if (!score || /^real$/i.test(score.type)) return;

  await db.$queryRawUnsafe(`PRAGMA foreign_keys = OFF`);
  try {
    await sqliteExec(`
      CREATE TABLE "Assessment_new" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "coachId" TEXT NOT NULL,
        "playerId" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "date" TEXT NOT NULL,
        "score" REAL NOT NULL,
        "notes" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Assessment_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "Assessment_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    await sqliteExec(
      `INSERT INTO "Assessment_new" ("id","coachId","playerId","type","date","score","notes","createdAt","updatedAt") SELECT "id","coachId","playerId","type","date","score","notes","createdAt","updatedAt" FROM "Assessment";`
    );
    await sqliteExec(`DROP TABLE "Assessment";`);
    await sqliteExec(`ALTER TABLE "Assessment_new" RENAME TO "Assessment";`);
    await sqliteExec(`CREATE INDEX IF NOT EXISTS "Assessment_coachId_playerId_type_date_createdAt_idx" ON "Assessment"("coachId", "playerId", "type", "date", "createdAt");`);
    await sqliteExec(`CREATE INDEX IF NOT EXISTS "Assessment_coachId_date_idx" ON "Assessment"("coachId", "date");`);
    await sqliteExec(`CREATE INDEX IF NOT EXISTS "Assessment_playerId_idx" ON "Assessment"("playerId");`);
  } finally {
    await db.$queryRawUnsafe(`PRAGMA foreign_keys = ON`);
  }
}

async function ensureSqliteSchema() {
  // SQLite PRAGMA statements return a row — Prisma $executeRawUnsafe rejects that.
  await db.$queryRawUnsafe(`PRAGMA busy_timeout = 5000`);
  try {
    await db.$queryRawUnsafe(`PRAGMA journal_mode = WAL`);
  } catch {
    // Some hosts reject WAL; continue with the default journal.
  }

  await sqliteExec(`
    CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "email" TEXT,
      "phone" TEXT,
      "passwordHash" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'PLAYER',
      "locale" TEXT NOT NULL DEFAULT 'en',
      "timeZone" TEXT,
      "onboardingCompletedAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "coachId" TEXT,
      CONSTRAINT "User_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    );
  `);
  let userColumns = await db.$queryRawUnsafe<{ name: string; notnull: number }[]>(`PRAGMA table_info("User");`);
  // Do not rebuild/drop User on a live database — that takes the app down.
  // Phone-only accounts work once the optional column exists.
  if (!userColumns.some((c) => c.name === "phone")) {
    await sqliteExec(`ALTER TABLE "User" ADD COLUMN "phone" TEXT;`);
    userColumns = await db.$queryRawUnsafe<{ name: string; notnull: number }[]>(`PRAGMA table_info("User");`);
  }
  await sqliteExec(`CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");`);
  await sqliteExec(`CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");`);

  await sqliteExec(`
    CREATE TABLE IF NOT EXISTS "DailyLog" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "date" TEXT NOT NULL,
      "playerId" TEXT NOT NULL,
      "score" INTEGER NOT NULL DEFAULT 0,
      "sleepHours" REAL,
      "waterLiters" REAL,
      "energy" INTEGER,
      "fatigue" INTEGER,
      "soreness" INTEGER,
      "mood" INTEGER,
      "stress" INTEGER,
      "sleepQuality" INTEGER,
      "bodyWeight" REAL,
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "DailyLog_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);
  await sqliteExec(`CREATE UNIQUE INDEX IF NOT EXISTS "DailyLog_playerId_date_key" ON "DailyLog"("playerId", "date");`);
  const dailyLogColumns = await db.$queryRawUnsafe<{ name: string }[]>(`PRAGMA table_info("DailyLog");`);
  if (!dailyLogColumns.some((c) => c.name === "bodyWeight")) {
    await sqliteExec(`ALTER TABLE "DailyLog" ADD COLUMN "bodyWeight" REAL;`);
  }
  if (!dailyLogColumns.some((c) => c.name === "notes")) {
    await sqliteExec(`ALTER TABLE "DailyLog" ADD COLUMN "notes" TEXT;`);
  }

  await sqliteExec(`
    CREATE TABLE IF NOT EXISTS "Notification" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "actionHref" TEXT,
      "type" TEXT NOT NULL,
      "relatedId" TEXT,
      "dedupeKey" TEXT,
      "readAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);
  await sqliteExec(`CREATE UNIQUE INDEX IF NOT EXISTS "Notification_dedupeKey_key" ON "Notification"("dedupeKey");`);
  await sqliteExec(`CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");`);

  await sqliteExec(`
    CREATE TABLE IF NOT EXISTS "MessageConversation" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "coachId" TEXT NOT NULL,
      "playerId" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "MessageConversation_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "MessageConversation_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);
  await sqliteExec(`CREATE UNIQUE INDEX IF NOT EXISTS "MessageConversation_coachId_playerId_key" ON "MessageConversation"("coachId", "playerId");`);
  await sqliteExec(`CREATE INDEX IF NOT EXISTS "MessageConversation_coachId_idx" ON "MessageConversation"("coachId");`);
  await sqliteExec(`CREATE INDEX IF NOT EXISTS "MessageConversation_playerId_idx" ON "MessageConversation"("playerId");`);
  await sqliteExec(`CREATE INDEX IF NOT EXISTS "MessageConversation_updatedAt_idx" ON "MessageConversation"("updatedAt");`);

  await sqliteExec(`
    CREATE TABLE IF NOT EXISTS "Message" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "conversationId" TEXT NOT NULL,
      "senderId" TEXT NOT NULL,
      "body" TEXT NOT NULL,
      "contextType" TEXT,
      "contextLabel" TEXT,
      "contextHref" TEXT,
      "readAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "MessageConversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);
  await sqliteExec(`CREATE INDEX IF NOT EXISTS "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");`);
  await sqliteExec(`CREATE INDEX IF NOT EXISTS "Message_senderId_idx" ON "Message"("senderId");`);

  await sqliteExec(`
    CREATE TABLE IF NOT EXISTS "Task" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "dailyLogId" TEXT NOT NULL,
      "label" TEXT NOT NULL,
      "done" BOOLEAN NOT NULL DEFAULT false,
      "order" INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT "Task_dailyLogId_fkey" FOREIGN KEY ("dailyLogId") REFERENCES "DailyLog" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);

  await sqliteExec(`
    CREATE TABLE IF NOT EXISTS "CoachNote" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "playerId" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "date" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CoachNote_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);
  await sqliteExec(`CREATE UNIQUE INDEX IF NOT EXISTS "CoachNote_playerId_date_key" ON "CoachNote"("playerId", "date");`);

  await sqliteExec(`
    CREATE TABLE IF NOT EXISTS "PlanItem" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "playerId" TEXT NOT NULL,
      "date" TEXT NOT NULL,
      "label" TEXT NOT NULL,
      "category" TEXT NOT NULL DEFAULT 'Training',
      "done" BOOLEAN NOT NULL DEFAULT false,
      "order" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PlanItem_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);

  await sqliteExec(`
    CREATE TABLE IF NOT EXISTS "Habit" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "playerId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "icon" TEXT NOT NULL DEFAULT 'drop',
      "color" TEXT NOT NULL DEFAULT '#4CAF50',
      "targetDays" INTEGER NOT NULL DEFAULT 7,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Habit_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);

  await sqliteExec(`
    CREATE TABLE IF NOT EXISTS "HabitLog" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "habitId" TEXT NOT NULL,
      "date" TEXT NOT NULL,
      CONSTRAINT "HabitLog_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);
  await sqliteExec(`CREATE UNIQUE INDEX IF NOT EXISTS "HabitLog_habitId_date_key" ON "HabitLog"("habitId", "date");`);

  await sqliteExec(`
    CREATE TABLE IF NOT EXISTS "Goal" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "playerId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "category" TEXT NOT NULL DEFAULT 'Performance',
      "targetDate" TEXT,
      "progress" INTEGER NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Goal_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);

  await sqliteExec(`
    CREATE TABLE IF NOT EXISTS "Invite" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "token" TEXT NOT NULL,
      "coachId" TEXT NOT NULL,
      "teamId" TEXT,
      "role" TEXT NOT NULL DEFAULT 'PLAYER',
      "email" TEXT,
      "phone" TEXT,
      "usedAt" DATETIME,
      "maxUses" INTEGER NOT NULL DEFAULT 1,
      "useCount" INTEGER NOT NULL DEFAULT 0,
      "revoked" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "expiresAt" DATETIME NOT NULL,
      CONSTRAINT "Invite_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);
  await sqliteExec(`CREATE UNIQUE INDEX IF NOT EXISTS "Invite_token_key" ON "Invite"("token");`);
  const inviteColumns = await db.$queryRawUnsafe<{ name: string }[]>(`PRAGMA table_info("Invite");`);
  if (!inviteColumns.some((c) => c.name === "revoked")) {
    await sqliteExec(`ALTER TABLE "Invite" ADD COLUMN "revoked" BOOLEAN NOT NULL DEFAULT false;`);
  }
  if (!inviteColumns.some((c) => c.name === "acceptedUserId")) {
    await sqliteExec(`ALTER TABLE "Invite" ADD COLUMN "acceptedUserId" TEXT;`);
  }
  if (!inviteColumns.some((c) => c.name === "teamId")) {
    await sqliteExec(`ALTER TABLE "Invite" ADD COLUMN "teamId" TEXT;`);
  }
  if (!inviteColumns.some((c) => c.name === "email")) {
    await sqliteExec(`ALTER TABLE "Invite" ADD COLUMN "email" TEXT;`);
  }
  if (!inviteColumns.some((c) => c.name === "phone")) {
    await sqliteExec(`ALTER TABLE "Invite" ADD COLUMN "phone" TEXT;`);
  }
  if (!inviteColumns.some((c) => c.name === "maxUses")) {
    await sqliteExec(`ALTER TABLE "Invite" ADD COLUMN "maxUses" INTEGER NOT NULL DEFAULT 1;`);
  }
  if (!inviteColumns.some((c) => c.name === "useCount")) {
    await sqliteExec(`ALTER TABLE "Invite" ADD COLUMN "useCount" INTEGER NOT NULL DEFAULT 0;`);
  }
  await sqliteExec(`CREATE INDEX IF NOT EXISTS "Invite_teamId_idx" ON "Invite"("teamId");`);

  await sqliteExec(`
    CREATE TABLE IF NOT EXISTS "Program" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "coachId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "goal" TEXT,
      "durationWeeks" INTEGER NOT NULL DEFAULT 4,
      "sessionsPerWeek" INTEGER NOT NULL DEFAULT 3,
      "startDate" TEXT,
      "endDate" TEXT,
      "status" TEXT NOT NULL DEFAULT 'DRAFT',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Program_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);

  await sqliteExec(`
    CREATE TABLE IF NOT EXISTS "ProgramSession" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "programId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "day" TEXT NOT NULL DEFAULT 'Monday',
      "durationMinutes" INTEGER,
      "intensity" TEXT NOT NULL DEFAULT 'MEDIUM',
      "notes" TEXT,
      "order" INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT "ProgramSession_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await sqliteExec(`
    CREATE TABLE IF NOT EXISTS "ProgramSessionProgress" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "playerId" TEXT NOT NULL,
      "programSessionId" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
      "completedAt" DATETIME,
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ProgramSessionProgress_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "ProgramSessionProgress_programSessionId_fkey" FOREIGN KEY ("programSessionId") REFERENCES "ProgramSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);
  await sqliteExec(`CREATE UNIQUE INDEX IF NOT EXISTS "ProgramSessionProgress_playerId_programSessionId_key" ON "ProgramSessionProgress"("playerId", "programSessionId");`);

  await sqliteExec(`
    CREATE TABLE IF NOT EXISTS "ProgramAssignment" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "programId" TEXT NOT NULL,
      "playerId" TEXT NOT NULL,
      "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ProgramAssignment_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "ProgramAssignment_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
  await sqliteExec(`CREATE UNIQUE INDEX IF NOT EXISTS "ProgramAssignment_programId_playerId_key" ON "ProgramAssignment"("programId", "playerId");`);

  await sqliteExec(`
    CREATE TABLE IF NOT EXISTS "Assessment" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "coachId" TEXT NOT NULL,
      "playerId" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "date" TEXT NOT NULL,
      "score" REAL NOT NULL,
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Assessment_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "Assessment_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
  await sqliteExec(`CREATE INDEX IF NOT EXISTS "Assessment_coachId_playerId_type_date_createdAt_idx" ON "Assessment"("coachId", "playerId", "type", "date", "createdAt");`);
  await sqliteExec(`CREATE INDEX IF NOT EXISTS "Assessment_coachId_date_idx" ON "Assessment"("coachId", "date");`);
  await sqliteExec(`CREATE INDEX IF NOT EXISTS "Assessment_playerId_idx" ON "Assessment"("playerId");`);

  await sqliteExec(`
    CREATE TABLE IF NOT EXISTS "Team" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "sport" TEXT,
      "ageGroup" TEXT,
      "season" TEXT,
      "country" TEXT,
      "timeZone" TEXT,
      "logo" TEXT,
      "units" TEXT,
      "defaultLanguage" TEXT,
      "coachId" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Team_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);
  const teamColumns = await db.$queryRawUnsafe<{ name: string }[]>(`PRAGMA table_info("Team");`);
  for (const [name, type] of [
    ["ageGroup", "TEXT"],
    ["season", "TEXT"],
    ["country", "TEXT"],
    ["timeZone", "TEXT"],
    ["logo", "TEXT"],
    ["units", "TEXT"],
    ["defaultLanguage", "TEXT"],
    ["dailyReminderEnabled", "BOOLEAN NOT NULL DEFAULT 1"],
    ["readinessThreshold", "INTEGER NOT NULL DEFAULT 40"],
    ["sleepThresholdHours", "REAL NOT NULL DEFAULT 6"],
    ["programVisibility", "TEXT NOT NULL DEFAULT 'ACTIVE_ONLY'"],
    ["assistantActivityVisible", "BOOLEAN NOT NULL DEFAULT 1"],
    ["rosterCapacity", "INTEGER NOT NULL DEFAULT 40"],
  ] as const) {
    if (!teamColumns.some((column) => column.name === name)) {
      await sqliteExec(`ALTER TABLE "Team" ADD COLUMN "${name}" ${type};`);
    }
  }
  if (!teamColumns.some((column) => column.name === "updatedAt")) {
    await sqliteExec(`ALTER TABLE "Team" ADD COLUMN "updatedAt" DATETIME;`);
    await sqliteExec(`UPDATE "Team" SET "updatedAt" = COALESCE("updatedAt", CURRENT_TIMESTAMP);`);
  }
  await sqliteExec(`DROP INDEX IF EXISTS "Team_coachId_key";`);
  await sqliteExec(`CREATE INDEX IF NOT EXISTS "Team_coachId_idx" ON "Team"("coachId");`);

  await sqliteExec(`
    CREATE TABLE IF NOT EXISTS "TeamMember" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "teamId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "role" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
  await sqliteExec(`CREATE UNIQUE INDEX IF NOT EXISTS "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");`);
  await sqliteExec(`CREATE INDEX IF NOT EXISTS "TeamMember_userId_idx" ON "TeamMember"("userId");`);
  await sqliteExec(`CREATE INDEX IF NOT EXISTS "TeamMember_teamId_idx" ON "TeamMember"("teamId");`);
}
