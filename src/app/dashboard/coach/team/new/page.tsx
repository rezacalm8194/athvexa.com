import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import DashboardNav from "@/components/DashboardNav";
import TeamSetupForm from "@/components/coach/TeamSetupForm";

export default async function TeamSetupPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "PLAYER") redirect("/dashboard/player");
  if (session.role === "ASSISTANT") redirect("/dashboard/coach"); // only the head coach sets this up

  const existing = await db.team.findUnique({ where: { coachId: session.sub } });
  if (existing) redirect("/dashboard/coach");

  return (
    <main className="min-h-screen bg-ink">
      <DashboardNav name={session.name} roleLabel="Coach" />
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
