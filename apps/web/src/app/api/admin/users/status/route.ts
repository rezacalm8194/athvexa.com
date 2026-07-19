import { sql } from "drizzle-orm";
import { platformAdmins, sessions, users } from "@fpp/database";
import { getDatabase } from "../../../../auth-db";
import { getPlatformAdminFromRequest } from "../../../../admin-auth";
import { redirectToAdminPath } from "../../redirect";

const allowedActions = new Set(["activate", "disable", "delete"]);

export async function POST(request: Request) {
  const currentAdmin = await getPlatformAdminFromRequest(request);

  if (!currentAdmin) {
    return redirectToAdminPath(request, "/login?returnTo=/admin");
  }

  const formData = await request.formData();
  const userId = String(formData.get("userId") ?? "");
  const action = String(formData.get("action") ?? "");

  if (!userId || !allowedActions.has(action)) {
    return redirectToAdminPath(request, "/admin?error=invalid_user_action");
  }

  if (userId === currentAdmin.userId && action !== "activate") {
    return redirectToAdminPath(request, "/admin?error=self_protection");
  }

  const db = getDatabase();
  const now = new Date();

  if (action === "delete") {
    await db.transaction(async (tx) => {
      await tx
        .update(platformAdmins)
        .set({
          revokedAt: now,
          deletedAt: now,
          updatedAt: now
        })
        .where(sql`${platformAdmins.userId} = ${userId}`);

      await tx.delete(users).where(sql`${users.id} = ${userId}`);
    });
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

  return redirectToAdminPath(request, "/admin");
}
