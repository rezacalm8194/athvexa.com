import { NextResponse } from "next/server";
import { buildSafeRedirectUrl } from "@fpp/config";

export function redirectToAdminPath(request: Request, path: string) {
  return NextResponse.redirect(
    buildSafeRedirectUrl(request.url, path, process.env, request.headers),
    { status: 303 }
  );
}
