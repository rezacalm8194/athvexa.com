import { cookies } from "next/headers";
import { sql } from "drizzle-orm";
import { platformAdmins, platformSettings, sessions, users, workspaces } from "@fpp/database";
import { hashToken, sessionCookieName } from "@fpp/auth";
import { getDatabase } from "./auth-db";

export type PlatformAdminSession = {
  adminId: string;
  userId: string;
  email: string;
  name: string | null;
};

function getCookieValue(cookieHeader: string | null, name: string) {
  return cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export function normalizeAdminEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function getPlatformAdminByToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  const db = getDatabase();
  const [admin] = await db
    .select({
      adminId: platformAdmins.id,
      userId: users.id,
      email: users.email,
      name: users.name
    })
    .from(sessions)
    .innerJoin(users, sql`${sessions.userId} = ${users.id}`)
    .innerJoin(
      platformAdmins,
      sql`${platformAdmins.emailNormalized} = ${users.emailNormalized}
        and ${platformAdmins.revokedAt} is null
        and ${platformAdmins.deletedAt} is null`
    )
    .where(
      sql`${sessions.tokenHash} = ${hashToken(token)}
        and ${sessions.revokedAt} is null
        and ${sessions.expiresAt} > now()
        and ${users.deletedAt} is null
        and ${users.status} = 'active'`
    )
    .limit(1);

  return admin ?? null;
}

export async function getPlatformAdminFromCookies() {
  const cookieStore = await cookies();
  return getPlatformAdminByToken(cookieStore.get(sessionCookieName)?.value);
}

export async function getPlatformAdminFromRequest(request: Request) {
  return getPlatformAdminByToken(getCookieValue(request.headers.get("cookie"), sessionCookieName));
}

export async function listPlatformAdmins() {
  const db = getDatabase();

  return db
    .select({
      id: platformAdmins.id,
      email: platformAdmins.emailNormalized,
      userId: platformAdmins.userId,
      grantedBy: platformAdmins.grantedBy,
      createdAt: platformAdmins.createdAt
    })
    .from(platformAdmins)
    .where(sql`${platformAdmins.revokedAt} is null and ${platformAdmins.deletedAt} is null`)
    .orderBy(platformAdmins.createdAt);
}

export async function listPlatformUsers() {
  const db = getDatabase();

  return db
    .select({
      id: users.id,
      email: users.emailNormalized,
      name: users.name,
      status: users.status,
      createdAt: users.createdAt,
      deletedAt: users.deletedAt,
      workspaceCount: sql<number>`count(${workspaces.id})::int`
    })
    .from(users)
    .leftJoin(workspaces, sql`${workspaces.createdBy} = ${users.id} and ${workspaces.deletedAt} is null`)
    .groupBy(users.id)
    .orderBy(sql`${users.createdAt} desc`)
    .limit(50);
}

export async function getPlatformSetting(key: string, fallback: string) {
  const db = getDatabase();
  const [setting] = await db
    .select({ value: platformSettings.value })
    .from(platformSettings)
    .where(sql`${platformSettings.key} = ${key}`)
    .limit(1);

  return setting?.value ?? fallback;
}

export async function isPlatformAdminEmail(email: string) {
  const db = getDatabase();
  const [admin] = await db
    .select({ id: platformAdmins.id })
    .from(platformAdmins)
    .where(
      sql`${platformAdmins.emailNormalized} = ${normalizeAdminEmail(email)}
        and ${platformAdmins.revokedAt} is null
        and ${platformAdmins.deletedAt} is null`
    )
    .limit(1);

  return Boolean(admin);
}
