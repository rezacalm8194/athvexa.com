import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

export type SessionPayload = {
  sub: string; // user id
  role: Role;
  name: string;
};

export type Role = "COACH" | "ASSISTANT" | "PLAYER";

export function parseRole(role: string): Role | null {
  if (role === "COACH" || role === "ASSISTANT" || role === "PLAYER") {
    return role;
  }
  return null;
}

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET);

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

// `remember` controls token lifetime: 30 days ("remember me") vs 1 day session.
export async function signSession(payload: SessionPayload, remember: boolean) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(remember ? "30d" : "1d")
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = "athvexa_session";

export function sessionCookieDomain() {
  if (process.env.SESSION_COOKIE_DOMAIN) return process.env.SESSION_COOKIE_DOMAIN;
  if (process.env.NODE_ENV === "production") return ".athvexa.com";
  return undefined;
}

export function appBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://app.athvexa.com";
}

export function marketingBaseUrl() {
  return process.env.NEXT_PUBLIC_MARKETING_URL ?? "https://athvexa.com";
}

export function dashboardPathForRole(role: Role) {
  return role === "PLAYER" ? "/dashboard/player" : "/dashboard/coach";
}

export function dashboardUrlForRole(role: Role) {
  return `${appBaseUrl()}${dashboardPathForRole(role)}`;
}
