/**
 * Load-test roster: a dedicated coach + 100 tagged players.
 *
 *   npx tsx scripts/load-test-data.ts seed
 *   npx tsx scripts/load-test-data.ts unseed
 *
 * Everything is tagged with the @loadtest.athvexa.local email domain or
 * +98990001xxxx phones so unseed can remove it without touching real data.
 */
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const EMAIL_DOMAIN = "loadtest.athvexa.local";
const PHONE_PREFIX = "+98990001";
const COACH_EMAIL = `coach@${EMAIL_DOMAIN}`;
const ASSISTANT_EMAIL = `assistant@${EMAIL_DOMAIN}`;
const PLAYER_PASSWORD = "LoadTest123!";
const TEAM_NAME = "Load Test United";

const FIRST_NAMES = [
  "Reza", "Ali", "Sara", "Nima", "Leila", "Omar", "Yusuf", "Fatima", "Hassan", "Maryam",
  "Karim", "Zahra", "Tariq", "Noor", "Amir", "Hana", "Sami", "Dina", "Ibrahim", "Layla",
  "Farid", "Amina", "Kian", "Neda", "Pouya", "Shirin", "Arman", "Golnaz", "Mehdi", "Parisa",
  "Soroush", "Elham", "Behnam", "Nasim", "Omid", "Roya", "Pedram", "Azadeh", "Kamran", "Yasmin",
  "Dariush", "Setareh", "Hooman", "Mitra", "Ramin", "Arezoo", "Siavash", "Katayoun", "Navid", "Simin",
  "Arash", "Nahid", "Babak", "Forough", "Javad", "Ghazal", "Kaveh", "Ladan", "Masoud", "Mozhgan",
  "Nasser", "Pegah", "Qasem", "Rana", "Saeed", "Tara", "Vahid", "Yasaman", "Zia", "Afsaneh",
  "Bijan", "Cyrus", "Delara", "Ehsan", "Fereshteh", "Giv", "Homa", "Iman", "Jaleh", "Khosrow",
  "Laleh", "Mani", "Niloofar", "Omidreza", "Parham", "Qamar", "Rostam", "Sahar", "Tannaz", "Una",
  "Vida", "Wafa", "Xerxes", "Yara", "Zari", "Aria", "Baran", "Caspian", "Darya", "Evin",
];

const LAST_NAMES = [
  "Hassani", "Karimi", "Ahmadi", "Mohammadi", "Nazari", "Rahimi", "Salehi", "Jafari", "Moradi", "Hosseini",
];

function dbUrl() {
  const fileName = process.env.LOADTEST_DB === "1" ? "loadtest.db" : "dev.db";
  const file = path.resolve(process.cwd(), "prisma", fileName).replace(/\\/g, "/");
  return `file:${file}`;
}

const db = new PrismaClient({ datasources: { db: { url: dbUrl() } } });

async function columnNames(table: string) {
  return (await db.$queryRawUnsafe<{ name: string }[]>(`PRAGMA table_info("${table}")`)).map((c) => c.name);
}

async function tableExists(table: string) {
  const rows = await db.$queryRawUnsafe<{ name: string }[]>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}' LIMIT 1`
  );
  return rows.length > 0;
}

async function exec(sql: string) {
  try {
    await db.$executeRawUnsafe(sql);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/already exists|duplicate column|returned results/i.test(message)) return;
    throw error;
  }
}

/** Local SQLite is often behind Prisma because ensureDatabase() skips upgrades when User exists. */
async function ensureLoadTestSchema() {
  const userCols = await columnNames("User");
  if (!userCols.includes("phone")) await exec(`ALTER TABLE "User" ADD COLUMN "phone" TEXT;`);
  await exec(`CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");`);

  const teamCols = await columnNames("Team");
  for (const [name, type] of [
    ["ageGroup", "TEXT"],
    ["season", "TEXT"],
    ["country", "TEXT"],
    ["timeZone", "TEXT"],
    ["logo", "TEXT"],
    ["units", "TEXT"],
    ["defaultLanguage", "TEXT"],
    ["updatedAt", "DATETIME"],
  ] as const) {
    if (!teamCols.includes(name)) await exec(`ALTER TABLE "Team" ADD COLUMN "${name}" ${type};`);
  }
  await exec(`UPDATE "Team" SET "updatedAt" = COALESCE("updatedAt", CURRENT_TIMESTAMP);`);

  if (!(await tableExists("TeamMember"))) {
    await exec(`
      CREATE TABLE "TeamMember" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "teamId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "role" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE,
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
      );
    `);
  }
  await exec(`CREATE UNIQUE INDEX IF NOT EXISTS "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");`);

  if (!(await tableExists("MessageConversation"))) {
    await exec(`
      CREATE TABLE "MessageConversation" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "coachId" TEXT NOT NULL,
        "playerId" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }
  await exec(`CREATE UNIQUE INDEX IF NOT EXISTS "MessageConversation_coachId_playerId_key" ON "MessageConversation"("coachId", "playerId");`);

  if (!(await tableExists("Message"))) {
    await exec(`
      CREATE TABLE "Message" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "conversationId" TEXT NOT NULL,
        "senderId" TEXT NOT NULL,
        "body" TEXT NOT NULL,
        "contextType" TEXT,
        "contextLabel" TEXT,
        "contextHref" TEXT,
        "readAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  const inviteCols = await columnNames("Invite");
  for (const [name, type] of [
    ["teamId", "TEXT"],
    ["email", "TEXT"],
    ["phone", "TEXT"],
    ["maxUses", "INTEGER NOT NULL DEFAULT 1"],
    ["useCount", "INTEGER NOT NULL DEFAULT 0"],
  ] as const) {
    if (!inviteCols.includes(name)) await exec(`ALTER TABLE "Invite" ADD COLUMN "${name}" ${type};`);
  }
}

function pad(n: number) {
  return String(n).padStart(3, "0");
}

function dateOffset(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function isLoadTestUser(user: { email: string | null; phone: string | null }) {
  return Boolean(
    (user.email && user.email.endsWith(`@${EMAIL_DOMAIN}`)) ||
      (user.phone && user.phone.startsWith(PHONE_PREFIX))
  );
}

async function unseed() {
  const users = await db.user.findMany({
    select: { id: true, email: true, phone: true, role: true },
  });
  const marked = users.filter(isLoadTestUser);
  const ids = marked.map((u) => u.id);
  if (ids.length === 0) {
    console.log("No load-test users found. Nothing to delete.");
    return;
  }

  console.log(`Removing ${ids.length} load-test users and related rows…`);

  await db.$executeRawUnsafe("PRAGMA foreign_keys = OFF");
  try {
    const inList = ids.map((id) => `'${id.replace(/'/g, "''")}'`).join(",");

    await db.$executeRawUnsafe(`DELETE FROM "HabitLog" WHERE "habitId" IN (SELECT "id" FROM "Habit" WHERE "playerId" IN (${inList}))`);
    await db.$executeRawUnsafe(`DELETE FROM "Habit" WHERE "playerId" IN (${inList})`);
    await db.$executeRawUnsafe(`DELETE FROM "Task" WHERE "dailyLogId" IN (SELECT "id" FROM "DailyLog" WHERE "playerId" IN (${inList}))`);
    await db.$executeRawUnsafe(`DELETE FROM "DailyLog" WHERE "playerId" IN (${inList})`);
    await db.$executeRawUnsafe(`DELETE FROM "CoachNote" WHERE "playerId" IN (${inList})`);
    await db.$executeRawUnsafe(`DELETE FROM "PlanItem" WHERE "playerId" IN (${inList})`);
    await db.$executeRawUnsafe(`DELETE FROM "Goal" WHERE "playerId" IN (${inList})`);
    await db.$executeRawUnsafe(`DELETE FROM "Message" WHERE "senderId" IN (${inList}) OR "conversationId" IN (SELECT "id" FROM "MessageConversation" WHERE "coachId" IN (${inList}) OR "playerId" IN (${inList}))`);
    await db.$executeRawUnsafe(`DELETE FROM "MessageConversation" WHERE "coachId" IN (${inList}) OR "playerId" IN (${inList})`);
    await db.$executeRawUnsafe(`DELETE FROM "Notification" WHERE "userId" IN (${inList})`);
    await db.$executeRawUnsafe(`DELETE FROM "ProgramSessionProgress" WHERE "playerId" IN (${inList})`);
    await db.$executeRawUnsafe(`DELETE FROM "ProgramAssignment" WHERE "playerId" IN (${inList}) OR "programId" IN (SELECT "id" FROM "Program" WHERE "coachId" IN (${inList}))`);
    await db.$executeRawUnsafe(`DELETE FROM "ProgramSession" WHERE "programId" IN (SELECT "id" FROM "Program" WHERE "coachId" IN (${inList}))`);
    await db.$executeRawUnsafe(`DELETE FROM "Program" WHERE "coachId" IN (${inList})`);
    await db.$executeRawUnsafe(`DELETE FROM "Assessment" WHERE "coachId" IN (${inList}) OR "playerId" IN (${inList})`);
    await db.$executeRawUnsafe(`DELETE FROM "Invite" WHERE "coachId" IN (${inList}) OR "acceptedUserId" IN (${inList})`);
    await db.$executeRawUnsafe(`DELETE FROM "TeamMember" WHERE "userId" IN (${inList})`);
    await db.$executeRawUnsafe(`DELETE FROM "Team" WHERE "coachId" IN (${inList})`);
    await db.$executeRawUnsafe(`DELETE FROM "User" WHERE "id" IN (${inList})`);
  } finally {
    await db.$executeRawUnsafe("PRAGMA foreign_keys = ON");
  }

  console.log("Load-test data removed.");
}

async function seed() {
  await unseed();

  const passwordHash = await bcrypt.hash(PLAYER_PASSWORD, 10);
  const today = dateOffset(0);

  const coach = await db.user.create({
    data: {
      name: "Load Test Coach",
      email: COACH_EMAIL,
      passwordHash,
      role: "COACH",
    },
  });

  const team = await db.team.create({
    data: {
      name: TEAM_NAME,
      sport: "Football",
      ageGroup: "U23",
      season: "2026",
      country: "Iran",
      timeZone: "Asia/Tehran",
      units: "metric",
      defaultLanguage: "en",
      coachId: coach.id,
    },
  });

  await db.teamMember.create({
    data: { teamId: team.id, userId: coach.id, role: "OWNER" },
  });

  const assistant = await db.user.create({
    data: {
      name: "Load Test Assistant",
      email: ASSISTANT_EMAIL,
      passwordHash,
      role: "ASSISTANT",
      coachId: coach.id,
    },
  });
  await db.teamMember.create({
    data: { teamId: team.id, userId: assistant.id, role: "ASSISTANT_COACH" },
  });

  const program = await db.program.create({
    data: {
      coachId: coach.id,
      name: "LT Pre-season Block",
      description: "Load-test active program assigned to a large roster.",
      goal: "Match fitness",
      durationWeeks: 6,
      sessionsPerWeek: 4,
      startDate: dateOffset(10),
      endDate: dateOffset(-32),
      status: "ACTIVE",
      sessions: {
        create: [
          { title: "Speed + SAQ", day: "Monday", durationMinutes: 75, intensity: "HIGH", order: 0 },
          { title: "Strength", day: "Tuesday", durationMinutes: 60, intensity: "MEDIUM", order: 1 },
          { title: "Tactical", day: "Thursday", durationMinutes: 90, intensity: "MEDIUM", order: 2 },
          { title: "Recovery", day: "Saturday", durationMinutes: 40, intensity: "LOW", order: 3 },
        ],
      },
    },
    include: { sessions: true },
  });

  const playerIds: string[] = [];

  for (let i = 1; i <= 100; i++) {
    const first = FIRST_NAMES[(i - 1) % FIRST_NAMES.length];
    const last = LAST_NAMES[(i - 1) % LAST_NAMES.length];
    const name = i === 100 ? `LT ${first} ${last} With A Very Long Display Name For Truncation` : `LT ${first} ${last} ${pad(i)}`;
    const phoneOnly = i > 95;
    const player = await db.user.create({
      data: {
        name,
        email: `player.${pad(i)}@${EMAIL_DOMAIN}`,
        phone: phoneOnly || i % 11 === 0 ? `${PHONE_PREFIX}${String(i).padStart(4, "0")}` : null,
        passwordHash,
        role: "PLAYER",
        coachId: coach.id,
      },
    });
    playerIds.push(player.id);

    await db.teamMember.create({
      data: { teamId: team.id, userId: player.id, role: "PLAYER" },
    });

    const bucket = i % 10;
    if (bucket !== 0) {
      const days = bucket === 1 ? [0] : bucket <= 4 ? [0, 1, 2] : [0, 1, 2, 3, 4, 5, 6];
      for (const ago of days) {
        const score =
          bucket === 2 ? 28 + (i % 8) : bucket === 3 ? 48 + (i % 10) : bucket === 9 ? 88 + (i % 10) : 62 + (i % 20);
        await db.dailyLog.create({
          data: {
            playerId: player.id,
            date: dateOffset(ago),
            score: Math.min(score - ago, 99),
            sleepHours: bucket === 2 ? 4.5 : 6.5 + (i % 3) * 0.5,
            waterLiters: 1.2 + (i % 5) * 0.2,
            energy: 2 + (i % 4),
            fatigue: bucket === 2 || bucket === 3 ? 4 : 2,
            soreness: bucket === 2 ? 5 : 2,
            mood: 3 + (i % 3),
            stress: bucket === 3 ? 4 : 2,
            sleepQuality: bucket === 2 ? 2 : 4,
            bodyWeight: 70 + (i % 15),
            notes: ago === 0 && i % 17 === 0 ? "Felt heavy in the last session." : null,
          },
        });
      }
    }

    if (i <= 40) {
      await db.programAssignment.create({
        data: { programId: program.id, playerId: player.id },
      });
      if (i <= 12) {
        await db.programSessionProgress.create({
          data: {
            playerId: player.id,
            programSessionId: program.sessions[0].id,
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });
      }
    }

    if (i <= 35) {
      await db.assessment.create({
        data: {
          coachId: coach.id,
          playerId: player.id,
          type: ["Speed", "Strength", "Endurance", "Agility"][i % 4],
          date: dateOffset(i % 12),
          score: 55 + (i % 40),
          notes: i % 5 === 0 ? "Repeat next week." : null,
        },
      });
      if (i <= 18) {
        await db.assessment.create({
          data: {
            coachId: coach.id,
            playerId: player.id,
            type: ["Speed", "Strength", "Endurance", "Agility"][i % 4],
            date: dateOffset(20 + (i % 5)),
            score: 45 + (i % 30),
          },
        });
      }
    }

    if (i <= 8) {
      const conversation = await db.messageConversation.create({
        data: { coachId: coach.id, playerId: player.id },
      });
      await db.message.create({
        data: {
          conversationId: conversation.id,
          senderId: player.id,
          body: `Coach, player ${pad(i)} checking in about today's load.`,
        },
      });
      await db.message.create({
        data: {
          conversationId: conversation.id,
          senderId: coach.id,
          body: "Noted. Keep the session intensity as planned.",
          readAt: i <= 3 ? new Date() : null,
        },
      });
    }

    if (i <= 15) {
      await db.goal.create({
        data: {
          playerId: player.id,
          title: "Improve 30m sprint",
          category: "Performance",
          progress: (i * 7) % 100,
          status: "ACTIVE",
        },
      });
    }
  }

  await db.invite.create({
    data: {
      token: `lt-open-${Date.now()}`,
      coachId: coach.id,
      teamId: team.id,
      role: "PLAYER",
      maxUses: 50,
      useCount: 0,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  await db.notification.create({
    data: {
      userId: coach.id,
      title: "Load-test roster ready",
      description: "100 tagged test players are on Load Test United.",
      type: "SYSTEM",
    },
  });

  console.log("Seeded load-test data:");
  console.log(`  Coach:     ${COACH_EMAIL} / ${PLAYER_PASSWORD}`);
  console.log(`  Assistant: ${ASSISTANT_EMAIL} / ${PLAYER_PASSWORD}`);
  console.log(`  Players:   100 (player.001@${EMAIL_DOMAIN} …, password ${PLAYER_PASSWORD})`);
  console.log(`  Team:      ${TEAM_NAME}`);
  console.log(`  Today:     ${today}`);
  console.log("Remove later with: npx tsx scripts/load-test-data.ts unseed");
}

async function main() {
  await ensureLoadTestSchema();
  const action = process.argv[2] ?? "seed";
  if (action === "unseed" || action === "clean") {
    await unseed();
    return;
  }
  if (action !== "seed") {
    console.error("Usage: tsx scripts/load-test-data.ts [seed|unseed]");
    process.exit(1);
  }
  await seed();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
