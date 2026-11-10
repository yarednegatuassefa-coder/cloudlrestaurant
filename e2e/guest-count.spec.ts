import { expect, test, type Locator, type Page } from "@playwright/test";

type CreateRequest = {
  action?: string;
  fulfillment?: "pickup" | "delivery" | "dine_in";
  guestCount?: number | null;
};

const trackingToken = "guest-count-e2e-token-0123456789abcdefghijklmno";

async function mockCheckoutApis(page: Page) {
  const createRequests: CreateRequest[] = [];
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
    const payload = route.request().postDataJSON() as CreateRequest;
    if (payload.action !== "create") {
      await route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "Unexpected test action." }) });
      return;
    }
    createRequests.push(payload);
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        reference: "CL-GUEST-E2E",
        trackingUrl: `https://www.cloudlrestaurant.com/#track/${trackingToken}`,
        status: "received",
        subtotalEtb: 450,
        currency: "ETB",
      }),
    });
  });
  return createRequests;
}

async function openCheckout(page: Page) {
  await page.goto("/");
  await page.locator(".fm__item").filter({ hasText: "Beyaynetu" }).getByRole("button", { name: "Add Beyaynetu to order" }).click();
  const drawer = page.getByRole("dialog");
  await drawer.getByRole("button", { name: /Continue to checkout/ }).click();
  await expect(drawer.getByLabel("Your name")).toBeVisible();
  return drawer;
}

async function submitCheckout(drawer: Locator, fulfillment: "pickup" | "delivery" | "dine_in") {
  await drawer.getByLabel("Your name").fill("Test Customer");
  await drawer.getByLabel("Mobile number").fill("+251 911 234 567");
  if (fulfillment === "delivery") {
    await drawer.getByLabel("Delivery address").fill("Bole, Addis Ababa");
  }
  await drawer.getByRole("button", { name: /Place order request/ }).click();
  await expect(drawer.getByRole("heading", { name: "Request received" })).toBeVisible();
}

test("dine-in guest count is optional, accessible, and submits the chosen whole number", async ({ page }) => {
  const createRequests = await mockCheckoutApis(page);
  const drawer = await openCheckout(page);
  await drawer.locator('input[name="fulfillment"][value="dine_in"]').check();

  const guestCount = drawer.getByLabel(/Number of guests/);
  await expect(guestCount).toBeVisible();
  await expect(guestCount).toHaveAccessibleName(/Number of guests \(optional\).*የእንግዶች ብዛት/);
  await expect(guestCount).toHaveAttribute("type", "number");
  await expect(guestCount).toHaveAttribute("min", "1");
  await expect(guestCount).toHaveAttribute("max", "40");
  await expect(guestCount).toHaveAttribute("step", "1");
  await expect(guestCount).not.toHaveAttribute("required");
  await expect(drawer.getByText(/Dine-in only.*1–40/)).toBeVisible();
  await guestCount.fill("4");
  await submitCheckout(drawer, "dine_in");

  expect(createRequests).toHaveLength(1);
  expect(createRequests[0]).toMatchObject({ action: "create", fulfillment: "dine_in", guestCount: 4 });
});

test("dine-in checkout can omit the guest count", async ({ page }) => {
  const createRequests = await mockCheckoutApis(page);
  const drawer = await openCheckout(page);
  await drawer.locator('input[name="fulfillment"][value="dine_in"]').check();
  await expect(drawer.getByLabel(/Number of guests/)).toHaveValue("");
  await submitCheckout(drawer, "dine_in");

  expect(createRequests).toHaveLength(1);
  expect(createRequests[0]).toMatchObject({ action: "create", fulfillment: "dine_in", guestCount: null });
});

for (const fulfillment of ["pickup", "delivery"] as const) {
  test(`a guest count retained in the form is not submitted after switching to ${fulfillment}`, async ({ page }) => {
    const createRequests = await mockCheckoutApis(page);
    const drawer = await openCheckout(page);
    await drawer.locator('input[name="fulfillment"][value="dine_in"]').check();
    await drawer.getByLabel(/Number of guests/).fill("4");
    await drawer.locator(`input[name="fulfillment"][value="${fulfillment}"]`).check();
    await expect(drawer.getByLabel(/Number of guests/)).toHaveCount(0);
    await submitCheckout(drawer, fulfillment);

    expect(createRequests).toHaveLength(1);
    expect(createRequests[0]).toMatchObject({ action: "create", fulfillment, guestCount: null });
  });
}

function staffOrder(id: string, reference: string, fulfillment: string, guest_count: number) {
  return {
    id,
    public_reference: reference,
    created_at: "2026-11-10T03:00:00.000Z",
    status: "received",
    payment_method: "cash",
    payment_status: "unpaid",
    customer_name: "Test Customer",
    customer_phone: "+251911234567",
    fulfillment,
    delivery_address: null,
    delivery_landmark: null,
    delivery_notes: null,
    special_instructions: null,
    guest_count,
    table_number: null,
    subtotal_etb: 450,
    delivery_fee_etb: null,
    total_etb: null,
    estimated_ready_at: null,
    wants_whatsapp_updates: false,
    customer_payment_reference: null,
    clarification_message: null,
    payment_destination_snapshot: null,
    items: [{ name: "Beyaynetu", size: null, quantity: 1, lineTotalEtb: 450 }],
  };
}

test("staff board labels a guest count only for dine-in, even if another record has stale data", async ({ page }) => {
  await page.route("**/api/admin/login", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ authenticated: true }) });
  });
  await page.route("**/api/admin/orders", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        orders: [
          staffOrder("dine-in-order", "CL-GUEST-DINE-IN", "dine_in", 3),
          staffOrder("pickup-order", "CL-GUEST-PICKUP", "pickup", 5),
          staffOrder("delivery-order", "CL-GUEST-DELIVERY", "delivery", 6),
        ],
      }),
    });
  });

  await page.goto("/#staff");
  await page.getByLabel("Staff password").fill("route-mocked-test-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Guests: 3", { exact: true })).toBeVisible();
  await expect(page.getByText("Guests: 5", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Guests: 6", { exact: true })).toHaveCount(0);
});
