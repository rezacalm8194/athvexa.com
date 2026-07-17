import { describe, expect, it } from "vitest";
import { createTranslator, getDirection, resolveLocale } from "./index";

describe("i18n infrastructure", () => {
  it("resolves locale by user, workspace, browser, then English fallback", () => {
    expect(resolveLocale({ userLocale: "fa", workspaceLocale: "ar", browserLocale: "en-US" })).toBe(
      "fa"
    );
    expect(resolveLocale({ workspaceLocale: "ar", browserLocale: "en-US" })).toBe("ar");
    expect(resolveLocale({ browserLocale: "en-US" })).toBe("en");
    expect(resolveLocale({ browserLocale: "de-DE" })).toBe("en");
  });

  it("maps English to LTR and Persian/Arabic to RTL", () => {
    expect(getDirection("en")).toBe("ltr");
    expect(getDirection("fa")).toBe("rtl");
    expect(getDirection("ar")).toBe("rtl");
  });

  it("returns translated strings by key", () => {
    expect(createTranslator("fa")("calendar.persian")).toBe("شمسی");
    expect(createTranslator("ar")("theme.dark")).toBe("داكن");
  });
});
