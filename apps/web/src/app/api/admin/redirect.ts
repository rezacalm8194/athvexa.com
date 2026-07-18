import { NextResponse } from "next/server";
import { getSafeInternalPath, normalizeTrailingSlash } from "@fpp/config";

const productionAdminBaseUrl = "https://athvexa.com";

function getAdminBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!configuredUrl) {
    return productionAdminBaseUrl;
  }

  try {
    const url = new URL(configuredUrl);

    if (url.hostname === "0.0.0.0" || url.hostname === "::" || url.hostname === "[::]") {
      return productionAdminBaseUrl;
    }

    return normalizeTrailingSlash(url.toString());
  } catch {
    return productionAdminBaseUrl;
  }
}

export function redirectToAdminPath(request: Request, path: string) {
  return NextResponse.redirect(new URL(getSafeInternalPath(path), `${getAdminBaseUrl()}/`), {
    status: 303
  });
}
