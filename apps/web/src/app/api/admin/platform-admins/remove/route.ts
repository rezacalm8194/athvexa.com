import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { platformAdmins } from "@fpp/database";
import { emailSchema } from "@fpp/validation";
import { getDatabase } from "../../../../auth-db";
import {
  getPlatformAdminFromRequest,
  listPlatformAdmins,
  normalizeAdminEmail
} from "../../../../admin-auth";

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
  const admins = await listPlatformAdmins();

  if (admins.length <= 1 && admins[0]?.email === email) {
    return NextResponse.redirect(new URL("/admin?error=last_admin", request.url), { status: 303 });
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

  return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });
}
