import bcrypt from "bcryptjs";

export type { Role, SessionPayload } from "./jwt";
export {
  expiredSessionCookieOptions,
  parseRole,
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
  verifySession,
} from "./jwt";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
