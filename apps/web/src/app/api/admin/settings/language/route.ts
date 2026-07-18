import { NextResponse } from "next/server";
import { platformSettings } from "@fpp/database";
import { getDatabase } from "../../../../auth-db";
import { getPlatformAdminFromRequest } from "../../../../admin-auth";

const supportedLocales = new Set(["en", "fa", "ar"]);

export async function POST(request: Request) {
  const currentAdmin = await getPlatformAdminFromRequest(request);

  if (!currentAdmin) {
    return NextResponse.redirect(new URL("/login?returnTo=/admin", request.url), { status: 303 });
  }

  const formData = await request.formData();
  const locale = String(formData.get("locale") ?? "").trim().toLowerCase();

  if (!supportedLocales.has(locale)) {
    return NextResponse.redirect(new URL("/admin?error=invalid_locale", request.url), {
      status: 303
    });
  }

  await getDatabase()
    .insert(platformSettings)
    .values({
      key: "default_locale",
      value: locale,
      updatedBy: currentAdmin.userId,
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: platformSettings.key,
      set: {
        value: locale,
        updatedBy: currentAdmin.userId,
        updatedAt: new Date()
      }
    });

  return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });
}
