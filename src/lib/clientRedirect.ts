export function authRedirectUrl(role: string | undefined, serverRedirectTo: string | undefined) {
  const dashboardPath = role === "PLAYER" ? "/dashboard/player" : "/dashboard/coach";
  const isLocal =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  if (isLocal) return dashboardPath;
  return serverRedirectTo ?? `${process.env.NEXT_PUBLIC_APP_URL ?? "https://app.athvexa.com"}${dashboardPath}`;
}
