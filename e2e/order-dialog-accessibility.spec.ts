import { expect, test } from "@playwright/test";

const trackingToken = "order-dialog-e2e-token-0123456789abcdefghijklmno";

async function addMenuItemAndOpenCart(page: import("@playwright/test").Page) {
  await page.route("**/api/menu-availability", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ soldOutItemIds: [] }) });
  });
  await page.goto("/");
  await page.locator(".fm__item").filter({ hasText: "Beyaynetu" }).getByRole("button", { name: "Add Beyaynetu to order" }).click();
  return page.getByRole("dialog");
}

test("order dialog sets initial focus, traps keyboard focus, and restores focus after Escape", async ({ page }) => {
  const dialog = await addMenuItemAndOpenCart(page);
  const close = dialog.getByRole("button", { name: "Close order panel" });
  const whatsapp = dialog.getByRole("link", { name: /Continue with WhatsApp/ });

  await expect(close).toBeFocused();
  await whatsapp.focus();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(whatsapp).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".order-cart-trigger")).toBeFocused();
});

test("rapid repeated checkout submits create only one order request", async ({ page }) => {
  let createRequests = 0;
  await page.route("**/api/menu-availability", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ soldOutItemIds: [] }) });
  });
  await page.route("**/api/payment-methods", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ methods: [{ id: "cash", label: "Cash", payment_type: "cash" }] }),
    });
  });
  await page.route("**/api/orders", async (route) => {
    createRequests += 1;
    await new Promise((resolve) => setTimeout(resolve, 200));
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        reference: "CL-DOUBLE-SUBMIT-E2E",
        trackingUrl: `https://www.cloudlrestaurant.com/#track/${trackingToken}`,
        status: "received",
        subtotalEtb: 450,
        currency: "ETB",
      }),
    });
  });

  const dialog = await addMenuItemAndOpenCart(page);
  await dialog.getByRole("button", { name: /Continue to checkout/ }).click();
  await dialog.getByLabel("Your name").fill("Test Customer");
  await dialog.getByLabel("Mobile number").fill("+251 911 234 567");
  await expect(dialog.getByRole("button", { name: /Place order request/ })).toBeEnabled();

  await dialog.locator("form").evaluate((form: HTMLFormElement) => {
    form.requestSubmit();
    form.requestSubmit();
  });

  await expect(dialog.getByRole("heading", { name: "Request received" })).toBeVisible();
  expect(createRequests).toBe(1);
});
