import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const DEMO_COACH_EMAIL = "rezacalm993@gmail.com";
export const DEMO_ROSTER_PASSWORD = "TestAthvexa123!";

const ROSTER = [
  { name: "Sara Karimi", email: "sara.assistant@test.athvexa.local", role: "ASSISTANT" as const, teamRole: "ASSISTANT_COACH" },
  { name: "Nima Ahmadi", email: "nima.assistant@test.athvexa.local", role: "ASSISTANT" as const, teamRole: "ASSISTANT_COACH" },
  { name: "Ali Hassan", email: "ali.player@test.athvexa.local", role: "PLAYER" as const, teamRole: "PLAYER" },
  { name: "Omar Khalid", email: "omar.player@test.athvexa.local", role: "PLAYER" as const, teamRole: "PLAYER" },
];

let ran = false;

function today() {
  return new Date().toISOString().slice(0, 10);
}

export async function ensureRezaDemoRoster() {
  if (ran) return;
  const coach = await db.user.findFirst({
    where: { email: DEMO_COACH_EMAIL },
    select: { id: true, role: true },
  });
  if (!coach) return;

  if (coach.role !== "COACH") {
    await db.user.update({ where: { id: coach.id }, data: { role: "COACH" } });
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
  }

  await db.teamMember.upsert({
    where: { teamId_userId: { teamId: team.id, userId: coach.id } },
    update: { role: "OWNER" },
    create: { teamId: team.id, userId: coach.id, role: "OWNER" },
  });

  const passwordHash = await bcrypt.hash(DEMO_ROSTER_PASSWORD, 10);
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
          locale: "fa",
          timeZone: "Asia/Tehran",
        },
      });
    } else {
      user = await db.user.update({
        where: { id: user.id },
        data: { name: row.name, role: row.role, coachId: coach.id },
      });
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

  ran = true;
}
