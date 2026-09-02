import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db, ensureDatabase } from "@/lib/db";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  await ensureDatabase();
  const user = await db.user.findUnique({ where: { id: session.sub }, select: { onboardingCompletedAt: true } });
  if (!user?.onboardingCompletedAt) redirect("/onboarding/preferences");
  return children;
}
