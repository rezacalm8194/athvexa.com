import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { sessions, users } from "@fpp/database";
import { getDatabase } from "../../../../auth-db";
import { getPlatformAdminFromRequest } from "../../../../admin-auth";

const allowedActions = new Set(["activate", "disable", "delete"]);

export async function POST(request: Request) {
  const currentAdmin = await getPlatformAdminFromRequest(request);

  if (!currentAdmin) {
    return NextResponse.redirect(new URL("/login?returnTo=/admin", request.url), { status: 303 });
  }

  const formData = await request.formData();
  const userId = String(formData.get("userId") ?? "");
  const action = String(formData.get("action") ?? "");

  if (!userId || !allowedActions.has(action)) {
    return NextResponse.redirect(new URL("/admin?error=invalid_user_action", request.url), {
      status: 303
    });
  }

  if (userId === currentAdmin.userId && action !== "activate") {
    return NextResponse.redirect(new URL("/admin?error=self_protection", request.url), {
      status: 303
    });
  }

  const db = getDatabase();
  const now = new Date();

  if (action === "delete") {
    await db
      .update(users)
      .set({
        deletedAt: now,
        updatedAt: now,
        status: "disabled"
      })
      .where(sql`${users.id} = ${userId}`);
  } else {
    await db
      .update(users)
      .set({
        deletedAt: null,
        updatedAt: now,
        status: action === "activate" ? "active" : "disabled"
      })
      .where(sql`${users.id} = ${userId}`);
  }

  if (action !== "activate") {
    await db
      .update(sessions)
      .set({ revokedAt: now })
      .where(sql`${sessions.userId} = ${userId} and ${sessions.revokedAt} is null`);
  }

  return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });
}
