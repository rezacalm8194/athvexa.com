import PreferencesForm from "@/components/PreferencesForm";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db, ensureDatabase } from "@/lib/db";

export default async function PreferencesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  await ensureDatabase();
  const user = await db.user.findUnique({ where: { id: session.sub }, select: { onboardingCompletedAt: true } });
  if (user?.onboardingCompletedAt) redirect(session.role === "PLAYER" ? "/dashboard/player" : "/dashboard/coach");
  return <main className="mx-auto flex min-h-screen max-w-lg items-center px-5 py-10"><section className="w-full rounded-xl border border-line-1 bg-ink-3 p-6 shadow-xl sm:p-8"><p className="eyebrow">Athvexa</p><div className="mt-2"><PreferencesForm onboarding /></div></section></main>;
}
