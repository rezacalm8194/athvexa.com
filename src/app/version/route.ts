export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    app: "athvexa",
    release: "auth-nav-favicon-2026-07-20",
    expectedCommit: "4056f9a-or-newer",
    note: "Root page serves the marketing site. Login/register redirect by role. Mobile nav and favicon assets are included.",
    expectedAssets: ["/icon-192.png", "/favicon.png", "/favicon-32.png", "/favicon-16.png"],
  });
}
