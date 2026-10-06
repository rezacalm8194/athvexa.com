import type { ProgramVisibility } from "@/lib/teamWorkspace";

export function playerProgramStatusFilter(programVisibility: ProgramVisibility) {
  if (programVisibility === "ALL") {
    return { in: ["DRAFT", "ACTIVE", "ARCHIVED"] };
  }
  return { in: ["DRAFT", "ACTIVE"] };
}

export function publishedProgramStatus(status: "DRAFT" | "ACTIVE" | "ARCHIVED", assignedCount: number) {
  if (assignedCount > 0 && status === "DRAFT") return "ACTIVE";
  return status;
}

export function normalizeProgramDate(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}
