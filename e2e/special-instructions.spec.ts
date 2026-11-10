import { expect, test, type Page } from "@playwright/test";

type CreateRequest = { action?: string; specialInstructions?: string; [key: string]: unknown };

const note = "No onion, please.";
const trackingToken = "order-edit-e2e-token-0123456789abcdefghijklmno";

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
        reference: "CL-TEST-0034",
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

async function submitCheckout(drawer: ReturnType<Page["getByRole"]>, specialInstructions = "") {
  await drawer.getByLabel("Your name").fill("Test Customer");
  await drawer.getByLabel("Mobile number").fill("+251 911 234 567");
  const noteField = drawer.getByLabel(/Special instructions/);
  await expect(noteField).toHaveAttribute("maxlength", "500");
  await expect(noteField).toHaveAttribute("aria-describedby", "special-instructions-help");
  if (specialInstructions) await noteField.fill(specialInstructions);
  await drawer.getByRole("button", { name: /Place order request/ }).click();
  await expect(drawer.getByRole("heading", { name: "Request received" })).toBeVisible();
}

test("checkout submits an optional kitchen note with the order request", async ({ page }) => {
  const createRequests = await mockCheckoutApis(page);
  const drawer = await openCheckout(page);
  await expect(drawer.getByText(/Visible to Cloud L staff in the order board/)).toBeVisible();
  await expect(drawer.getByLabel(/Special instructions/)).toHaveAccessibleName(/Special instructions \(optional\).*ልዩ መመሪያ/);
  await submitCheckout(drawer, note);

  expect(createRequests).toHaveLength(1);
  expect(createRequests[0]?.specialInstructions).toBe(note);
  expect(createRequests[0]?.action).toBe("create");
});

test("checkout can be submitted without special instructions", async ({ page }) => {
  const createRequests = await mockCheckoutApis(page);
  const drawer = await openCheckout(page);
  await submitCheckout(drawer);

  expect(createRequests).toHaveLength(1);
  expect(createRequests[0]?.specialInstructions).toBe("");
});

test("customer tracking does not render a staff-only kitchen note", async ({ page }) => {
  await page.route("**/api/orders", async (route) => {
    const payload = route.request().postDataJSON() as { action?: string };
    if (payload.action !== "track") {
      await route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "Unexpected test action." }) });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        order: {
          public_reference: "CL-TEST-0034",
          created_at: "2026-11-10T03:00:00.000Z",
          status: "received",
          fulfillment: "pickup",
          payment_method: "cash",
          payment_status: "unpaid",
          payment_destination_snapshot: { id: "cash", label: "Cash", payment_type: "cash" },
          subtotal_etb: 450,
          delivery_fee_etb: null,
          total_etb: null,
          estimated_ready_at: null,
          items: [{ name: "Beyaynetu", nameAmharic: "በያይነቱ", size: null, quantity: 1, unitPriceEtb: 450, lineTotalEtb: 450 }],
          events: [],
          editable: false,
          reorderItems: [],
          reorderWarnings: [],
          // Defense in depth only; the real tracking SQL projection independently omits this staff-only field.
          special_instructions: note,
        },
      }),
    });
  });

  await page.goto(`/#track/${trackingToken}`);
  await expect(page.locator(".tracking-summary")).toContainText("Beyaynetu");
  await expect(page.getByText(note, { exact: true })).toHaveCount(0);
});

test("the authenticated staff order board displays the kitchen note", async ({ page }) => {
  let orderListRequests = 0;
  await page.route("**/api/admin/login", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ authenticated: true }) });
  });
  await page.route("**/api/admin/orders", async (route) => {
    orderListRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        orders: [{
          id: "test-order-34",
          public_reference: "CL-TEST-0034",
          created_at: "2026-11-10T03:00:00.000Z",
          status: "received",
          payment_method: "cash",
          payment_status: "unpaid",
          customer_name: "Test Customer",
          customer_phone: "+251911234567",
          fulfillment: "pickup",
          delivery_address: null,
          delivery_landmark: null,
          delivery_notes: null,
          special_instructions: note,
          guest_count: null,
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
        }],
      }),
    });
  });

  await page.goto("/#staff");
  await expect(page.getByText(note, { exact: true })).toHaveCount(0);
  expect(orderListRequests).toBe(0);
  await page.getByLabel("Staff password").fill("route-mocked-test-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText(`Kitchen: ${note}`, { exact: true })).toBeVisible();
  expect(orderListRequests).toBeGreaterThan(0);
});
