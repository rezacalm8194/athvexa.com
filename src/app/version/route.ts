export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    app: "athvexa",
    commit: "c169da7",
    note: "Root page should serve the marketing site. Login and register stay at /login and /register.",
  });
}
