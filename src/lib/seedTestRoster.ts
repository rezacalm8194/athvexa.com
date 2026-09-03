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

function today() {
  return new Date().toISOString().slice(0, 10);
}

function isDemoCoachEmail(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase() === DEMO_COACH_EMAIL;
}

export async function ensureRezaDemoRoster(options?: { coachId?: string; teamId?: string }) {
  const coach = options?.coachId
    ? await db.user.findUnique({ where: { id: options.coachId }, select: { id: true, role: true, email: true } })
    : await db.user.findFirst({ where: { email: DEMO_COACH_EMAIL }, select: { id: true, role: true, email: true } });

  if (!coach || !isDemoCoachEmail(coach.email)) return;

  if (coach.role !== "COACH") {
    await db.user.update({ where: { id: coach.id }, data: { role: "COACH" } });
  }

  const teams = await db.team.findMany({ where: { coachId: coach.id }, orderBy: { createdAt: "asc" } });
  const teamIds = new Set(teams.map((team) => team.id));
  if (options?.teamId) teamIds.add(options.teamId);

  if (teamIds.size === 0) {
    const created = await db.team.create({
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
    teamIds.add(created.id);
  }

  const passwordHash = await bcrypt.hash(DEMO_ROSTER_PASSWORD, 10);
  const date = today();
  const memberIds: { id: string; teamRole: string; role: "ASSISTANT" | "PLAYER"; email: string }[] = [];

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
    } else {
      user = await db.user.update({
        where: { id: user.id },
        data: { name: row.name, role: row.role, coachId: coach.id },
      });
    }
    memberIds.push({ id: user.id, teamRole: row.teamRole, role: row.role, email: row.email });

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

  for (const teamId of teamIds) {
    const team = await db.team.findFirst({ where: { id: teamId, coachId: coach.id }, select: { id: true } });
    if (!team) continue;

    await db.teamMember.upsert({
      where: { teamId_userId: { teamId, userId: coach.id } },
      update: { role: "OWNER" },
      create: { teamId, userId: coach.id, role: "OWNER" },
    });

    for (const member of memberIds) {
      await db.teamMember.upsert({
        where: { teamId_userId: { teamId, userId: member.id } },
        update: { role: member.teamRole },
        create: { teamId, userId: member.id, role: member.teamRole },
      });
    }
  }
}
