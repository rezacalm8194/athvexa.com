import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, ensureDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import { parseCoachNotificationPrefs } from "@/lib/userPreferences";

const schema = z.object({
  checkIns: z.boolean(),
  lowReadiness: z.boolean(),
  sessionComplete: z.boolean(),
  weeklyEmail: z.boolean(),
});

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "PLAYER") {
    return NextResponse.json({ error: "Coach access required" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid notification preferences." }, { status: 400 });

  await ensureDatabase();
  const user = await db.user.update({
    where: { id: session.sub },
    data: {
      notifyCheckIns: parsed.data.checkIns,
      notifyLowReadiness: parsed.data.lowReadiness,
      notifySessionComplete: parsed.data.sessionComplete,
      notifyWeeklyEmail: parsed.data.weeklyEmail,
    },
    select: {
      notifyCheckIns: true,
      notifyLowReadiness: true,
      notifySessionComplete: true,
      notifyWeeklyEmail: true,
    },
  });

  return NextResponse.json({ preferences: parseCoachNotificationPrefs(user) });
}
