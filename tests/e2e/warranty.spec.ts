import { test, expect } from "@playwright/test";

test.describe("warranty claim", () => {
  test("page explains the 30-day policy and shows the form", async ({ page }) => {
    await page.goto("/warranty");
    await expect(page.getByRole("heading", { name: /broke a stick/i })).toBeVisible();
    await expect(page.getByText(/30 days/i).first()).toBeVisible();
    await expect(page.locator("#orderId")).toBeVisible();
  });

  test("blocks submit with no photo attached", async ({ page }) => {
    await page.goto("/warranty");
    await page.locator("#orderId").fill("order_test");
    await page.locator("#email").fill("buyer@example.com");
    await page.locator("#name").fill("Buyer One");
    await page.locator("#productName").fill("Elite Senior Stick");
    await page.locator("#description").fill("Blade cracked after a week of use.");
    await page.getByRole("button", { name: /submit|file claim|send/i }).click();
    await expect(page.getByText(/at least one photo/i)).toBeVisible();
  });
});
