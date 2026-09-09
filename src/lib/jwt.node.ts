import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { parseRole, type SessionPayload } from "./jwt";
import { loadNodeJwtSecret } from "./jwtSecret.node";

function secretKey() {
  return new TextEncoder().encode(loadNodeJwtSecret());
}

export async function signSession(payload: SessionPayload, remember: boolean) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(remember ? "30d" : "1d")
    .sign(secretKey());
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
    const { payload } = await jwtVerify(token, secretKey());
    return sessionFromPayload(payload);
  } catch {
    return null;
  }
}
