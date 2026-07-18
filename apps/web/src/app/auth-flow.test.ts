import { describe, expect, it } from "vitest";
import { createWorkspaceSlug, formBoolean, formString, getAuthErrorMessage } from "./auth-flow";

describe("auth form flow helpers", () => {
  it("reads string and checkbox form values safely", () => {
    const formData = new FormData();
    formData.set("email", "coach@example.com");
    formData.set("rememberMe", "on");
    formData.set("avatar", new File([""], "avatar.png"));

    expect(formString(formData, "email")).toBe("coach@example.com");
    expect(formString(formData, "avatar")).toBeUndefined();
    expect(formBoolean(formData, "rememberMe")).toBe(true);
    expect(formBoolean(formData, "missing")).toBe(false);
  });

  it("maps only known auth errors to user-facing text", () => {
    expect(getAuthErrorMessage("login_failed")).toContain("password");
    expect(getAuthErrorMessage(["invalid"])).toContain("fields");
    expect(getAuthErrorMessage("unexpected")).toBeUndefined();
  });

  it("creates bounded workspace slugs with a fallback for non-latin names", () => {
    expect(createWorkspaceSlug("Elite Academy")).toMatch(/^elite-academy-[a-f0-9]{8}$/);
    expect(createWorkspaceSlug("آکادمی فوتبال")).toMatch(/^workspace-[a-f0-9]{8}$/);
    expect(createWorkspaceSlug("a".repeat(200))).toHaveLength(89);
  });
});
