import { describe, expect, it } from "vitest";
import { loginSchema, passwordSchema, safePathSchema, signupSchema } from "./index";

describe("auth validation schemas", () => {
  it("normalizes emails and validates signup", () => {
    const parsed = signupSchema.parse({
      name: "Coach",
      email: "COACH@EXAMPLE.COM",
      password: "StrongPass123",
      workspaceName: "Academy"
    });

    expect(parsed.email).toBe("coach@example.com");
  });

  it("rejects weak passwords", () => {
    expect(() => passwordSchema.parse("weak")).toThrow();
  });

  it("keeps return paths local", () => {
    expect(safePathSchema.parse("/sessions")).toBe("/sessions");
    expect(safePathSchema.parse("https://example.com")).toBe("/onboarding");
  });

  it("validates login input without revealing account existence", () => {
    const parsed = loginSchema.parse({
      email: "USER@EXAMPLE.COM",
      password: "anything",
      rememberMe: true
    });

    expect(parsed).toMatchObject({
      email: "user@example.com",
      rememberMe: true,
      returnTo: "/onboarding"
    });
  });
});
