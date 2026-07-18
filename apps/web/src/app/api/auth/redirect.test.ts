import { afterEach, describe, expect, it, vi } from "vitest";
import { authRedirectTestExports } from "./redirect";

describe("auth redirects", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps production hosts unchanged", () => {
    const request = new Request("https://athvexa.com/api/auth/login");

    expect(
      authRedirectTestExports.getRedirectUrl(request, "/login?error=server").toString()
    ).toBe(
      "https://athvexa.com/login?error=server"
    );
  });

  it("normalizes 0.0.0.0 local redirects to localhost", () => {
    const request = new Request("http://0.0.0.0:3001/api/auth/login");

    expect(authRedirectTestExports.getRedirectUrl(request, "/login?error=server").toString()).toBe(
      "http://localhost:3001/login?error=server"
    );
  });

  it("falls back to the configured production app URL instead of the request host", () => {
    const request = new Request("http://0.0.0.0:3001/api/auth/login");

    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://athvexa.com");

    expect(authRedirectTestExports.getRedirectUrl(request, "/login?error=server").toString()).toBe(
      "https://athvexa.com/login?error=server"
    );
  });
});
