import { PrismaClient } from "@prisma/client";

// Prevent hot-reload from spawning a new PrismaClient on every save in dev.
const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof buildClient> };

function buildClient() {
  const client = new PrismaClient();

  // Every model query (db.user.findMany, db.team.create, etc.) waits for
  // ensureDatabase() first. This is what actually creates the SQLite tables —
  // without this, a route/page that never explicitly calls ensureDatabase()
  // (easy to forget, and the cause of a real "Team table doesn't exist yet"
  // crash) would hit a fresh process with missing tables and 500 out.
  // Raw calls ($executeRawUnsafe, used below to create tables) aren't
  // affected by this hook, so there's no recursion.
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          await ensureDatabase();
          return query(args);
        },
      },
    },
  });
}

export const db = globalForPrisma.prisma ?? buildClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

let sqliteReady: Promise<void> | null = null;

export function ensureDatabase() {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (!databaseUrl.startsWith("file:")) return Promise.resolve();

  sqliteReady ??= ensureSqliteSchema();
  return sqliteReady;
}

async function ensureSqliteSchema() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "email" TEXT,
      "phone" TEXT,
      "passwordHash" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'PLAYER',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "coachId" TEXT,
      CONSTRAINT "User_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    );
  `);
  let userColumns = await db.$queryRawUnsafe<{ name: string; notnull: number }[]>(`PRAGMA table_info("User");`);
  // Early SQLite databases required email. Rebuild this small root table once so
  // accounts may use a phone number without inventing a fake email address.
  if (userColumns.find((c) => c.name === "email")?.notnull === 1) {
    await db.$executeRawUnsafe(`PRAGMA foreign_keys = OFF;`);
    await db.$executeRawUnsafe(`
      CREATE TABLE "User_contact_migration" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "email" TEXT,
        "phone" TEXT,
        "passwordHash" TEXT NOT NULL,
        "role" TEXT NOT NULL DEFAULT 'PLAYER',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "coachId" TEXT,
        CONSTRAINT "User_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User_contact_migration" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);
    await db.$executeRawUnsafe(`
      INSERT INTO "User_contact_migration" ("id", "name", "email", "passwordHash", "role", "createdAt", "coachId")
      SELECT "id", "name", "email", "passwordHash", "role", "createdAt", "coachId" FROM "User";
    `);
    await db.$executeRawUnsafe(`DROP TABLE "User";`);
    await db.$executeRawUnsafe(`ALTER TABLE "User_contact_migration" RENAME TO "User";`);
    await db.$executeRawUnsafe(`PRAGMA foreign_keys = ON;`);
    userColumns = await db.$queryRawUnsafe<{ name: string; notnull: number }[]>(`PRAGMA table_info("User");`);
  }
  if (!userColumns.some((c) => c.name === "phone")) {
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "phone" TEXT;`);
  }
  await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");`);
  await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");`);

  await db.$executeRawUnsafe(`
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
  await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "DailyLog_playerId_date_key" ON "DailyLog"("playerId", "date");`);
  const dailyLogColumns = await db.$queryRawUnsafe<{ name: string }[]>(`PRAGMA table_info("DailyLog");`);
  if (!dailyLogColumns.some((c) => c.name === "bodyWeight")) {
    await db.$executeRawUnsafe(`ALTER TABLE "DailyLog" ADD COLUMN "bodyWeight" REAL;`);
  }
  if (!dailyLogColumns.some((c) => c.name === "notes")) {
    await db.$executeRawUnsafe(`ALTER TABLE "DailyLog" ADD COLUMN "notes" TEXT;`);
  }

  await db.$executeRawUnsafe(`
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
  await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Notification_dedupeKey_key" ON "Notification"("dedupeKey");`);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");`);

  await db.$executeRawUnsafe(`
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
  await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "MessageConversation_coachId_playerId_key" ON "MessageConversation"("coachId", "playerId");`);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MessageConversation_coachId_idx" ON "MessageConversation"("coachId");`);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MessageConversation_playerId_idx" ON "MessageConversation"("playerId");`);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MessageConversation_updatedAt_idx" ON "MessageConversation"("updatedAt");`);

  await db.$executeRawUnsafe(`
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
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");`);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Message_senderId_idx" ON "Message"("senderId");`);

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Task" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "dailyLogId" TEXT NOT NULL,
      "label" TEXT NOT NULL,
      "done" BOOLEAN NOT NULL DEFAULT false,
      "order" INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT "Task_dailyLogId_fkey" FOREIGN KEY ("dailyLogId") REFERENCES "DailyLog" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CoachNote" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "playerId" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "date" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CoachNote_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);
  await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "CoachNote_playerId_date_key" ON "CoachNote"("playerId", "date");`);

  await db.$executeRawUnsafe(`
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

  await db.$executeRawUnsafe(`
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

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "HabitLog" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "habitId" TEXT NOT NULL,
      "date" TEXT NOT NULL,
      CONSTRAINT "HabitLog_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);
  await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "HabitLog_habitId_date_key" ON "HabitLog"("habitId", "date");`);

  await db.$executeRawUnsafe(`
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

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Invite" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "token" TEXT NOT NULL,
      "coachId" TEXT NOT NULL,
      "teamId" TEXT,
      "role" TEXT NOT NULL DEFAULT 'PLAYER',
      "email" TEXT,
      "phone" TEXT,
      "usedAt" DATETIME,
      "revoked" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "expiresAt" DATETIME NOT NULL,
      CONSTRAINT "Invite_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);
  await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Invite_token_key" ON "Invite"("token");`);
  // Older SQLite files created before "revoked" existed won't have the column —
  // add it if missing. SQLite has no "ADD COLUMN IF NOT EXISTS", so we probe
  // pragma table_info instead of relying on a throwaway try/catch.
  const inviteColumns = await db.$queryRawUnsafe<{ name: string }[]>(`PRAGMA table_info("Invite");`);
  if (!inviteColumns.some((c) => c.name === "revoked")) {
    await db.$executeRawUnsafe(`ALTER TABLE "Invite" ADD COLUMN "revoked" BOOLEAN NOT NULL DEFAULT false;`);
  }
  if (!inviteColumns.some((c) => c.name === "acceptedUserId")) {
    await db.$executeRawUnsafe(`ALTER TABLE "Invite" ADD COLUMN "acceptedUserId" TEXT;`);
  }
  if (!inviteColumns.some((c) => c.name === "teamId")) {
    await db.$executeRawUnsafe(`ALTER TABLE "Invite" ADD COLUMN "teamId" TEXT;`);
  }
  if (!inviteColumns.some((c) => c.name === "email")) {
    await db.$executeRawUnsafe(`ALTER TABLE "Invite" ADD COLUMN "email" TEXT;`);
  }
  if (!inviteColumns.some((c) => c.name === "phone")) {
    await db.$executeRawUnsafe(`ALTER TABLE "Invite" ADD COLUMN "phone" TEXT;`);
  }
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Invite_teamId_idx" ON "Invite"("teamId");`);

  await db.$executeRawUnsafe(`
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

  await db.$executeRawUnsafe(`
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

  await db.$executeRawUnsafe(`
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
  await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "ProgramSessionProgress_playerId_programSessionId_key" ON "ProgramSessionProgress"("playerId", "programSessionId");`);

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ProgramAssignment" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "programId" TEXT NOT NULL,
      "playerId" TEXT NOT NULL,
      "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ProgramAssignment_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "ProgramAssignment_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
  await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "ProgramAssignment_programId_playerId_key" ON "ProgramAssignment"("programId", "playerId");`);

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Assessment" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "coachId" TEXT NOT NULL,
      "playerId" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "date" TEXT NOT NULL,
      "score" INTEGER NOT NULL,
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Assessment_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "Assessment_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await db.$executeRawUnsafe(`
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
  ] as const) {
    if (!teamColumns.some((column) => column.name === name)) {
      await db.$executeRawUnsafe(`ALTER TABLE "Team" ADD COLUMN "${name}" ${type};`);
    }
  }
  if (!teamColumns.some((column) => column.name === "updatedAt")) {
    await db.$executeRawUnsafe(`ALTER TABLE "Team" ADD COLUMN "updatedAt" DATETIME;`);
    await db.$executeRawUnsafe(`UPDATE "Team" SET "updatedAt" = COALESCE("updatedAt", CURRENT_TIMESTAMP);`);
  }
  await db.$executeRawUnsafe(`DROP INDEX IF EXISTS "Team_coachId_key";`);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Team_coachId_idx" ON "Team"("coachId");`);

  await db.$executeRawUnsafe(`
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
  await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");`);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TeamMember_userId_idx" ON "TeamMember"("userId");`);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TeamMember_teamId_idx" ON "TeamMember"("teamId");`);
}
