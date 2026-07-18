import { platformSettings } from "@fpp/database";
import { getDatabase } from "../../../../auth-db";
import { getPlatformAdminFromRequest } from "../../../../admin-auth";
import { redirectToAdminPath } from "../../redirect";

const supportedLocales = new Set(["en", "fa", "ar"]);

export async function POST(request: Request) {
  const currentAdmin = await getPlatformAdminFromRequest(request);

  if (!currentAdmin) {
    return redirectToAdminPath(request, "/login?returnTo=/admin");
  }

  const formData = await request.formData();
  const locale = String(formData.get("locale") ?? "").trim().toLowerCase();

  if (!supportedLocales.has(locale)) {
    return redirectToAdminPath(request, "/admin?error=invalid_locale");
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

  return redirectToAdminPath(request, "/admin");
}
