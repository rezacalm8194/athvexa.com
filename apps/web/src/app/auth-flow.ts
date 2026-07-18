import { createHash, randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import {
  activityLogs,
  devices,
  loginAttempts,
  permissions,
  roles,
  sessions,
  users,
  workspaces,
  workspaceMembers
} from "@fpp/database";
import { createSessionToken, getSessionExpiry, hashPassword, hashToken, verifyPassword } from "@fpp/auth";
import { loginSchema, signupSchema } from "@fpp/validation";
import { getDatabase } from "./auth-db";

type AuthDatabase = ReturnType<typeof getDatabase>;
type AuthTransaction = Parameters<Parameters<AuthDatabase["transaction"]>[0]>[0];
type AuthFlowName = "login" | "signup";

function getErrorDetail(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message
    };
  }

  return {
    name: "UnknownError",
    message: "Unknown authentication error."
  };
}

function getDatabaseErrorCode(error: unknown) {
  if (typeof error === "object" && error && "code" in error) {
    const code = (error as { code?: unknown }).code;

    return typeof code === "string" ? code : undefined;
  }

  return undefined;
}

function logAuthError(flow: AuthFlowName, stage: string, error: unknown) {
  const detail = getErrorDetail(error);

  console.error("[auth]", {
    flow,
    stage,
    errorName: detail.name,
    errorMessage: detail.message,
    databaseCode: getDatabaseErrorCode(error)
  });
}

export function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

export function formBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

export function createWorkspaceSlug(name: string) {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const base = normalized || "workspace";
  const suffix = randomBytes(4).toString("hex");

  return `${base}-${suffix}`;
}

function hashHeaderValue(value: string | null) {
  return value ? createHash("sha256").update(value).digest("base64url") : null;
}

function getClientIp(headersList: Headers) {
  return (
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    null
  );
}

async function ensureOwnerRole(tx: AuthTransaction) {
  const [insertedRole] = await tx
    .insert(roles)
    .values({
      key: "owner",
      name: "Owner",
      description: "Workspace owner with full workspace administration.",
      isSystem: true
    })
    .onConflictDoNothing()
    .returning();
  const ownerRole =
    insertedRole ??
    (
      await tx
        .select()
        .from(roles)
        .where(sql`${roles.key} = 'owner' and ${roles.workspaceId} is null`)
        .limit(1)
    )[0];

  if (!ownerRole) {
    throw new Error("Owner role is required for signup.");
  }

  await tx
    .insert(permissions)
    .values([
      { roleId: ownerRole.id, resource: "workspace", action: "manage", scope: "workspace" },
      { roleId: ownerRole.id, resource: "members", action: "manage", scope: "workspace" }
    ])
    .onConflictDoNothing();

  return ownerRole;
}

export async function signupWithPassword(formData: FormData, headersList: Headers) {
  const parsed = signupSchema.safeParse({
    name: formString(formData, "name"),
    email: formString(formData, "email"),
    password: formString(formData, "password"),
    workspaceName: formString(formData, "workspaceName"),
    returnTo: formString(formData, "returnTo")
  });

  if (!parsed.success) {
    return { ok: false as const, error: "invalid" as const };
  }

  const now = new Date();
  const passwordHash = await hashPassword(parsed.data.password);
  const sessionToken = createSessionToken();
  const expiresAt = getSessionExpiry(now, true);
  const ipHash = hashHeaderValue(getClientIp(headersList));
  const userAgent = headersList.get("user-agent");

  let stage = "database_connect";

  try {
    const db = getDatabase();
    stage = "signup_transaction";
    await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          email: parsed.data.email,
          emailNormalized: parsed.data.email,
          passwordHash,
          name: parsed.data.name
        })
        .returning();

      const [workspace] = await tx
        .insert(workspaces)
        .values({
          name: parsed.data.workspaceName,
          slug: createWorkspaceSlug(parsed.data.workspaceName),
          createdBy: user.id,
          updatedBy: user.id
        })
        .returning();

      const ownerRole = await ensureOwnerRole(tx);
      const [member] = await tx
        .insert(workspaceMembers)
        .values({
          workspaceId: workspace.id,
          userId: user.id,
          roleId: ownerRole.id,
          status: "active",
          joinedAt: now,
          createdBy: user.id,
          updatedBy: user.id
        })
        .returning();

      const [device] = await tx
        .insert(devices)
        .values({
          userId: user.id,
          label: userAgent?.slice(0, 160),
          lastSeenAt: now
        })
        .returning();

      await tx.insert(sessions).values({
        userId: user.id,
        deviceId: device.id,
        tokenHash: hashToken(sessionToken),
        expiresAt,
        lastSeenAt: now,
        ipHash,
        userAgent
      });

      await tx.insert(activityLogs).values({
        workspaceId: workspace.id,
        actorUserId: user.id,
        actorMemberId: member.id,
        action: "signup.created",
        entityType: "workspace",
        entityId: workspace.id,
        after: {
          userId: user.id,
          workspaceId: workspace.id,
          memberId: member.id
        },
        ipHash,
        userAgent
      });
    });
  } catch (error) {
    logAuthError("signup", stage, error);

    return { ok: false as const, error: "signup_failed" as const };
  }

  return {
    ok: true as const,
    token: sessionToken,
    expiresAt,
    returnTo: parsed.data.returnTo
  };
}

export async function loginWithPassword(formData: FormData, headersList: Headers) {
  const parsed = loginSchema.safeParse({
    email: formString(formData, "email"),
    password: formString(formData, "password"),
    rememberMe: formBoolean(formData, "rememberMe"),
    returnTo: formString(formData, "returnTo")
  });

  if (!parsed.success) {
    return { ok: false as const, error: "invalid" as const };
  }

  const now = new Date();
  const ipHash = hashHeaderValue(getClientIp(headersList));
  const userAgent = headersList.get("user-agent");
  let stage = "database_connect";

  try {
    const db = getDatabase();

    stage = "user_lookup";
    const [user] = await db
      .select()
      .from(users)
      .where(
        sql`${users.emailNormalized} = ${parsed.data.email} and ${users.deletedAt} is null and ${users.status} = 'active'`
      )
      .limit(1);

    const passwordMatches = user
      ? await verifyPassword(parsed.data.password, user.passwordHash)
      : false;

    stage = "login_attempt_insert";
    await db.insert(loginAttempts).values({
      emailNormalized: parsed.data.email,
      userId: user?.id,
      ipHash,
      userAgent,
      success: passwordMatches,
      failureReason: passwordMatches ? null : "invalid_credentials"
    });

    if (!user || !passwordMatches) {
      return { ok: false as const, error: "login_failed" as const };
    }

    stage = "device_insert";
    const sessionToken = createSessionToken();
    const expiresAt = getSessionExpiry(now, parsed.data.rememberMe);
    const [device] = await db
      .insert(devices)
      .values({
        userId: user.id,
        label: userAgent?.slice(0, 160),
        lastSeenAt: now
      })
      .returning();

    stage = "session_insert";
    await db.insert(sessions).values({
      userId: user.id,
      deviceId: device.id,
      tokenHash: hashToken(sessionToken),
      expiresAt,
      lastSeenAt: now,
      ipHash,
      userAgent
    });

    return {
      ok: true as const,
      token: sessionToken,
      expiresAt,
      returnTo: parsed.data.returnTo
    };
  } catch (error) {
    logAuthError("login", stage, error);

    return { ok: false as const, error: "server" as const };
  }
}
