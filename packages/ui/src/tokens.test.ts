import { describe, expect, it } from "vitest";
import { designTokens, directions, themes } from "./tokens";

describe("design tokens", () => {
  it("defines the required theme and direction options", () => {
    expect(themes).toEqual(["dark", "light", "system"]);
    expect(directions).toEqual(["ltr", "rtl"]);
  });

  it("exposes component token references as CSS variables", () => {
    expect(designTokens.radius.card).toBe("var(--radius-card)");
    expect(designTokens.space[4]).toBe("var(--space-4)");
  });
});
