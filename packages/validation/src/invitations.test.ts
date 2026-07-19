import { describe, expect, it } from "vitest";
import { acceptInvitationSchema, createInvitationSchema, revokeInvitationSchema } from "./index";

describe("invitation validation", () => {
  it("normalizes email and validates coach invitations", () => {
    const parsed = createInvitationSchema.parse({
      email: "COACH@EXAMPLE.COM",
      role: "coach",
      expiresInDays: "14",
      usageLimit: "3",
      requiresApproval: false,
      teamScopeMode: "assigned",
      playerScopeMode: "assigned"
    });

    expect(parsed).toMatchObject({
      email: "coach@example.com",
      role: "coach",
      expiresInDays: 14,
      usageLimit: 3
    });
  });

  it("keeps player invitations single-use", () => {
    expect(() =>
      createInvitationSchema.parse({
        email: "player@example.com",
        role: "player",
        usageLimit: 2
      })
    ).toThrow();
  });

  it("prevents assistant invitations from defaulting to all-team access", () => {
    expect(() =>
      createInvitationSchema.parse({
        email: "assistant@example.com",
        role: "assistant",
        teamScopeMode: "all"
      })
    ).toThrow();
  });

  it("validates invitation acceptance payloads", () => {
    const parsed = acceptInvitationSchema.parse({
      token: "a".repeat(64),
      name: "Invited Coach",
      password: "StrongPass123"
    });

    expect(parsed.name).toBe("Invited Coach");
  });

  it("validates invitation revocation payloads", () => {
    const parsed = revokeInvitationSchema.parse({
      invitationId: "11111111-1111-4111-8111-111111111111"
    });

    expect(parsed.invitationId).toBe("11111111-1111-4111-8111-111111111111");
  });
});
