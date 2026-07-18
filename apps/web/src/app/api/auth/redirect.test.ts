import { describe, expect, it } from "vitest";
import { authRedirectTestExports } from "./redirect";

describe("auth redirects", () => {
  it("keeps production hosts unchanged", () => {
    const request = new Request("https://athvexa.com/api/auth/login");

    expect(authRedirectTestExports.getRedirectUrl(request, "/login?error=server").toString()).toBe(
      "https://athvexa.com/login?error=server"
    );
  });

  it("normalizes 0.0.0.0 local redirects to localhost", () => {
    const request = new Request("http://0.0.0.0:3001/api/auth/login");

    expect(authRedirectTestExports.getRedirectUrl(request, "/login?error=server").toString()).toBe(
      "http://localhost:3001/login?error=server"
    );
  });
});
