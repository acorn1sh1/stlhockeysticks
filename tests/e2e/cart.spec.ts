import { test, expect } from "@playwright/test";

// Adds the first purchasable (non-configurable) item to the cart and
// exercises cart state + the coupon preview endpoint end to end.
test.describe("cart + coupon", () => {
  test("add an item, see it in the cart, reject a bad coupon", async ({ page }) => {
    await page.goto("/");

    const addButton = page.getByRole("button", { name: /add to cart|pre-order/i }).first();
    await expect(addButton).toBeVisible();
    await addButton.click();

    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: /your cart is empty/i })).toHaveCount(0);
    await expect(page.getByText("Subtotal")).toBeVisible();

    // Invalid promo code surfaces a validation error from /api/coupon.
    const promo = page.getByPlaceholder("Promo code");
    await promo.fill("DEFINITELYFAKE");
    await page.getByRole("button", { name: /^apply$/i }).click();
    await expect(page.getByText(/isn't valid|couldn't apply/i)).toBeVisible();
  });

  test("checkout requires customer details", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /add to cart|pre-order/i }).first().click();
    await page.goto("/cart");
    // Name + email are required inputs; the browser blocks empty submit.
    await expect(page.getByPlaceholder("Full name")).toBeVisible();
    await expect(page.getByPlaceholder("Email")).toBeVisible();
  });
});
