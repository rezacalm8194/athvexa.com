/**
 * Attach two assistant coaches and two test players to rezacalm993@gmail.com.
 *
 *   npx tsx scripts/seed-reza-test-roster.ts
 */
import { db } from "../src/lib/db";
import { ensureRezaDemoRoster } from "../src/lib/seedTestRoster";

async function main() {
  await ensureRezaDemoRoster();
  console.log("Demo roster ensured for rezacalm993@gmail.com");
  console.log("Test user password: TestAthvexa123!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
