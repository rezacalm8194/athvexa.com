export type ReadinessTone = "good" | "warn" | "bad";

export function readinessStatus(score: number, threshold = 40) {
  if (score >= 80) return { tone: "good" as const, labelKey: "coach.dashboard.readinessExcellent" };
  if (score >= 60) return { tone: "good" as const, labelKey: "coach.dashboard.readinessReady" };
  if (score >= threshold) return { tone: "warn" as const, labelKey: "coach.dashboard.readinessFatigued" };
  return { tone: "bad" as const, labelKey: "coach.dashboard.readinessAttention" };
}
