import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export type Role = "COACH" | "ASSISTANT" | "PLAYER";

export type SessionPayload = {
  sub: string;
  role: Role;
  name: string;
};

export function parseRole(role: string): Role | null {
  if (role === "COACH" || role === "ASSISTANT" || role === "PLAYER") {
    return role;
  }
  return null;
}

export const SESSION_COOKIE = "athvexa_session";
export const MIN_JWT_SECRET_LENGTH = 32;

const PLACEHOLDER_SECRETS = new Set([
  "replace-with-at-least-32-random-characters",
  "changeme",
  "secret",
]);

function stripQuotes(value: string) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function readJwtSecret() {
  // Dynamic lookup so Edge middleware is not stuck with a build-time empty secret.
  const env = process.env as Record<string, string | undefined>;
  const value = stripQuotes(env["JWT_SECRET"] ?? env["AUTH_SECRET"] ?? "");
  if (!value || PLACEHOLDER_SECRETS.has(value) || value.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
      "JWT_SECRET is missing or too short. Set a random secret of at least 32 characters (see .env.example)."
    );
  }
  return value;
}

export function getJwtSecretKey() {
  return new TextEncoder().encode(readJwtSecret());
}

function cookieDomain() {
  const explicit = process.env.AUTH_COOKIE_DOMAIN?.trim();
  if (explicit) return explicit;
  if (process.env.NODE_ENV !== "production") return undefined;
  try {
    const host = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://app.athvexa.com").hostname.toLowerCase();
    if (host === "athvexa.com" || host.endsWith(".athvexa.com")) return ".athvexa.com";
  } catch {
    return undefined;
  }
  return undefined;
}

export function sessionCookieOptions(maxAgeSeconds: number) {
  const domain = cookieDomain();
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
    ...(domain ? { domain } : {}),
  };
}

export function expiredSessionCookieOptions() {
  const domain = cookieDomain();
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    ...(domain ? { domain } : {}),
  };
}

export async function signSession(payload: SessionPayload, remember: boolean) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(remember ? "30d" : "1d")
    .sign(getJwtSecretKey());
}

function sessionFromPayload(payload: JWTPayload): SessionPayload | null {
  if (typeof payload.sub !== "string" || !payload.sub) return null;
  const role = typeof payload.role === "string" ? parseRole(payload.role) : null;
  if (!role) return null;
  const name = typeof payload.name === "string" ? payload.name : "";
  return { sub: payload.sub, role, name };
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    return sessionFromPayload(payload);
  } catch {
    return null;
  }
}
