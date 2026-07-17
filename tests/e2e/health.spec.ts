import { expect, test } from "@playwright/test";

test("health page opens", async ({ page }) => {
  await page.goto("/health");
  await expect(page.getByTestId("health-page")).toContainText("OK");
});
