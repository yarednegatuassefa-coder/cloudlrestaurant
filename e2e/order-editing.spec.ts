import { expect, test, type Page } from "@playwright/test";

const trackingToken = "order-edit-e2e-token-0123456789abcdefghijklmno";
const cartStorageKey = "cloudl-order-cart-v1";
const existingCart = [{
  id: "keshir-ginger-tea",
  name: "Keshir Ginger Tea",
  nameAmharic: "ቀሽር ሻይ",
  price: 120,
  quantity: 1,
}];

type MockItem = {
  menuItemId: string;
  name: string;
  nameAmharic: string;
  size: string | null;
  quantity: number;
  unitPriceEtb: number;
  lineTotalEtb: number;
};
type MockOrder = {
  public_reference: string;
  created_at: string;
  status: string;
  fulfillment: string;
  payment_method: string;
  payment_status: string;
  payment_destination_snapshot: { id: string; label: string; payment_type: "cash" | "manual_transfer" };
  subtotal_etb: number;
  delivery_fee_etb: number | null;
  total_etb: number | null;
  estimated_ready_at: string | null;
  items: MockItem[];
  events: { at: string; status: string | null; message: string }[];
  editable: boolean;
  reorderItems: { id: string; name: string; nameAmharic: string; price: number; quantity: number }[];
  reorderWarnings: string[];
};

type EditRequest = { action?: string; token?: string; items?: { id: string; quantity: number }[]; [key: string]: unknown };

function makeOrder(overrides: Partial<MockOrder> = {}): MockOrder {
  return {
    public_reference: "CL-TEST-0042",
    created_at: "2026-11-07T04:45:00.000Z",
    status: "received",
    fulfillment: "pickup",
    payment_method: "cash",
    payment_status: "unpaid",
    payment_destination_snapshot: { id: "cash", label: "Cash", payment_type: "cash" },
    subtotal_etb: 450,
    delivery_fee_etb: null,
    total_etb: 450,
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
    editable: true,
    reorderItems: [{ id: "food-fasting-beyaynetu", name: "Beyaynetu", nameAmharic: "በያይነቱ", price: 450, quantity: 1 }],
    reorderWarnings: [],
    ...overrides,
  };
}

async function mockOrderApi(page: Page, initialOrder = makeOrder()) {
  let currentOrder = initialOrder;
  const editRequests: EditRequest[] = [];
  let editResponse: { status: number; body: Record<string, unknown> } = {
    status: 200,
    body: { changed: true, subtotalEtb: 900, message: "Your changes were saved." },
  };

  await page.route("**/api/orders", async (route) => {
    const request = route.request();
    const payload = request.postDataJSON() as EditRequest;
    if (payload.action === "track") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ order: currentOrder }) });
      return;
    }
    if (payload.action === "edit") {
      editRequests.push(payload);
      if (editResponse.status === 409 && editResponse.body.code === "order_not_editable") {
        currentOrder = makeOrder({ status: "confirmed", editable: false });
      }
      if (editResponse.status >= 200 && editResponse.status < 300) {
        const requestedQuantity = payload.items?.[0]?.quantity ?? 1;
        const updatedSubtotal = 450 * requestedQuantity;
        currentOrder = makeOrder({
          ...currentOrder,
          subtotal_etb: updatedSubtotal,
          total_etb: updatedSubtotal,
          items: [{
            menuItemId: "food-fasting-beyaynetu",
            name: "Beyaynetu",
            nameAmharic: "በያይነቱ",
            size: null,
            quantity: requestedQuantity,
            unitPriceEtb: 450,
            lineTotalEtb: updatedSubtotal,
          }],
          reorderItems: [{ id: "food-fasting-beyaynetu", name: "Beyaynetu", nameAmharic: "በያይነቱ", price: 450, quantity: requestedQuantity }],
        });
      }
      await route.fulfill({ status: editResponse.status, contentType: "application/json", body: JSON.stringify(editResponse.body) });
      return;
    }
    await route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "Unexpected API action in test." }) });
  });

  return {
    editRequests,
    setEditResponse(status: number, body: Record<string, unknown>) { editResponse = { status, body }; },
  };
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ key, cart }) => localStorage.setItem(key, JSON.stringify(cart)), { key: cartStorageKey, cart: existingCart });
  await page.route("**/api/menu-availability", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ soldOutItemIds: [] }) });
  });
});

test("customer can edit a pending order and save only menu IDs and quantities", async ({ page }) => {
  const api = await mockOrderApi(page);
  await page.goto(`/#track/${trackingToken}`);

  await page.getByRole("button", { name: "Edit items in the menu" }).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer.getByRole("button", { name: "Save changes to request" })).toBeVisible();
  await expect(drawer.getByText("Continue to checkout")).toHaveCount(0);
  await expect(drawer.getByLabel("Your name")).toHaveCount(0);
  await expect(page).toHaveURL(/#food$/);

  await drawer.getByRole("button", { name: "Add one Beyaynetu" }).click();
  await expect(drawer.locator(".order-cart__quantity").getByText("2", { exact: true })).toBeVisible();
  await drawer.getByRole("button", { name: "Save changes to request" }).click();

  await expect(page).toHaveURL(new RegExp(`#track/${trackingToken}$`));
  await expect(page.locator(".tracking-summary")).toContainText("2 × Beyaynetu");
  await expect(page.locator(".tracking-summary")).not.toContainText("Confirmed total");
  expect(api.editRequests).toHaveLength(1);
  expect(api.editRequests[0]).toEqual({ action: "edit", token: trackingToken, items: [{ id: "food-fasting-beyaynetu", quantity: 2 }] });
  expect(Object.keys(api.editRequests[0]).sort()).toEqual(["action", "items", "token"]);
  const storedCart = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "[]"), cartStorageKey);
  expect(storedCart).toEqual(existingCart);
});

test("cancel edit returns to tracking without changing the saved cart or calling the edit API", async ({ page }) => {
  const api = await mockOrderApi(page);
  await page.goto(`/#track/${trackingToken}`);
  await page.getByRole("button", { name: "Edit items in the menu" }).click();

  const drawer = page.getByRole("dialog");
  await drawer.getByRole("button", { name: "Add one Beyaynetu" }).click();
  await drawer.getByRole("button", { name: "Cancel editing" }).click();

  await expect(page).toHaveURL(new RegExp(`#track/${trackingToken}$`));
  await expect(page.getByRole("button", { name: "Edit items in the menu" })).toBeVisible();
  expect(api.editRequests).toHaveLength(0);
  const storedCart = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "[]"), cartStorageKey);
  expect(storedCart).toEqual(existingCart);
});

test("a sold-out conflict keeps the customer in edit mode so they can adjust the request", async ({ page }) => {
  const api = await mockOrderApi(page);
  api.setEditResponse(409, { code: "items_sold_out", error: "Some selected items just sold out: Beyaynetu. Adjust your request and save again." });
  await page.goto(`/#track/${trackingToken}`);
  await page.getByRole("button", { name: "Edit items in the menu" }).click();
  const drawer = page.getByRole("dialog");
  await drawer.getByRole("button", { name: "Save changes to request" }).click();

  await expect(drawer.getByRole("alert")).toContainText("Some selected items just sold out");
  await expect(drawer.getByRole("button", { name: "Save changes to request" })).toBeEnabled();
  await expect(page).toHaveURL(/#food$/);
  const storedCart = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "[]"), cartStorageKey);
  expect(storedCart).toEqual(existingCart);
});

test("a staff confirmation race ends editing and refreshes the tracking status", async ({ page }) => {
  const api = await mockOrderApi(page);
  api.setEditResponse(409, { code: "order_not_editable", error: "This request can no longer be edited." });
  await page.goto(`/#track/${trackingToken}`);
  await page.getByRole("button", { name: "Edit items in the menu" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Save changes to request" }).click();

  // The mock advances to confirmed before returning the conflict, as a concurrent staff update would.
  await expect(page).toHaveURL(new RegExp(`#track/${trackingToken}$`));
  await expect(page.locator(".tracking-status__current")).toContainText("Confirmed");
  await expect(page.getByRole("button", { name: "Edit items in the menu" })).toHaveCount(0);
  expect(api.editRequests).toHaveLength(1);
});

test("confirmed orders never show customer item editing", async ({ page }) => {
  await mockOrderApi(page, makeOrder({ status: "confirmed", editable: false }));
  await page.goto(`/#track/${trackingToken}`);
  await expect(page.locator(".tracking-status__current")).toContainText("Confirmed");
  await expect(page.locator(".tracking-summary")).toContainText("Confirmed total");
  await expect(page.getByRole("button", { name: "Edit items in the menu" })).toHaveCount(0);
});

test("customer can replace all discontinued historical lines with a current menu item", async ({ page }) => {
  const retiredOrder = makeOrder({
    items: [{ menuItemId: "retired-item", name: "Retired Special", nameAmharic: "", size: null, quantity: 1, unitPriceEtb: 200, lineTotalEtb: 200 }],
    subtotal_etb: 200,
    total_etb: 200,
    reorderItems: [],
    reorderWarnings: ["Retired Special — no longer on the current menu"],
  });
  const api = await mockOrderApi(page, retiredOrder);
  await page.goto(`/#track/${trackingToken}`);
  await page.getByRole("button", { name: "Edit items in the menu" }).click();

  const drawer = page.getByRole("dialog");
  await expect(drawer).toContainText("Retired Special");
  await expect(drawer.getByRole("button", { name: "Save changes to request" })).toBeDisabled();
  await drawer.getByRole("link", { name: "Return to the menu" }).click();
  await page.locator(".fm__item").filter({ hasText: "Beyaynetu" }).getByRole("button", { name: "Add Beyaynetu to order" }).click();
  await expect(drawer.getByRole("button", { name: "Save changes to request" })).toBeEnabled();
  await drawer.getByRole("button", { name: "Save changes to request" }).click();

  await expect(page).toHaveURL(new RegExp(`#track/${trackingToken}$`));
  await expect(page.locator(".tracking-summary")).toContainText("1 × Beyaynetu");
  expect(api.editRequests[0]?.items).toEqual([{ id: "food-fasting-beyaynetu", quantity: 1 }]);
});
