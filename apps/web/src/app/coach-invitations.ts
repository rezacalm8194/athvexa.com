import { randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import {
  activityLogs,
  devices,
  invitations,
  permissions,
  roles,
  sessions,
  users,
  workspaceMembers
} from "@fpp/database";
import {
  createSessionToken,
  getSessionExpiry,
  hashPassword,
  hashToken,
  sessionCookieName
} from "@fpp/auth";
import { acceptInvitationSchema, createInvitationSchema, revokeInvitationSchema } from "@fpp/validation";
import { getDatabase } from "./auth-db";
import { formBoolean, formString } from "./auth-flow";

type InvitationError =
  | "unauthorized"
  | "invalid"
  | "forbidden"
  | "invalid_assistant_scope"
  | "invalid_player_usage"
  | "role_missing"
  | "not_found"
  | "expired"
  | "revoked"
  | "used"
  | "login_required"
  | "email_mismatch"
  | "already_member"
  | "already_revoked"
  | "already_accepted"
  | "server";

type InvitationStatusInput = {
  revokedAt: Date | null;
  expiresAt: Date;
  usageCount: number;
  usageLimit: number;
};

type InvitationQueueStatusInput = InvitationStatusInput & {
  acceptedAt: Date | null;
  requiresApproval: boolean;
};

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

export function createInvitationEmailSlug(email: string) {
  return email
    .trim()
    .toLowerCase()
    .replace("@", "-at-")
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function createReadableInvitationPath(role: string, email: string, token: string) {
  return `/invite/link/${role}/${createInvitationEmailSlug(email)}/${encodeURIComponent(token)}`;
}

export function getInvitationUnavailableReason(invitation: InvitationStatusInput, now = new Date()) {
  if (invitation.revokedAt) {
    return "revoked" as const;
  }

  if (invitation.expiresAt <= now) {
    return "expired" as const;
  }

  if (invitation.usageCount >= invitation.usageLimit) {
    return "used" as const;
  }

  return null;
}

export function getInvitationQueueStatus(invitation: InvitationQueueStatusInput, now = new Date()) {
  if (invitation.revokedAt) {
    return "Revoked";
  }

  if (invitation.acceptedAt) {
    return "Accepted";
  }

  const unavailableReason = getInvitationUnavailableReason(invitation, now);

  if (unavailableReason === "expired") {
    return "Expired";
  }

  if (unavailableReason === "used") {
    return "Used";
  }

  return invitation.requiresApproval ? "Needs approval" : "Pending";
}

export function getInvitationBadgeTone(status: string) {
  if (status === "Pending") {
    return "info";
  }

  if (status === "Needs approval") {
    return "warning";
  }

  if (status === "Accepted") {
    return "success";
  }

  return "danger";
}

export function getInvitationLandingPath(role: "owner" | "coach" | "assistant" | "player") {
  if (role === "player") {
    return "/player";
  }

  return "/coach";
}

export function getInvitationErrorMessage(value: string | string[] | undefined) {
  const code = Array.isArray(value) ? value[0] : value;

  switch (code) {
    case "invalid":
      return "Please check the invitation form and try again.";
    case "invalid_player_usage":
      return "Player invitations must have usage limit 1. The form now keeps this locked automatically.";
    case "invalid_assistant_scope":
      return "Assistant invitations cannot use all-team access. Choose assigned or none.";
    case "not_found":
      return "This invitation link is not valid.";
    case "expired":
      return "This invitation has expired. Ask the workspace owner for a new one.";
    case "revoked":
      return "This invitation was revoked by the workspace owner.";
    case "used":
      return "This invitation has already reached its usage limit.";
    case "login_required":
      return "An account already exists for this email. Log in, then open the invitation again.";
    case "email_mismatch":
      return "This invitation belongs to a different email address.";
    case "already_member":
      return "This account is already a member of the workspace.";
    case "already_revoked":
      return "This invitation was already revoked.";
    case "already_accepted":
      return "Accepted invitations cannot be revoked from this queue.";
    case "server":
      return "Invitation acceptance is temporarily unavailable.";
    default:
      return undefined;
  }
}

export async function getAuthenticatedUserFromRequest(request: Request) {
  const token = getCookieValue(request.headers.get("cookie"), sessionCookieName);

  if (!token) {
    return null;
  }

  const db = getDatabase();
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      emailNormalized: users.emailNormalized,
      name: users.name
    })
    .from(sessions)
    .innerJoin(users, sql`${sessions.userId} = ${users.id}`)
    .where(
      sql`${sessions.tokenHash} = ${hashToken(token)}
        and ${sessions.revokedAt} is null
        and ${sessions.expiresAt} > now()
        and ${users.deletedAt} is null
        and ${users.status} = 'active'`
    )
    .limit(1);

  return user ?? null;
}

export async function getActiveWorkspaceMemberByToken(token: string | undefined) {
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

export async function getActiveWorkspaceMemberFromRequest(request: Request) {
  return getActiveWorkspaceMemberByToken(getCookieValue(request.headers.get("cookie"), sessionCookieName));
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
    const firstIssue = parsed.error.issues[0];

    if (firstIssue?.path.includes("usageLimit")) {
      return { ok: false as const, error: "invalid_player_usage" as InvitationError };
    }

    if (firstIssue?.path.includes("teamScopeMode")) {
      return { ok: false as const, error: "invalid_assistant_scope" as InvitationError };
    }

    return { ok: false as const, error: "invalid" as InvitationError };
  }

  const now = new Date();
  const token = createInvitationToken();
  const expiresAt = new Date(now.getTime() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000);
  const db = getDatabase();
  let invitationId: string | null = null;

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
      invitationId = invitation.id;

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

  return {
    ok: true as const,
    invitationId,
    token,
    email: parsed.data.email,
    role: parsed.data.role,
    invitePath: createReadableInvitationPath(parsed.data.role, parsed.data.email, token)
  };
}

export async function listWorkspaceInvitationsByToken(token: string | undefined) {
  const currentMember = await getActiveWorkspaceMemberByToken(token);

  if (!currentMember) {
    return { ok: false as const, error: "unauthorized" as InvitationError };
  }

  if (!(await canManageMembers(currentMember))) {
    return { ok: false as const, error: "forbidden" as InvitationError };
  }

  const db = getDatabase();
  const rows = await db
    .select({
      id: invitations.id,
      email: invitations.emailNormalized,
      role: roles.key,
      expiresAt: invitations.expiresAt,
      usageCount: invitations.usageCount,
      usageLimit: invitations.usageLimit,
      requiresApproval: invitations.requiresApproval,
      revokedAt: invitations.revokedAt,
      acceptedAt: invitations.acceptedAt,
      teamScopeMode: invitations.teamScopeMode,
      playerScopeMode: invitations.playerScopeMode,
      createdAt: invitations.createdAt
    })
    .from(invitations)
    .innerJoin(roles, sql`${invitations.roleId} = ${roles.id}`)
    .where(
      sql`${invitations.workspaceId} = ${currentMember.workspaceId}
        and ${invitations.acceptedAt} is null
        and ${invitations.deletedAt} is null`
    )
    .orderBy(sql`${invitations.createdAt} desc`)
    .limit(25);

  return {
    ok: true as const,
    invitations: rows.map((invitation) => {
      const status = getInvitationQueueStatus(invitation);

      return {
        ...invitation,
        status,
        badgeTone: getInvitationBadgeTone(status)
      };
    })
  };
}

export async function revokeWorkspaceInvitation(formData: FormData, request: Request) {
  const currentMember = await getActiveWorkspaceMemberFromRequest(request);

  if (!currentMember) {
    return { ok: false as const, error: "unauthorized" as InvitationError };
  }

  if (!(await canManageMembers(currentMember))) {
    return { ok: false as const, error: "forbidden" as InvitationError };
  }

  const parsed = revokeInvitationSchema.safeParse({
    invitationId: formString(formData, "invitationId")
  });

  if (!parsed.success) {
    return { ok: false as const, error: "invalid" as InvitationError };
  }

  const db = getDatabase();
  const now = new Date();

  try {
    await db.transaction(async (tx) => {
      const [invitation] = await tx
        .select({
          id: invitations.id,
          workspaceId: invitations.workspaceId,
          email: invitations.emailNormalized,
          revokedAt: invitations.revokedAt,
          acceptedAt: invitations.acceptedAt
        })
        .from(invitations)
        .where(
          sql`${invitations.id} = ${parsed.data.invitationId}
            and ${invitations.workspaceId} = ${currentMember.workspaceId}
            and ${invitations.deletedAt} is null`
        )
        .limit(1);

      if (!invitation) {
        throw new Error("not_found");
      }

      if (invitation.revokedAt) {
        throw new Error("already_revoked");
      }

      if (invitation.acceptedAt) {
        throw new Error("already_accepted");
      }

      await tx
        .update(invitations)
        .set({
          revokedAt: now,
          updatedBy: currentMember.userId,
          updatedAt: now
        })
        .where(sql`${invitations.id} = ${invitation.id}`);

      await tx.insert(activityLogs).values({
        workspaceId: currentMember.workspaceId,
        actorUserId: currentMember.userId,
        actorMemberId: currentMember.memberId,
        action: "invitation.revoked",
        entityType: "invitation",
        entityId: invitation.id,
        after: {
          email: invitation.email,
          revokedAt: now.toISOString()
        },
        userAgent: request.headers.get("user-agent")
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "server";

    if (["not_found", "already_revoked", "already_accepted"].includes(message)) {
      return { ok: false as const, error: message as InvitationError };
    }

    console.error("[invitations]", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : "Unknown invitation revocation error."
    });

    return { ok: false as const, error: "server" as InvitationError };
  }

  return { ok: true as const };
}

export async function getInvitationPreview(token: string) {
  const parsed = acceptInvitationSchema.pick({ token: true }).safeParse({ token });

  if (!parsed.success) {
    return { ok: false as const, error: "invalid" as InvitationError };
  }

  const db = getDatabase();
  const [invitation] = await db
    .select({
      email: invitations.emailNormalized,
      role: roles.key,
      expiresAt: invitations.expiresAt,
      usageCount: invitations.usageCount,
      usageLimit: invitations.usageLimit,
      requiresApproval: invitations.requiresApproval,
      revokedAt: invitations.revokedAt
    })
    .from(invitations)
    .innerJoin(roles, sql`${invitations.roleId} = ${roles.id}`)
    .where(sql`${invitations.tokenHash} = ${hashToken(parsed.data.token)} and ${invitations.deletedAt} is null`)
    .limit(1);

  if (!invitation) {
    return { ok: false as const, error: "not_found" as InvitationError };
  }

  const unavailableReason = getInvitationUnavailableReason(invitation);

  if (unavailableReason) {
    return { ok: false as const, error: unavailableReason };
  }

  return { ok: true as const, invitation };
}

export async function acceptWorkspaceInvitation(formData: FormData, request: Request) {
  const parsed = acceptInvitationSchema.safeParse({
    token: formString(formData, "token"),
    name: formString(formData, "name"),
    password: formString(formData, "password")
  });

  if (!parsed.success) {
    return { ok: false as const, error: "invalid" as InvitationError };
  }

  const db = getDatabase();
  const now = new Date();
  const currentUser = await getAuthenticatedUserFromRequest(request);
  const userAgent = request.headers.get("user-agent");
  const sessionToken = currentUser ? null : createSessionToken();
  const sessionExpiresAt = currentUser ? null : getSessionExpiry(now, true);
  let landingPath = "/coach";

  try {
    await db.transaction(async (tx) => {
      const [invitation] = await tx
        .select({
          id: invitations.id,
          workspaceId: invitations.workspaceId,
          email: invitations.emailNormalized,
          roleId: invitations.roleId,
          role: roles.key,
          teamScopeMode: invitations.teamScopeMode,
          playerScopeMode: invitations.playerScopeMode,
          usageCount: invitations.usageCount,
          usageLimit: invitations.usageLimit,
          requiresApproval: invitations.requiresApproval,
          revokedAt: invitations.revokedAt,
          expiresAt: invitations.expiresAt,
          createdBy: invitations.createdBy
        })
        .from(invitations)
        .innerJoin(roles, sql`${invitations.roleId} = ${roles.id}`)
        .where(sql`${invitations.tokenHash} = ${hashToken(parsed.data.token)} and ${invitations.deletedAt} is null`)
        .limit(1);

      if (!invitation) {
        throw new Error("not_found");
      }

      const unavailableReason = getInvitationUnavailableReason(invitation, now);

      if (unavailableReason) {
        throw new Error(unavailableReason);
      }

      let acceptedUserId = currentUser?.id;

      if (currentUser && currentUser.emailNormalized !== invitation.email) {
        throw new Error("email_mismatch");
      }

      if (!currentUser) {
        if (!parsed.data.name || !parsed.data.password) {
          throw new Error("invalid");
        }

        const [createdUser] = await tx
          .insert(users)
          .values({
            email: invitation.email,
            emailNormalized: invitation.email,
            passwordHash: await hashPassword(parsed.data.password),
            name: parsed.data.name
          })
          .onConflictDoNothing()
          .returning({ id: users.id });

        if (!createdUser) {
          throw new Error("login_required");
        }

        acceptedUserId = createdUser.id;

        const [device] = await tx
          .insert(devices)
          .values({
            userId: createdUser.id,
            label: userAgent?.slice(0, 160),
            lastSeenAt: now
          })
          .returning({ id: devices.id });

        await tx.insert(sessions).values({
          userId: createdUser.id,
          deviceId: device.id,
          tokenHash: hashToken(sessionToken ?? ""),
          expiresAt: sessionExpiresAt ?? getSessionExpiry(now, true),
          lastSeenAt: now,
          userAgent
        });
      }

      if (!acceptedUserId) {
        throw new Error("server");
      }

      const [existingMember] = await tx
        .select({ id: workspaceMembers.id })
        .from(workspaceMembers)
        .where(
          sql`${workspaceMembers.workspaceId} = ${invitation.workspaceId}
            and ${workspaceMembers.userId} = ${acceptedUserId}
            and ${workspaceMembers.deletedAt} is null`
        )
        .limit(1);

      if (existingMember) {
        throw new Error("already_member");
      }

      const [member] = await tx
        .insert(workspaceMembers)
        .values({
          workspaceId: invitation.workspaceId,
          userId: acceptedUserId,
          roleId: invitation.roleId,
          status: invitation.requiresApproval ? "invited" : "active",
          joinedAt: invitation.requiresApproval ? null : now,
          invitedBy: invitation.createdBy,
          teamScopeMode: invitation.teamScopeMode,
          playerScopeMode: invitation.playerScopeMode,
          createdBy: acceptedUserId,
          updatedBy: acceptedUserId
        })
        .returning({ id: workspaceMembers.id });

      await tx
        .update(invitations)
        .set({
          usageCount: invitation.usageCount + 1,
          acceptedAt: now,
          acceptedBy: acceptedUserId,
          updatedBy: acceptedUserId,
          updatedAt: now
        })
        .where(sql`${invitations.id} = ${invitation.id}`);

      await tx.insert(activityLogs).values({
        workspaceId: invitation.workspaceId,
        actorUserId: acceptedUserId,
        actorMemberId: member.id,
        action: "invitation.accepted",
        entityType: "invitation",
        entityId: invitation.id,
        after: {
          memberId: member.id,
          role: invitation.role,
          status: invitation.requiresApproval ? "invited" : "active"
        },
        userAgent
      });

      landingPath = getInvitationLandingPath(invitation.role);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "server";

    if (
      [
        "not_found",
        "expired",
        "revoked",
        "used",
        "login_required",
        "email_mismatch",
        "already_member",
        "invalid"
      ].includes(message)
    ) {
      return { ok: false as const, error: message as InvitationError };
    }

    console.error("[invitations]", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : "Unknown invitation acceptance error."
    });

    return { ok: false as const, error: "server" as InvitationError };
  }

  if (sessionToken && sessionExpiresAt) {
    return { ok: true as const, token: sessionToken, expiresAt: sessionExpiresAt, returnTo: landingPath };
  }

  return { ok: true as const, returnTo: landingPath };
}
