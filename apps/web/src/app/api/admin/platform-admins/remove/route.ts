import { sql } from "drizzle-orm";
import { platformAdmins } from "@fpp/database";
import { emailSchema } from "@fpp/validation";
import { getDatabase } from "../../../../auth-db";
import {
  getPlatformAdminFromRequest,
  listPlatformAdmins,
  normalizeAdminEmail
} from "../../../../admin-auth";
import { redirectToAdminPath } from "../../redirect";

export async function POST(request: Request) {
  const currentAdmin = await getPlatformAdminFromRequest(request);

  if (!currentAdmin) {
    return redirectToAdminPath(request, "/login?returnTo=/admin");
  }

  const formData = await request.formData();
  const parsed = emailSchema.safeParse(formData.get("email"));

  if (!parsed.success) {
    return redirectToAdminPath(request, "/admin?error=invalid_email");
  }

  const email = normalizeAdminEmail(parsed.data);
  const admins = await listPlatformAdmins();

  if (admins.length <= 1 && admins[0]?.email === email) {
    return redirectToAdminPath(request, "/admin?error=last_admin");
  }

  await getDatabase()
    .update(platformAdmins)
    .set({
      revokedAt: new Date(),
      updatedAt: new Date()
    })
    .where(
      sql`${platformAdmins.emailNormalized} = ${email}
        and ${platformAdmins.revokedAt} is null
        and ${platformAdmins.deletedAt} is null`
    );

  return redirectToAdminPath(request, "/admin");
}
