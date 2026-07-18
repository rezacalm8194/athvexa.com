import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { platformAdmins, users } from "@fpp/database";
import { emailSchema } from "@fpp/validation";
import { getDatabase } from "../../../auth-db";
import { getPlatformAdminFromRequest, normalizeAdminEmail } from "../../../admin-auth";

export async function POST(request: Request) {
  const currentAdmin = await getPlatformAdminFromRequest(request);

  if (!currentAdmin) {
    return NextResponse.redirect(new URL("/login?returnTo=/admin", request.url), { status: 303 });
  }

  const formData = await request.formData();
  const parsed = emailSchema.safeParse(formData.get("email"));

  if (!parsed.success) {
    return NextResponse.redirect(new URL("/admin?error=invalid_email", request.url), {
      status: 303
    });
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

  return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });
}
