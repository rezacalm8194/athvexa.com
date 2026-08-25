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

export function getJwtSecretKey() {
  const value = process.env.JWT_SECRET?.trim();
  if (!value || value.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
      "JWT_SECRET is missing or too short. Set a random secret of at least 32 characters (see .env.example)."
    );
  }
  return new TextEncoder().encode(value);
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
