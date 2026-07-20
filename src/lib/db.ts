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
      "email" TEXT NOT NULL,
      "passwordHash" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'PLAYER',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "coachId" TEXT,
      CONSTRAINT "User_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    );
  `);
  await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");`);

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
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "DailyLog_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);
  await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "DailyLog_playerId_date_key" ON "DailyLog"("playerId", "date");`);

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
      "role" TEXT NOT NULL DEFAULT 'PLAYER',
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

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Team" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "sport" TEXT,
      "coachId" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Team_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);
  await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Team_coachId_key" ON "Team"("coachId");`);
}
