import { describe, expect, it } from "vitest";
import {
  getInvitationErrorMessage,
  getInvitationLandingPath,
  getInvitationUnavailableReason
} from "./coach-invitations";

describe("invitation flow helpers", () => {
  it("classifies invitations that cannot be accepted", () => {
    const now = new Date("2026-07-18T10:00:00.000Z");

    expect(
      getInvitationUnavailableReason({
        revokedAt: new Date("2026-07-18T09:00:00.000Z"),
        expiresAt: new Date("2026-07-19T10:00:00.000Z"),
        usageCount: 0,
        usageLimit: 1
      }, now)
    ).toBe("revoked");

    expect(
      getInvitationUnavailableReason({
        revokedAt: null,
        expiresAt: now,
        usageCount: 0,
        usageLimit: 1
      }, now)
    ).toBe("expired");

    expect(
      getInvitationUnavailableReason({
        revokedAt: null,
        expiresAt: new Date("2026-07-19T10:00:00.000Z"),
        usageCount: 1,
        usageLimit: 1
      }, now)
    ).toBe("used");
  });

  it("keeps invitation errors allowlisted and role landing internal", () => {
    expect(getInvitationErrorMessage("email_mismatch")).toContain("different email");
    expect(getInvitationErrorMessage("surprise")).toBeUndefined();
    expect(getInvitationLandingPath("coach")).toBe("/coach");
    expect(getInvitationLandingPath("assistant")).toBe("/coach");
    expect(getInvitationLandingPath("player")).toBe("/coach");
  });
});
