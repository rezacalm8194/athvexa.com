import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function DashboardIndex() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.role === "PLAYER") redirect("/dashboard/player");
  redirect("/dashboard/coach"); // COACH and ASSISTANT share the roster view
}
