import { expect, test, type Page } from "@playwright/test";

type TrackingPayload = { action?: string; token?: string };

const tokenA = "order-edit-e2e-token-0123456789abcdefghijklmno";
const tokenB = "order-edit-e2e-token-0123456789abcdefghijklmnp";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((complete) => { resolve = complete; });
  return { promise, resolve };
}

function makeOrder(reference: string, manualTransfer = false) {
  return {
    public_reference: reference,
    created_at: "2026-11-09T16:00:00.000Z",
    status: manualTransfer ? "confirmed" : "received",
    fulfillment: "pickup",
    payment_method: manualTransfer ? "telebirr" : "cash",
    payment_status: manualTransfer ? "awaiting_transfer" : "unpaid",
    payment_destination_snapshot: manualTransfer
      ? { id: "telebirr", label: "Telebirr", payment_type: "manual_transfer", recipient_name: "Cloud L", phone_number: "+251900000000" }
      : { id: "cash", label: "Cash", payment_type: "cash" },
    subtotal_etb: 450,
    delivery_fee_etb: null,
    total_etb: manualTransfer ? 450 : null,
    estimated_ready_at: null,
    items: [{
      menuItemId: "food-fasting-beyaynetu",
      name: "Beyaynetu",
      nameAmharic: "በያይነቱ",
      size: null,
      quantity: 1,
      unitPriceEtb: 450,
      lineTotalEtb: 450,
    }],
    events: [],
    editable: !manualTransfer,
    reorderItems: [],
    reorderWarnings: [],
  };
}

async function mockAvailability(page: Page) {
  await page.route("**/api/menu-availability", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ soldOutItemIds: [] }) });
  });
}

test("tracking token changes hide the prior order and ignore a late response", async ({ page }) => {
  const staleAResponse = deferred();
  const staleAStarted = deferred();
  const currentBResponse = deferred();
  const currentBStarted = deferred();
  let tokenATrackRequests = 0;

  await mockAvailability(page);
  await page.route("**/api/orders", async (route) => {
    const payload = route.request().postDataJSON() as TrackingPayload;
    if (payload.action === "track" && payload.token === tokenA) {
      tokenATrackRequests += 1;
      if (tokenATrackRequests === 1) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ order: makeOrder("CL-TOKEN-A", true) }) });
        return;
      }
      staleAStarted.resolve();
      await staleAResponse.promise;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ order: makeOrder("CL-TOKEN-A", true) }) });
      return;
    }
    if (payload.action === "track" && payload.token === tokenB) {
      currentBStarted.resolve();
      await currentBResponse.promise;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ order: makeOrder("CL-TOKEN-B") }) });
      return;
    }
    if (payload.action === "payment-reference") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ message: "Reference received." }) });
      return;
    }
    await route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "Unexpected order action in test." }) });
  });

  try {
    await page.goto(`/#track/${tokenA}`);
    await expect(page.locator(".tracking-reference").getByText("CL-TOKEN-A", { exact: true })).toBeVisible();
    await page.getByLabel("Transaction reference or receipt ID").fill("ABCD1234");
    await page.getByRole("button", { name: "Submit for staff verification" }).click();
    await staleAStarted.promise;
    await expect(page.locator(".tracking-reference").getByText("CL-TOKEN-A", { exact: true })).toBeVisible();
    await expect(page.getByRole("status")).toContainText("Reference received.");

    await page.evaluate((token) => { window.location.hash = `#track/${token}`; }, tokenB);
    await currentBStarted.promise;
    await expect(page.getByRole("status")).toContainText("Loading your private order status");
    await expect(page.getByText("CL-TOKEN-A", { exact: true })).toHaveCount(0);

    currentBResponse.resolve();
    await expect(page.getByText("CL-TOKEN-B", { exact: true })).toBeVisible();

    staleAResponse.resolve();
    await expect(page.getByText("CL-TOKEN-B", { exact: true })).toBeVisible();
    await expect(page.getByText("CL-TOKEN-A", { exact: true })).toHaveCount(0);
  } finally {
    currentBResponse.resolve();
    staleAResponse.resolve();
  }
});

test("same-token payment refresh preserves the order and explains a refresh failure", async ({ page }) => {
  let trackRequests = 0;
  await mockAvailability(page);
  await page.route("**/api/orders", async (route) => {
    const payload = route.request().postDataJSON() as TrackingPayload;
    if (payload.action === "payment-reference") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ message: "Reference received." }) });
      return;
    }
    if (payload.action !== "track" || payload.token !== tokenA) {
      await route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "Unexpected order action in test." }) });
      return;
    }
    trackRequests += 1;
    if (trackRequests === 1) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ order: makeOrder("CL-PAYMENT-REFRESH", true) }) });
      return;
    }
    await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Refresh unavailable." }) });
  });

  await page.goto(`/#track/${tokenA}`);
  await expect(page.locator(".tracking-reference").getByText("CL-PAYMENT-REFRESH", { exact: true })).toBeVisible();
  await page.getByLabel("Transaction reference or receipt ID").fill("ABCD1234");
  await page.getByRole("button", { name: "Submit for staff verification" }).click();

  await expect(page.getByRole("status")).toContainText("Your reference was received, but the order status could not be refreshed.");
  await expect(page.locator(".tracking-reference").getByText("CL-PAYMENT-REFRESH", { exact: true })).toBeVisible();
  expect(trackRequests).toBe(2);
});

test("tracking errors can be retried into a successful state", async ({ page }) => {
  let attempts = 0;
  await mockAvailability(page);
  await page.route("**/api/orders", async (route) => {
    const payload = route.request().postDataJSON() as TrackingPayload;
    if (payload.action !== "track" || payload.token !== tokenA) {
      await route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "Unexpected order action in test." }) });
      return;
    }
    attempts += 1;
    if (attempts === 1) {
      await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "Private order not found." }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ order: makeOrder("CL-RETRY") }) });
  });

  await page.goto(`/#track/${tokenA}`);
  await expect(page.getByRole("alert")).toContainText("Private order not found.");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("CL-RETRY", { exact: true })).toBeVisible();
  expect(attempts).toBe(2);
});
