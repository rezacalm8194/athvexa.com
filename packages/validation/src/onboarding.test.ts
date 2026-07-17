import { describe, expect, it } from "vitest";
import { workspaceOnboardingSchema } from "./index";

describe("workspace onboarding validation", () => {
  it("validates the full coach onboarding payload", () => {
    const parsed = workspaceOnboardingSchema.parse({
      workspaceName: "North Academy",
      country: "ir",
      timezone: "Asia/Tehran",
      locale: "fa",
      calendar: "persian",
      hourFormat: "24",
      activityType: "academy",
      approxPlayerCount: "42",
      firstTeamName: "U17"
    });

    expect(parsed).toMatchObject({
      workspaceName: "North Academy",
      country: "IR",
      timezone: "Asia/Tehran",
      locale: "fa",
      calendar: "persian",
      hourFormat: "24",
      activityType: "academy",
      approxPlayerCount: 42,
      firstTeamName: "U17",
      skippedSteps: []
    });
  });

  it("allows optional onboarding steps to be skipped", () => {
    const parsed = workspaceOnboardingSchema.parse({
      workspaceName: "Solo Coach",
      country: "",
      timezone: "UTC",
      locale: "en",
      calendar: "gregorian",
      hourFormat: "12",
      activityType: "individual_coach",
      approxPlayerCount: "",
      firstTeamName: "",
      skippedSteps: ["country", "firstTeam"]
    });

    expect(parsed.country).toBeUndefined();
    expect(parsed.approxPlayerCount).toBeUndefined();
    expect(parsed.firstTeamName).toBeUndefined();
    expect(parsed.skippedSteps).toEqual(["country", "firstTeam"]);
  });

  it("rejects invalid timezone and enum values", () => {
    expect(() =>
      workspaceOnboardingSchema.parse({
        workspaceName: "Bad Setup",
        timezone: "Mars/Base",
        locale: "de",
        calendar: "gregorian",
        hourFormat: "24",
        activityType: "academy"
      })
    ).toThrow();
  });
});
