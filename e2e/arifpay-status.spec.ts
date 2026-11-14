import { expect, test } from "@playwright/test";

test("ArifPay is presented as coming soon without becoming a selectable payment method", async ({ page }) => {
  await page.route("**/api/menu-availability", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ soldOutItemIds: [] }) });
  });
  await page.route("**/api/payment-methods", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ methods: [
        { id: "cash", label: "Cash", payment_type: "cash" },
        { id: "manual-transfer", label: "Manual transfer", payment_type: "manual_transfer" },
      ] }),
    });
  });

  await page.goto("/");
  await expect(page.locator(".arifpay-teaser")).toContainText("ArifPay");
  await expect(page.locator(".arifpay-teaser")).toContainText("Cashless payments · coming soon");

  await page.locator(".fm__item").filter({ hasText: "Beyaynetu" }).getByRole("button", { name: "Add Beyaynetu to order" }).click();
  const drawer = page.getByRole("dialog");
  await drawer.getByRole("button", { name: /Continue to checkout/ }).click();
  await expect(drawer.getByLabel("Your name")).toBeVisible();

  const arifPayPanel = drawer.locator(".arifpay-panel");
  await expect(arifPayPanel.getByRole("heading", { name: "ArifPay" })).toBeVisible();
  await expect(arifPayPanel).toContainText("Coming soon");
  await expect(arifPayPanel).toContainText("merchant onboarding and API access are complete");
  await expect(arifPayPanel).toContainText("Not available to pay yet");
  await expect(drawer.locator('input[name="payment"]')).toHaveCount(2);
  await expect(drawer.locator('input[name="payment"][value="cash"]')).toBeVisible();
  await expect(drawer.locator('input[name="payment"][value="manual-transfer"]')).toBeVisible();
  await expect(drawer.locator('input[name="payment"][value="arifpay"]')).toHaveCount(0);
});
