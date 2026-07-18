import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { platformAdmins, users } from "@fpp/database";
import { hashPassword } from "@fpp/auth";
import { emailSchema, passwordSchema } from "@fpp/validation";
import { getDatabase } from "../../../auth-db";
import { getPlatformAdminFromRequest, normalizeAdminEmail } from "../../../admin-auth";

export async function POST(request: Request) {
  const currentAdmin = await getPlatformAdminFromRequest(request);

  if (!currentAdmin) {
    return NextResponse.redirect(new URL("/login?returnTo=/admin", request.url), { status: 303 });
  }

  const formData = await request.formData();
  const emailParsed = emailSchema.safeParse(formData.get("email"));
  const passwordParsed = passwordSchema.safeParse(formData.get("password"));
  const name = String(formData.get("name") ?? "").trim().slice(0, 160);
  const shouldGrantAdmin = formData.get("platformAdmin") === "on";

  if (!emailParsed.success || !passwordParsed.success || name.length < 2) {
    return NextResponse.redirect(new URL("/admin?error=invalid_user", request.url), {
      status: 303
    });
  }

  const email = normalizeAdminEmail(emailParsed.data);
  const db = getDatabase();
  const [user] = await db
    .insert(users)
    .values({
      email,
      emailNormalized: email,
      passwordHash: await hashPassword(passwordParsed.data),
      name
    })
    .onConflictDoNothing()
    .returning({ id: users.id });

  const [existingUser] = user
    ? [user]
    : await db
        .select({ id: users.id })
        .from(users)
        .where(sql`${users.emailNormalized} = ${email} and ${users.deletedAt} is null`)
        .limit(1);

  if (shouldGrantAdmin && existingUser) {
    await db
      .insert(platformAdmins)
      .values({
        emailNormalized: email,
        userId: existingUser.id,
        grantedBy: currentAdmin.userId
      })
      .onConflictDoNothing();
  }

  return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });
}
