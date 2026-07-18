import { randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import {
  activityLogs,
  invitations,
  permissions,
  roles,
  sessions,
  users,
  workspaceMembers
} from "@fpp/database";
import { hashToken, sessionCookieName } from "@fpp/auth";
import { createInvitationSchema } from "@fpp/validation";
import { getDatabase } from "./auth-db";
import { formBoolean, formString } from "./auth-flow";

type InvitationError = "unauthorized" | "invalid" | "forbidden" | "role_missing" | "server";

function getCookieValue(cookieHeader: string | null, name: string) {
  return cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function createInvitationToken() {
  return randomBytes(32).toString("base64url");
}

export async function getActiveWorkspaceMemberFromRequest(request: Request) {
  const token = getCookieValue(request.headers.get("cookie"), sessionCookieName);

  if (!token) {
    return null;
  }

  const db = getDatabase();
  const [member] = await db
    .select({
      memberId: workspaceMembers.id,
      workspaceId: workspaceMembers.workspaceId,
      userId: users.id,
      roleId: roles.id,
      roleKey: roles.key
    })
    .from(sessions)
    .innerJoin(users, sql`${sessions.userId} = ${users.id}`)
    .innerJoin(
      workspaceMembers,
      sql`${workspaceMembers.userId} = ${users.id}
        and ${workspaceMembers.status} = 'active'
        and ${workspaceMembers.deletedAt} is null`
    )
    .innerJoin(roles, sql`${workspaceMembers.roleId} = ${roles.id}`)
    .where(
      sql`${sessions.tokenHash} = ${hashToken(token)}
        and ${sessions.revokedAt} is null
        and ${sessions.expiresAt} > now()
        and ${users.deletedAt} is null
        and ${users.status} = 'active'`
    )
    .limit(1);

  return member ?? null;
}

async function canManageMembers(member: NonNullable<Awaited<ReturnType<typeof getActiveWorkspaceMemberFromRequest>>>) {
  if (member.roleKey === "owner") {
    return true;
  }

  const db = getDatabase();
  const [permission] = await db
    .select({ id: permissions.id })
    .from(permissions)
    .where(
      sql`${permissions.roleId} = ${member.roleId}
        and ${permissions.resource} = 'members'
        and ${permissions.action} = 'manage'
        and ${permissions.scope} = 'workspace'`
    )
    .limit(1);

  return Boolean(permission);
}

export async function createWorkspaceInvitation(formData: FormData, request: Request) {
  const currentMember = await getActiveWorkspaceMemberFromRequest(request);

  if (!currentMember) {
    return { ok: false as const, error: "unauthorized" as InvitationError };
  }

  if (!(await canManageMembers(currentMember))) {
    return { ok: false as const, error: "forbidden" as InvitationError };
  }

  const parsed = createInvitationSchema.safeParse({
    email: formString(formData, "email"),
    role: formString(formData, "role"),
    expiresInDays: formString(formData, "expiresInDays"),
    usageLimit: formString(formData, "usageLimit"),
    requiresApproval: formBoolean(formData, "requiresApproval"),
    teamScopeMode: formString(formData, "teamScopeMode"),
    playerScopeMode: formString(formData, "playerScopeMode"),
    teamId: formString(formData, "teamId"),
    playerScopeId: formString(formData, "playerScopeId")
  });

  if (!parsed.success) {
    return { ok: false as const, error: "invalid" as InvitationError };
  }

  const now = new Date();
  const token = createInvitationToken();
  const expiresAt = new Date(now.getTime() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000);
  const db = getDatabase();

  try {
    await db.transaction(async (tx) => {
      const [targetRole] = await tx
        .select({ id: roles.id })
        .from(roles)
        .where(sql`${roles.key} = ${parsed.data.role} and ${roles.workspaceId} is null`)
        .limit(1);

      if (!targetRole) {
        throw new Error("role_missing");
      }

      const [invitation] = await tx
        .insert(invitations)
        .values({
          workspaceId: currentMember.workspaceId,
          emailNormalized: parsed.data.email,
          roleId: targetRole.id,
          teamId: parsed.data.teamId,
          playerScopeId: parsed.data.playerScopeId,
          teamScopeMode: parsed.data.teamScopeMode,
          playerScopeMode: parsed.data.playerScopeMode,
          tokenHash: hashToken(token),
          expiresAt,
          usageLimit: parsed.data.usageLimit,
          requiresApproval: parsed.data.requiresApproval,
          createdBy: currentMember.userId,
          updatedBy: currentMember.userId
        })
        .returning({ id: invitations.id });

      await tx.insert(activityLogs).values({
        workspaceId: currentMember.workspaceId,
        actorUserId: currentMember.userId,
        actorMemberId: currentMember.memberId,
        action: "invitation.created",
        entityType: "invitation",
        entityId: invitation.id,
        after: {
          email: parsed.data.email,
          role: parsed.data.role,
          teamScopeMode: parsed.data.teamScopeMode,
          playerScopeMode: parsed.data.playerScopeMode,
          expiresAt: expiresAt.toISOString(),
          usageLimit: parsed.data.usageLimit,
          requiresApproval: parsed.data.requiresApproval
        },
        userAgent: request.headers.get("user-agent")
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "role_missing") {
      return { ok: false as const, error: "role_missing" as InvitationError };
    }

    console.error("[invitations]", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : "Unknown invitation error."
    });

    return { ok: false as const, error: "server" as InvitationError };
  }

  return { ok: true as const };
}
