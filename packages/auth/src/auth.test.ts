import { describe, expect, it } from "vitest";
import { buildExpiredSessionCookie, buildSessionCookie, sessionCookieName } from "./cookies";
import { hashPassword, verifyPassword } from "./password";
import { MemoryRateLimiter } from "./rate-limit";
import { getSafeReturnPath } from "./redirect";
import {
  createPasswordResetToken,
  createSessionToken,
  getPasswordResetExpiry,
  getSessionExpiry,
  hashToken
} from "./session";

describe("auth security primitives", () => {
  it("hashes and verifies passwords without storing plaintext", async () => {
    const hash = await hashPassword("StrongPass123");

    expect(hash).not.toContain("StrongPass123");
    await expect(verifyPassword("StrongPass123", hash)).resolves.toBe(true);
    await expect(verifyPassword("WrongPass123", hash)).resolves.toBe(false);
  });

  it("creates opaque tokens and hashes them for storage", () => {
    const token = createSessionToken();
    const tokenHash = hashToken(token);

    expect(token).not.toBe(tokenHash);
    expect(tokenHash).toBe(hashToken(token));
    expect(createPasswordResetToken()).toHaveLength(43);
  });

  it("builds HttpOnly SameSite cookies and supports Secure production flag", () => {
    const cookie = buildSessionCookie("token", {
      expires: new Date("2026-07-17T00:00:00.000Z"),
      secure: true
    });

    expect(cookie).toContain(`${sessionCookieName}=token`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Secure");
    expect(buildExpiredSessionCookie(false)).toContain("Expires=Thu, 01 Jan 1970");
  });

  it("calculates session and reset expiries", () => {
    const now = new Date("2026-07-17T00:00:00.000Z");

    expect(getSessionExpiry(now).getUTCDate()).toBe(24);
    expect(getSessionExpiry(now, true).getUTCMonth()).toBe(7);
    expect(getPasswordResetExpiry(now).getUTCHours()).toBe(1);
  });

  it("blocks unsafe return paths", () => {
    expect(getSafeReturnPath("/sessions")).toBe("/sessions");
    expect(getSafeReturnPath("/coach?tab=members")).toBe("/coach?tab=members");
    expect(getSafeReturnPath("https://evil.example")).toBe("/onboarding");
    expect(getSafeReturnPath("//evil.example")).toBe("/onboarding");
  });

  it("locks repeated failures and clears on success", () => {
    const limiter = new MemoryRateLimiter({ windowMs: 1000, maxAttempts: 2, lockMs: 1000 });

    expect(limiter.check("email", 0).allowed).toBe(true);
    limiter.recordFailure("email", 0);
    limiter.recordFailure("email", 1);
    expect(limiter.check("email", 2).allowed).toBe(false);
    limiter.recordSuccess("email");
    expect(limiter.check("email", 3).allowed).toBe(true);
  });
});
