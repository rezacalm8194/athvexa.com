import { db } from "@/lib/db";
import { notifyPlayerOfProgramAssignment, notifyPlayerOfTeamInvite } from "@/lib/playerInbox";
import { weekDates } from "@/lib/week";

export const DEMO_COACH_EMAIL = "rezasafrarinet1@gmail.com";
export const DEMO_PLAYER_EMAIL = "rezacalm993@gmail.com";

const DEMO_PROGRAM_NAME = "برنامه هفتگی آمادگی";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function dateOffset(daysFromToday: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

function weekdayName(date = new Date()) {
  return new Intl.DateTimeFormat("en", { weekday: "long" }).format(date);
}

function isEmail(value: string | null | undefined, expected: string) {
  return (value ?? "").trim().toLowerCase() === expected;
}

export async function ensureRezaDemoRoster(options?: { coachId?: string; teamId?: string }) {
  const coach = await db.user.findFirst({
    where: { email: { contains: "rezasafrarinet1@" } },
    select: { id: true, role: true, email: true, name: true },
  });
  if (!coach || !isEmail(coach.email, DEMO_COACH_EMAIL)) return;
  if (options?.coachId && options.coachId !== coach.id) return;

  if (coach.role !== "COACH") {
    await db.user.update({ where: { id: coach.id }, data: { role: "COACH" } });
  }

  let team =
    (options?.teamId
      ? await db.team.findFirst({ where: { id: options.teamId, coachId: coach.id } })
      : null) ?? (await db.team.findFirst({ where: { coachId: coach.id }, orderBy: { createdAt: "asc" } }));

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

  const player = await db.user.findFirst({
    where: { email: { contains: "rezacalm993@" } },
    select: { id: true, name: true, email: true, role: true, coachId: true },
  });
  if (!player || !isEmail(player.email, DEMO_PLAYER_EMAIL)) return;

  const hadMembership = Boolean(
    await db.teamMember.findUnique({
      where: { teamId_userId: { teamId: team.id, userId: player.id } },
    })
  );

  await db.user.update({
    where: { id: player.id },
    data: { role: "PLAYER", coachId: coach.id, locale: "fa" },
  });

  await db.teamMember.upsert({
    where: { teamId_userId: { teamId: team.id, userId: player.id } },
    update: { role: "PLAYER" },
    create: { teamId: team.id, userId: player.id, role: "PLAYER" },
  });

  const existingProgram = await db.program.findFirst({
    where: { coachId: coach.id, name: DEMO_PROGRAM_NAME },
    select: { id: true, name: true },
  });
  const hadAssignment = existingProgram
    ? Boolean(
        await db.programAssignment.findUnique({
          where: { programId_playerId: { programId: existingProgram.id, playerId: player.id } },
        })
      )
    : false;

  const program = await ensurePlayerProgram(coach.id, player.id);
  await ensurePlayerChecklist(player.id);
  await ensurePlayerPlanner(player.id);
  await ensureCoachNote(player.id, coach.name);

  const hasInviteNotice = await db.notification.findFirst({
    where: { userId: player.id, type: { in: ["TEAM_INVITE", "PROGRAM_ASSIGNED"] } },
    select: { id: true },
  });

  if (!hadMembership || !hasInviteNotice) {
    await notifyPlayerOfTeamInvite({
      playerId: player.id,
      coachId: coach.id,
      senderId: coach.id,
      coachName: coach.name,
      teamName: team.name,
    });
  }

  if (!hadAssignment || !hasInviteNotice) {
    await notifyPlayerOfProgramAssignment({
      playerId: player.id,
      coachId: coach.id,
      coachName: coach.name,
      programId: program.id,
      programName: program.name,
      isNew: true,
    });
  }
}

async function ensurePlayerProgram(coachId: string, playerId: string) {
  let program = await db.program.findFirst({
    where: { coachId, name: DEMO_PROGRAM_NAME },
    select: { id: true, name: true },
  });

  if (!program) {
    program = await db.program.create({
      data: {
        coachId,
        name: DEMO_PROGRAM_NAME,
        description: "برنامه تستی مربی برای دیدن تمرین، چک‌لیست و پیام در حساب شاگرد.",
        goal: "آمادگی هفتگی",
        durationWeeks: 4,
        sessionsPerWeek: 4,
        startDate: dateOffset(-3),
        endDate: dateOffset(25),
        status: "ACTIVE",
        sessions: {
          create: [
            {
              title: "سرعت و چابکی",
              day: "Monday",
              durationMinutes: 70,
              intensity: "HIGH",
              notes: "گرم کردن ۱۰ دقیقه، SAQ، ۴ تکرار سرعت، سرد کردن.",
              order: 0,
            },
            {
              title: "قدرت و قدرتمندی",
              day: "Wednesday",
              durationMinutes: 60,
              intensity: "MEDIUM",
              notes: "اسکات، پرس، حرکت اصلی پایین‌تنه، حرکات کمکی.",
              order: 1,
            },
            {
              title: "تاکتیک و شکل تیمی",
              day: "Thursday",
              durationMinutes: 80,
              intensity: "MEDIUM",
              notes: "مالکیت، انتقال، ضربات ایستگاهی.",
              order: 2,
            },
            {
              title: "ریکاوری فعال",
              day: "Saturday",
              durationMinutes: 40,
              intensity: "LOW",
              notes: "دویدن سبک، کشش، تنفس و موبیلیتی.",
              order: 3,
            },
          ],
        },
      },
      select: { id: true, name: true },
    });
  }

  await db.programAssignment.upsert({
    where: { programId_playerId: { programId: program.id, playerId } },
    update: {},
    create: { programId: program.id, playerId },
  });

  return program;
}

async function ensurePlayerChecklist(playerId: string) {
  const date = todayKey();
  const sessionTitle = weekdayName() === "Thursday" ? "تاکتیک و شکل تیمی" : "جلسه تمرین امروز";
  const labels = [
    "وزن‌کشی صبح",
    "صبحانه و مکمل",
    sessionTitle,
    "آب و ریکاوری",
    "کشش و خواب کافی",
  ];

  let log = await db.dailyLog.findUnique({
    where: { playerId_date: { playerId, date } },
    include: { tasks: true },
  });

  if (!log) {
    log = await db.dailyLog.create({
      data: {
        playerId,
        date,
        score: 0,
        tasks: { create: labels.map((label, order) => ({ label, order })) },
      },
      include: { tasks: true },
    });
    return;
  }

  if (log.tasks.length === 0) {
    await db.task.createMany({
      data: labels.map((label, order) => ({ dailyLogId: log.id, label, order })),
    });
  }
}

async function ensurePlayerPlanner(playerId: string) {
  const dates = weekDates();
  const plan = [
    { index: 0, label: "سرعت و چابکی", category: "Training" },
    { index: 2, label: "قدرت در باشگاه", category: "Gym" },
    { index: 3, label: "تاکتیک تیمی", category: "Training" },
    { index: 5, label: "ریکاوری فعال", category: "Recovery" },
    { index: 6, label: "استراحت", category: "Rest" },
  ];

  for (const item of plan) {
    const date = dates[item.index];
    if (!date) continue;
    const existing = await db.planItem.findFirst({ where: { playerId, date, label: item.label } });
    if (existing) continue;
    const count = await db.planItem.count({ where: { playerId, date } });
    await db.planItem.create({
      data: { playerId, date, label: item.label, category: item.category, order: count },
    });
  }
}

async function ensureCoachNote(playerId: string, coachName: string) {
  const date = todayKey();
  await db.coachNote.upsert({
    where: { playerId_date: { playerId, date } },
    update: {},
    create: {
      playerId,
      date,
      message: `${coachName}: برنامه این هفته فعال است. چک‌لیست امروز را کامل کن و بعد از تمرین وضعیتت را ثبت کن.`,
    },
  });
}
