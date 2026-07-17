import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const marketingPages = [
  "features",
  "how-it-works",
  "pricing",
  "about",
  "contact",
  "privacy",
  "terms",
  "security"
];

describe("marketing website scaffold", () => {
  it("has all Stage 8 marketing routes", () => {
    for (const page of marketingPages) {
      expect(existsSync(join(process.cwd(), "apps/web/src/app", page, "page.tsx"))).toBe(true);
    }
  });

  it("keeps the generated hero asset inside the workspace", () => {
    expect(
      existsSync(join(process.cwd(), "apps/web/public/marketing/coach-performance-hero.png"))
    ).toBe(true);
  });
});
