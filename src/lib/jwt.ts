import fs from "node:fs";
import path from "node:path";
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

function secretFromEnvFile(filePath: string) {
  try {
    const text = fs.readFileSync(filePath, "utf8");
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const match = line.match(/^(?:export\s+)?JWT_SECRET\s*=\s*(.*)$/);
      if (!match) continue;
      return stripQuotes(match[1]);
    }
  } catch {
    return null;
  }
  return null;
}

function readJwtSecret() {
  const fromEnv = stripQuotes(process.env.JWT_SECRET ?? process.env.AUTH_SECRET ?? "");
  const fromFiles = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), ".env.production"),
    path.resolve(process.cwd(), ".env.local"),
  ]
    .map(secretFromEnvFile)
    .find((value) => value);

  const value = fromEnv || fromFiles || "";
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

export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export function expiredSessionCookieOptions() {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
    expires: new Date(0),
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
