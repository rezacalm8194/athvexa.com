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
