import { db, ensureDatabase } from "@/lib/db";

export type ProgramVisibility = "ACTIVE_ONLY" | "ALL";

export type TeamWorkspace = {
  dailyReminderEnabled: boolean;
  readinessThreshold: number;
  sleepThresholdHours: number;
  programVisibility: ProgramVisibility;
  assistantActivityVisible: boolean;
  rosterCapacity: number;
};

export const DEFAULT_TEAM_WORKSPACE: TeamWorkspace = {
  dailyReminderEnabled: true,
  readinessThreshold: 40,
  sleepThresholdHours: 6,
  programVisibility: "ACTIVE_ONLY",
  assistantActivityVisible: true,
  rosterCapacity: 40,
};

const workspaceSelect = {
  dailyReminderEnabled: true,
  readinessThreshold: true,
  sleepThresholdHours: true,
  programVisibility: true,
  assistantActivityVisible: true,
  rosterCapacity: true,
} as const;

function clamp(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function parseTeamWorkspace(team?: {
  dailyReminderEnabled?: boolean | null;
  readinessThreshold?: number | null;
  sleepThresholdHours?: number | null;
  programVisibility?: string | null;
  assistantActivityVisible?: boolean | null;
  rosterCapacity?: number | null;
} | null): TeamWorkspace {
  return {
    dailyReminderEnabled: team?.dailyReminderEnabled !== false,
    readinessThreshold: clamp(Math.round(team?.readinessThreshold ?? 40), 10, 90, 40),
    sleepThresholdHours: clamp(Number(team?.sleepThresholdHours ?? 6), 3, 12, 6),
    programVisibility: team?.programVisibility === "ALL" ? "ALL" : "ACTIVE_ONLY",
    assistantActivityVisible: team?.assistantActivityVisible !== false,
    rosterCapacity: clamp(Math.round(team?.rosterCapacity ?? 40), 5, 500, 40),
  };
}

export async function getTeamWorkspaceByCoachId(coachId: string | null | undefined): Promise<TeamWorkspace> {
  if (!coachId) return DEFAULT_TEAM_WORKSPACE;
  await ensureDatabase();
  const team = await db.team.findFirst({
    where: { coachId },
    orderBy: { createdAt: "asc" },
    select: workspaceSelect,
  });
  return parseTeamWorkspace(team);
}

export async function rosterUsage(coachId: string) {
  await ensureDatabase();
  const used = await db.user.count({ where: { coachId, role: "PLAYER" } });
  const workspace = await getTeamWorkspaceByCoachId(coachId);
  return { used, capacity: workspace.rosterCapacity, remaining: Math.max(0, workspace.rosterCapacity - used) };
}
