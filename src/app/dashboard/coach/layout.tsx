import { getCoachContext } from "@/lib/coachContext";

export default async function CoachSectionLayout({ children }: { children: React.ReactNode }) {
  await getCoachContext();
  return children;
}
