/**
 * Attach two assistant coaches and two test players to rezacalm993@gmail.com.
 *
 *   npx tsx scripts/seed-reza-test-roster.ts
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const COACH_EMAIL = "rezacalm993@gmail.com";
const TEST_PASSWORD = "TestAthvexa123!";
const EMAIL_SUFFIX = "test.athvexa.local";

const ROSTER = [
  { name: "Sara Karimi", email: `sara.assistant@${EMAIL_SUFFIX}`, role: "ASSISTANT" as const, teamRole: "ASSISTANT_COACH" },
  { name: "Nima Ahmadi", email: `nima.assistant@${EMAIL_SUFFIX}`, role: "ASSISTANT" as const, teamRole: "ASSISTANT_COACH" },
  { name: "Ali Hassan", email: `ali.player@${EMAIL_SUFFIX}`, role: "PLAYER" as const, teamRole: "PLAYER" },
  { name: "Omar Khalid", email: `omar.player@${EMAIL_SUFFIX}`, role: "PLAYER" as const, teamRole: "PLAYER" },
];

function dbUrl() {
  const raw = (process.env.DATABASE_URL ?? "file:./dev.db").trim();
  if (!raw.startsWith("file:")) return raw;
  const requested = raw.slice("file:".length).replace(/^\.\//, "");
  const cwd = process.cwd();
  const candidates = [
    path.resolve(cwd, requested),
    path.resolve(cwd, "dev.db"),
    path.resolve(cwd, "prisma", "dev.db"),
    path.resolve(cwd, "prisma", requested),
  ];
  const existing = [...new Set(candidates)].filter((filePath) => {
    try {
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  });
  const chosen = (existing[0] ?? path.resolve(cwd, "prisma", "dev.db")).replace(/\\/g, "/");
  console.log(`Using database ${chosen}`);
  return `file:${chosen}`;
}

const db = new PrismaClient({ datasources: { db: { url: dbUrl() } } });

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function main() {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  let coach = await db.user.findFirst({
    where: { email: { equals: COACH_EMAIL } },
  });

  if (!coach) {
    coach = await db.user.create({
      data: {
        name: "Reza",
        email: COACH_EMAIL,
        passwordHash,
        role: "COACH",
      },
    });
    console.log(`Created coach ${COACH_EMAIL} (password ${TEST_PASSWORD})`);
  } else if (coach.role !== "COACH") {
    coach = await db.user.update({
      where: { id: coach.id },
      data: { role: "COACH" },
    });
    console.log(`Updated ${COACH_EMAIL} role to COACH`);
  } else {
    console.log(`Found existing coach ${COACH_EMAIL} (${coach.id})`);
  }

  let team = await db.team.findFirst({
    where: { coachId: coach.id },
    orderBy: { createdAt: "asc" },
  });
  if (!team) {
    team = await db.team.create({
      data: {
        name: "Athvexa Test Team",
        sport: "Football",
        ageGroup: "Senior",
        season: "2026",
        country: "Iran",
        timeZone: "Asia/Tehran",
        units: "METRIC",
        defaultLanguage: "fa",
        coachId: coach.id,
      },
    });
    console.log(`Created team ${team.name}`);
  }

  await db.teamMember.upsert({
    where: { teamId_userId: { teamId: team.id, userId: coach.id } },
    update: { role: "OWNER" },
    create: { teamId: team.id, userId: coach.id, role: "OWNER" },
  });

  const date = today();

  for (const row of ROSTER) {
    let user = await db.user.findFirst({ where: { email: row.email } });
    if (!user) {
      user = await db.user.create({
        data: {
          name: row.name,
          email: row.email,
          passwordHash,
          role: row.role,
          coachId: coach.id,
        },
      });
      console.log(`Created ${row.role} ${row.name} <${row.email}>`);
    } else {
      user = await db.user.update({
        where: { id: user.id },
        data: { name: row.name, role: row.role, coachId: coach.id },
      });
      console.log(`Updated ${row.role} ${row.name} <${row.email}>`);
    }

    await db.teamMember.upsert({
      where: { teamId_userId: { teamId: team.id, userId: user.id } },
      update: { role: row.teamRole },
      create: { teamId: team.id, userId: user.id, role: row.teamRole },
    });

    if (row.role === "PLAYER") {
      const score = row.email.startsWith("ali.") ? 84 : 46;
      await db.dailyLog.upsert({
        where: { playerId_date: { playerId: user.id, date } },
        update: { score },
        create: {
          playerId: user.id,
          date,
          score,
          sleepHours: score >= 80 ? 7.5 : 5,
          waterLiters: score >= 80 ? 2.1 : 0.9,
          energy: score >= 80 ? 4 : 2,
          fatigue: score >= 80 ? 2 : 4,
          soreness: score >= 80 ? 2 : 4,
          mood: score >= 80 ? 4 : 2,
          stress: score >= 80 ? 2 : 4,
          sleepQuality: score >= 80 ? 4 : 2,
        },
      });
    }
  }

  console.log("");
  console.log("Test roster is on the coach account. Login password for the four test users:");
  console.log(`  ${TEST_PASSWORD}`);
  for (const row of ROSTER) {
    console.log(`  ${row.role.padEnd(9)} ${row.email}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
