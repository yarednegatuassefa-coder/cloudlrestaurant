import { expect, test } from "@playwright/test";

const favoritesStorageKey = "cloud-l-favorites-v1";

// Keep the app entirely local: availability is mocked, and these tests never create an order.
test.beforeEach(async ({ page }) => {
  await page.route("**/api/menu-availability", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ soldOutItemIds: [] }),
    });
  });
});

test("food heart has bilingual accessible labels, toggles by keyboard, and persists locally", async ({ page }) => {
  await page.goto("/");

  const foodCard = page.locator(".fm__item").filter({ hasText: "Beyaynetu" });
  const heart = foodCard.locator(".menu-favorite-button");

  await expect(heart).toHaveAttribute("aria-pressed", "false");
  await expect(heart).toHaveAccessibleName(/Add Beyaynetu to favorites.*በያይነቱ.*ወደ ተወዳጆች/);
  await heart.focus();
  await page.keyboard.press("Space");

  await expect(heart).toHaveAttribute("aria-pressed", "true");
  await expect(heart).toHaveAccessibleName(/Remove Beyaynetu from favorites.*በያይነቱ.*ከተወዳጆች/);
  let savedIds = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "[]") as string[], favoritesStorageKey);
  expect(savedIds).toContain("food-fasting-beyaynetu");

  await page.reload();
  const persistedHeart = page.locator(".fm__item").filter({ hasText: "Beyaynetu" }).locator(".menu-favorite-button");
  await expect(persistedHeart).toHaveAttribute("aria-pressed", "true");
  await persistedHeart.click();
  await expect(persistedHeart).toHaveAttribute("aria-pressed", "false");
  savedIds = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "[]") as string[], favoritesStorageKey);
  expect(savedIds).not.toContain("food-fasting-beyaynetu");
});

test("food Favorites view limits category links to visible sections and explains empty search results", async ({ page }) => {
  await page.addInitScript((ids: string[]) => {
    localStorage.setItem("cloud-l-favorites-v1", JSON.stringify(ids));
  }, ["food-fasting-beyaynetu"]);
  await page.goto("/");

  const favoritesFilter = page.locator(".fm__favorite-filter");
  await favoritesFilter.click();
  await expect(favoritesFilter).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".fm__tabs a")).toHaveCount(1);
  await expect(page.locator(".fm__tabs a")).toHaveAttribute("href", "#fasting");
  await expect(page.locator(".fm__sections .fm__category")).toHaveCount(1);
  await expect(page.locator(".fm__sections")).toContainText("Beyaynetu");
  await expect(page.locator(".fm__sections")).not.toContainText("Tibs");

  await page.locator(".fm__tabs a").click();
  await expect(page).toHaveURL(/#fasting$/);
  await expect(page.locator("#fasting")).toBeVisible();

  await page.locator(".fm__search").fill("Tibs");
  await expect(page.locator(".fm__tabs a")).toHaveCount(0);
  await expect(page.locator(".fm__empty")).toContainText("No saved dishes match this search.");
});

test("drink hearts expose bilingual labels, save the menu item, and preserve wine size selection", async ({ page }) => {
  await page.goto("/");

  const teaCard = page.locator(".drinks-menu__card").filter({ hasText: "Keshir Ginger Tea" });
  const teaHeart = teaCard.locator(".menu-favorite-button");
  await expect(teaHeart).toHaveAccessibleName(/Add Keshir Ginger Tea to favorites.*ቀሽር ሻይ.*ወደ ተወዳጆች/);
  await teaHeart.click();
  await expect(teaHeart).toHaveAttribute("aria-pressed", "true");
  await expect(teaHeart).toHaveAccessibleName(/Remove Keshir Ginger Tea from favorites.*ከተወዳጆች/);

  const wineCard = page.locator(".drinks-menu__card").filter({ hasText: "Mary Taylor Wine" });
  const wineHeart = wineCard.locator(".menu-favorite-button");
  await wineHeart.click();
  await expect(wineHeart).toHaveAttribute("aria-pressed", "true");
  const fiveLiterOption = wineCard.locator(".drinks-menu__variant").filter({ hasText: "5 L" });
  await fiveLiterOption.click();
  await expect(fiveLiterOption).toHaveAttribute("aria-pressed", "true");
  await expect(wineHeart).toHaveAttribute("aria-pressed", "true");

  const savedIds = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "[]") as string[], favoritesStorageKey);
  expect(savedIds).toContain("keshir-ginger-tea");
  expect(savedIds).toContain("mary-taylor-wine");
  expect(savedIds).not.toContain("mary-taylor-wine-5l");

  const favoritesFilter = page.locator(".drinks-menu__filters > .drinks-menu__filter").first();
  await expect(favoritesFilter).toContainText("Favorites");
  await favoritesFilter.click();
  await expect(favoritesFilter).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".drinks-menu__card")).toHaveCount(2);
  await expect(page.locator(".drinks-menu__card").filter({ hasText: "Soda" })).toHaveCount(0);
});
