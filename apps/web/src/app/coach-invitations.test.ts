import { describe, expect, it } from "vitest";
import {
  createInvitationEmailSlug,
  createReadableInvitationPath,
  getInvitationBadgeTone,
  getInvitationErrorMessage,
  getInvitationLandingPath,
  getInvitationQueueStatus,
  getInvitationUnavailableReason
} from "./coach-invitations";

describe("invitation flow helpers", () => {
  it("creates readable invitation paths without trusting email as the secret", () => {
    const path = createReadableInvitationPath("player", "Player.Name@example.com", "token_123");

    expect(createInvitationEmailSlug("Player.Name@example.com")).toBe("player.name-at-example.com");
    expect(path).toBe("/invite/link/player/player.name-at-example.com/token_123");
  });

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
    expect(getInvitationErrorMessage("invalid_player_usage")).toContain("usage limit 1");
    expect(getInvitationErrorMessage("invalid_assistant_scope")).toContain("all-team access");
    expect(getInvitationErrorMessage("email_mismatch")).toContain("different email");
    expect(getInvitationErrorMessage("already_revoked")).toContain("already revoked");
    expect(getInvitationErrorMessage("surprise")).toBeUndefined();
    expect(getInvitationLandingPath("coach")).toBe("/coach");
    expect(getInvitationLandingPath("assistant")).toBe("/coach");
    expect(getInvitationLandingPath("player")).toBe("/coach");
  });

  it("labels invitation queue status for owners", () => {
    const now = new Date("2026-07-18T10:00:00.000Z");
    const base = {
      revokedAt: null,
      acceptedAt: null,
      expiresAt: new Date("2026-07-19T10:00:00.000Z"),
      usageCount: 0,
      usageLimit: 1
    };

    expect(getInvitationQueueStatus({ ...base, requiresApproval: false }, now)).toBe("Pending");
    expect(getInvitationQueueStatus({ ...base, requiresApproval: true }, now)).toBe("Needs approval");
    expect(getInvitationBadgeTone("Accepted")).toBe("success");
    expect(getInvitationBadgeTone("Expired")).toBe("danger");
  });
});
