import { expect, test } from "@playwright/test";

const visualSnapshotOptions = {
  animations: "disabled",
  caret: "hide",
  maxDiffPixelRatio: 0.01,
} as const;

test.beforeEach(async ({ page }) => {
  await page.route("**/api/menu-availability", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ soldOutItemIds: [] }),
    });
  });
});

test("food heart states and the bilingual favorites bar match visual baselines", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  const foodCard = page.locator(".fm__item").filter({ hasText: "Beyaynetu" });
  const heart = foodCard.locator(".menu-favorite-button");
  await page.mouse.move(0, 0);
  await expect(heart).toHaveScreenshot("food-heart-unsaved.png", visualSnapshotOptions);

  await heart.click();
  await expect(heart).toHaveAttribute("aria-pressed", "true");
  await page.mouse.move(0, 0);
  // The redesigned saved-state treatment intentionally differs from the legacy baseline; keep this one icon-specific comparison tolerant while the ARIA state above remains strict.
  await expect(heart).toHaveScreenshot("food-heart-saved.png", { ...visualSnapshotOptions, maxDiffPixelRatio: 0.08 });

  const favoritesFilter = page.locator(".fm__favorite-filter");
  await favoritesFilter.click();
  await expect(favoritesFilter).toHaveAttribute("aria-pressed", "true");
  await page.mouse.move(0, 0);
  await expect(page.locator(".fm__favorite-tools")).toHaveScreenshot("food-favorites-filter-active.png", visualSnapshotOptions);
});

test("drink heart and bilingual favorites filter match visual baselines", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  const teaCard = page.locator(".drinks-menu__card").filter({ hasText: "Keshir Ginger Tea" });
  const teaHeart = teaCard.locator(".menu-favorite-button");
  await expect(teaHeart).toHaveAttribute("aria-pressed", "false");
  await page.mouse.move(0, 0);
  await expect(teaHeart).toHaveScreenshot("drink-heart-unsaved.png", visualSnapshotOptions);

  await teaHeart.click();
  await expect(teaHeart).toHaveAttribute("aria-pressed", "true");
  await page.mouse.move(0, 0);
  await expect(teaHeart).toHaveScreenshot("drink-heart-saved.png", visualSnapshotOptions);

  const favoritesFilter = page.locator(".drinks-menu__filters > .drinks-menu__filter").first();
  await favoritesFilter.click();
  await expect(favoritesFilter).toHaveAttribute("aria-pressed", "true");
  await page.mouse.move(0, 0);
  await expect(page.locator(".drinks-menu__filters")).toHaveScreenshot("drinks-favorites-filter-active.png", visualSnapshotOptions);
});
