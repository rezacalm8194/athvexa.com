import { createHash, randomBytes } from "node:crypto";

export const sessionTokenByteLength = 32;
export const defaultSessionDays = 7;
export const rememberMeSessionDays = 30;

export function createSessionToken(): string {
  return randomBytes(sessionTokenByteLength).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

export function getSessionExpiry(now: Date, rememberMe = false): Date {
  const days = rememberMe ? rememberMeSessionDays : defaultSessionDays;
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

export function createPasswordResetToken(): string {
  return randomBytes(32).toString("base64url");
}

export function getPasswordResetExpiry(now: Date): Date {
  return new Date(now.getTime() + 60 * 60 * 1000);
}
