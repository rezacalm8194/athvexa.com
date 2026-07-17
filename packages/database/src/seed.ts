export const systemRoles = [
  {
    key: "owner",
    name: "Owner",
    description: "Workspace owner with full workspace administration."
  },
  {
    key: "coach",
    name: "Coach",
    description: "Coach with workspace, team, or player-scoped coaching access."
  },
  {
    key: "assistant",
    name: "Assistant",
    description: "Assistant focused on delegated operational work."
  },
  {
    key: "player",
    name: "Player",
    description: "Player account for own daily execution and reporting."
  }
] as const;

export const developmentPermissions = [
  { roleKey: "owner", resource: "workspace", action: "manage", scope: "workspace" },
  { roleKey: "owner", resource: "members", action: "manage", scope: "workspace" },
  { roleKey: "coach", resource: "players", action: "manage", scope: "scoped" },
  { roleKey: "assistant", resource: "tasks", action: "update", scope: "assigned" },
  { roleKey: "player", resource: "profile", action: "read", scope: "own" }
] as const;

export function getDevelopmentSeed() {
  return {
    roles: systemRoles,
    permissions: developmentPermissions
  };
}
