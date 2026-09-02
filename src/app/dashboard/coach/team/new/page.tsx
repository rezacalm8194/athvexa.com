import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db, ensureDatabase } from "@/lib/db";
import ServerDashboardNav from "@/components/ServerDashboardNav";
import TeamSetupForm from "@/components/coach/TeamSetupForm";
import { getUserPreferences } from "@/lib/userPreferences";

export default async function TeamSetupPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "PLAYER") redirect("/dashboard/player");
  if (session.role === "ASSISTANT") redirect("/dashboard/coach");
  const { locale } = await getUserPreferences(session.sub);

  await ensureDatabase();
  const existing = await db.team.findFirst({
    where: { coachId: session.sub },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (existing) redirect("/dashboard/coach");

  return (
    <main className="min-h-screen bg-ink">
      <ServerDashboardNav name={session.name} locale={locale} />
      <div className="mx-auto max-w-md px-6 py-16">
        <div className="eyebrow">One quick step</div>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-wide text-white">
          Set up your team
        </h1>
        <p className="mt-2 text-sm text-smoke-3">
          Give your team a name first — you'll be able to invite players and assistant coaches right after.
        </p>
        <div className="card mt-6 p-6">
          <TeamSetupForm />
        </div>
      </div>
    </main>
  );
}
