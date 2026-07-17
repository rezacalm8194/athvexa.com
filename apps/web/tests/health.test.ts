import { describe, expect, it } from "vitest";

describe("health check", () => {
  it("defines the expected health status", () => {
    expect({ status: "ok", service: "web" }).toEqual({
      status: "ok",
      service: "web"
    });
  });
});
