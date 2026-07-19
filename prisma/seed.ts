import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("password123", 10);
  const today = new Date().toISOString().slice(0, 10);

  const coach = await db.user.upsert({
    where: { email: "coach@athvexa.com" },
    update: {},
    create: {
      name: "Coach Ali",
      email: "coach@athvexa.com",
      passwordHash: password,
      role: "COACH",
    },
  });

  const playersData = [
    { name: "Ali Hassan", email: "ali@athvexa.com", score: 84, sleep: 7.5, water: 1.8 },
    { name: "Omar Khalid", email: "omar@athvexa.com", score: 71, sleep: 6, water: 1.2 },
    { name: "Yusuf Noor", email: "yusuf@athvexa.com", score: 92, sleep: 8, water: 2.4 },
    { name: "Tariq Salem", email: "tariq@athvexa.com", score: 45, sleep: 5, water: 0.8 },
  ];

  for (const p of playersData) {
    const player = await db.user.upsert({
      where: { email: p.email },
      update: {},
      create: {
        name: p.name,
        email: p.email,
        passwordHash: password,
        role: "PLAYER",
        coachId: coach.id,
      },
    });

    await db.dailyLog.upsert({
      where: { playerId_date: { playerId: player.id, date: today } },
      update: {},
      create: {
        playerId: player.id,
        date: today,
        score: p.score,
        sleepHours: p.sleep,
        waterLiters: p.water,
        energy: 4,
        fatigue: 2,
        soreness: 2,
        mood: 4,
        stress: 2,
        sleepQuality: 4,
        tasks: {
          create: [
            { label: "Weigh-in", order: 0, done: true },
            { label: "Breakfast + supplements", order: 1, done: true },
            { label: "Football training", order: 2, done: false },
            { label: "Gym session", order: 3, done: false },
            { label: "Recovery & stretch", order: 4, done: false },
          ],
        },
      },
    });

    await db.coachNote.upsert({
      where: { playerId_date: { playerId: player.id, date: today } },
      update: {},
      create: {
        playerId: player.id,
        date: today,
        message: "Great effort in the gym today. Focus on recovery tonight.",
      },
    });
  }

  console.log("Seeded 1 coach + 4 players.");
  console.log("Login as coach@athvexa.com / password123");
  console.log("Login as ali@athvexa.com / password123 (or omar / yusuf / tariq)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => db.$disconnect());
