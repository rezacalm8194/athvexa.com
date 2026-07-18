import { describe, expect, it } from "vitest";
import {
  buildAbsoluteUrl,
  buildSafeRedirectUrl,
  getPublicAppUrl,
  getPublicMarketingUrl,
  getRequestBaseUrl,
  getSafeInternalPath,
  isAllowedBrowserOrigin,
  normalizePublicUrl
} from "./index";

describe("public URL configuration", () => {
  it("uses the configured HTTPS production origin", () => {
    const env = {
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_URL: "https://athvexa.com/",
      NEXT_PUBLIC_MARKETING_URL: "https://athvexa.com/"
    };

    expect(getPublicAppUrl(env)).toBe("https://athvexa.com");
    expect(getPublicMarketingUrl(env)).toBe("https://athvexa.com");
    expect(buildAbsoluteUrl(getPublicAppUrl(env), "/login")).toBe("https://athvexa.com/login");
  });

  it("normalizes invalid bind hosts to localhost only outside production", () => {
    expect(
      getRequestBaseUrl("http://0.0.0.0:3001/api/auth/login", {
        NODE_ENV: "development"
      })
    ).toBe("http://localhost:3001");
    expect(
      getRequestBaseUrl("http://[::]:3001/api/auth/login", {
        NODE_ENV: "test"
      })
    ).toBe("http://localhost:3001");
  });

  it("does not use browser-invalid bind hosts in production redirects", () => {
    const env = {
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_URL: "https://athvexa.com"
    };

    expect(buildSafeRedirectUrl("http://0.0.0.0:3001/api/auth/login", "/login", env).toString()).toBe(
      "https://athvexa.com/login"
    );
    expect(normalizePublicUrl("http://0.0.0.0:3001", "https://athvexa.com", "production")).toBe(
      "https://athvexa.com"
    );
  });

  it("prefers a configured non-local canonical app URL over an internal proxy URL", () => {
    const env = {
      NODE_ENV: "development",
      NEXT_PUBLIC_APP_URL: "https://athvexa.com"
    };

    expect(buildSafeRedirectUrl("http://localhost:3001/api/auth/login", "/login?error=server", env).toString()).toBe(
      "https://athvexa.com/login?error=server"
    );
  });

  it("uses an allowlisted forwarded host when env still contains local development URLs", () => {
    const env = {
      NODE_ENV: "development",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000"
    };
    const headers = new Headers({
      "x-forwarded-host": "athvexa.com",
      "x-forwarded-proto": "https"
    });

    expect(
      buildSafeRedirectUrl(
        "http://localhost:3001/api/auth/login",
        "/login?error=server",
        env,
        headers
      ).toString()
    ).toBe("https://athvexa.com/login?error=server");
  });

  it("does not trust unallowlisted forwarded hosts for redirects", () => {
    const env = {
      NODE_ENV: "development",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000"
    };
    const headers = new Headers({
      "x-forwarded-host": "evil.example",
      "x-forwarded-proto": "https"
    });

    expect(
      buildSafeRedirectUrl("http://localhost:3001/api/auth/login", "/login", env, headers).toString()
    ).toBe("http://localhost:3001/login");
  });

  it("uses an allowlisted HTTPS referer when forwarded host is internal", () => {
    const env = {
      NODE_ENV: "development",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000"
    };
    const headers = new Headers({
      host: "localhost:3001",
      referer: "https://athvexa.com/login"
    });

    expect(
      buildSafeRedirectUrl(
        "http://localhost:3001/api/auth/login",
        "/login?error=server",
        env,
        headers
      ).toString()
    ).toBe("https://athvexa.com/login?error=server");
  });

  it("prevents open redirects and preserves valid internal callback paths", () => {
    expect(getSafeInternalPath("/coach?tab=members")).toBe("/coach?tab=members");
    expect(getSafeInternalPath("https://evil.example/coach")).toBe("/onboarding");
    expect(getSafeInternalPath("//evil.example/coach")).toBe("/onboarding");
    expect(buildSafeRedirectUrl("https://athvexa.com/api/auth/login", "//evil.example").toString()).toBe(
      "https://athvexa.com/onboarding"
    );
  });

  it("normalizes trailing slashes and rejects external origins", () => {
    const env = {
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_URL: "https://athvexa.com/",
      NEXT_PUBLIC_MARKETING_URL: "https://athvexa.com/"
    };

    expect(getPublicAppUrl(env)).toBe("https://athvexa.com");
    expect(isAllowedBrowserOrigin("https://athvexa.com", env)).toBe(true);
    expect(isAllowedBrowserOrigin("https://evil.example", env)).toBe(false);
    expect(isAllowedBrowserOrigin("http://athvexa.com", env)).toBe(false);
  });
});
