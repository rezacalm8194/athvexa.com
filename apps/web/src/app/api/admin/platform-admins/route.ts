import { sql } from "drizzle-orm";
import { platformAdmins, users } from "@fpp/database";
import { emailSchema } from "@fpp/validation";
import { getDatabase } from "../../../auth-db";
import { getPlatformAdminFromRequest, normalizeAdminEmail } from "../../../admin-auth";
import { redirectToAdminPath } from "../redirect";

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
  const db = getDatabase();
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`${users.emailNormalized} = ${email} and ${users.deletedAt} is null`)
    .limit(1);

  await db
    .insert(platformAdmins)
    .values({
      emailNormalized: email,
      userId: existingUser?.id,
      grantedBy: currentAdmin.userId
    })
    .onConflictDoNothing();

  return redirectToAdminPath(request, "/admin");
}
