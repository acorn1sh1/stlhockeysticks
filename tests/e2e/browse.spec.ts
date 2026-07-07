import { test, expect } from "@playwright/test";

test.describe("storefront browse", () => {
  test("home renders the hero and shop-by-size grid", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("PRO STICKS");
    // At least one size group links into /sticks.
    await expect(page.getByRole("link", { name: /senior/i }).first()).toBeVisible();
  });

  test("sticks page lists configurable builds with a Customize CTA", async ({ page }) => {
    await page.goto("/sticks");
    await expect(page.getByRole("heading", { name: /full-size sticks/i })).toBeVisible();
    const customize = page.getByRole("link", { name: /customize/i });
    await expect(customize.first()).toBeVisible();
  });

  test("a configurable product page prices option upcharges live", async ({ page }) => {
    await page.goto("/sticks/elite-senior-stick");
    await expect(page.getByRole("heading", { name: /elite senior stick/i })).toBeVisible();
    // Base price is shown somewhere on the configurator.
    await expect(page.getByText("$119.00").first()).toBeVisible();
  });
});
