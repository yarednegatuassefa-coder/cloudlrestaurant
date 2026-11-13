import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PWA_PREVIEW_PORT || 4189);
const origin = `http://127.0.0.1:${port}`;
const viteEntrypoint = resolve(root, "node_modules/vite/bin/vite.js");
const preview = spawn(process.execPath, [viteEntrypoint, "preview", "--host", "127.0.0.1", `--port=${port}`, "--strictPort"], {
  cwd: root,
  stdio: "inherit",
});
let browser;

async function waitForPreview() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (preview.exitCode !== null) throw new Error(`Vite preview exited with code ${preview.exitCode}`);
    try {
      const response = await fetch(`${origin}/manifest.webmanifest`);
      if (response.ok) return;
    } catch {
      // The preview server may still be starting.
    }
    await delay(250);
  }
  throw new Error("Timed out waiting for the production preview server");
}

try {
  await waitForPreview();
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const context = await browser.newContext();
  const page = await context.newPage();
  const home = await page.goto(origin, { waitUntil: "domcontentloaded" });
  assert.equal(home?.status(), 200, "home page should load in the production preview");

  const manifest = await page.evaluate(async () => {
    const response = await fetch("/manifest.webmanifest");
    return { status: response.status, data: await response.json() };
  });
  assert.equal(manifest.status, 200);
  assert.equal(manifest.data.name, "Cloud L Restaurant");
  assert.equal(manifest.data.short_name, "Cloud L");
  assert.equal(manifest.data.display, "standalone");
  assert.ok(manifest.data.icons.some((icon) => icon.sizes === "192x192"));
  assert.ok(manifest.data.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "any"));
  assert.ok(manifest.data.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "maskable"));

  for (const icon of manifest.data.icons) {
    const response = await fetch(new URL(icon.src, origin));
    assert.equal(response.status, 200, `manifest icon should exist: ${icon.src}`);
    assert.match(response.headers.get("content-type") || "", /image\/png/i);
  }
  const appleIcon = await fetch(`${origin}/icons/apple-touch-icon.png`);
  assert.equal(appleIcon.status, 200, "Apple touch icon should be served");

  await page.locator(".install-app-help summary").click();
  const installHelp = await page.locator(".install-app-help").innerText();
  assert.match(installHelp, /Android/i);
  assert.match(installHelp, /iPhone|iPad/i);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller), null, { timeout: 10_000 });

  // Prime the browser with online requests, then confirm neither endpoint is persisted in Cache Storage.
  const paymentQrStatus = await page.evaluate(async () => (await fetch("/assets/payments/bunna-bank-qr-v1.png")).status);
  assert.equal(paymentQrStatus, 200, "the manual-payment QR should load online for the privacy check");
  await page.evaluate(async () => {
    await fetch("/api/menu-availability", { cache: "no-store" }).catch(() => undefined);
  });
  const cachedPaths = await page.evaluate(async () => {
    const paths = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) paths.push(new URL(request.url).pathname);
    }
    return paths;
  });
  assert.ok(!cachedPaths.some((path) => path.startsWith("/api/")), "API responses must never be cached");
  assert.ok(!cachedPaths.some((path) => path.startsWith("/assets/payments/")), "payment QR files must never be cached");

  const privateToken = "synthetic-offline-test-token-do-not-store";
  let offlineOrderRequestCount = 0;
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (request.method() === "POST" && url.pathname === "/api/orders") offlineOrderRequestCount += 1;
  });
  await context.setOffline(true);
  await page.goto(`${origin}/?pwa-offline-test=1#track/${privateToken}`, { waitUntil: "domcontentloaded", timeout: 10_000 });
  const offlineText = await page.locator("body").innerText();
  assert.match(offlineText, /Looks like you're offline/i);
  assert.doesNotMatch(offlineText, new RegExp(privateToken));

  await page.goto(`${origin}/?pwa-staff-test=1#staff`, { waitUntil: "domcontentloaded", timeout: 10_000 });
  const staffOfflineText = await page.locator("body").innerText();
  assert.match(staffOfflineText, /Looks like you're offline/i);
  assert.doesNotMatch(staffOfflineText, /staff dashboard|order queue|bank details/i);

  const offlineRequests = await page.evaluate(async () => {
    const requestStatus = async (path) => {
      try {
        const response = await fetch(path);
        return `response:${response.status}`;
      } catch {
        return "network-error";
      }
    };
    return {
      api: await requestStatus("/api/menu-availability"),
      paymentQr: await requestStatus("/assets/payments/bunna-bank-qr-v1.png"),
      orderPost: await (async () => {
        try {
          await fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ syntheticPwaOfflineTest: true, testOnly: true }),
          });
          return "unexpected-response";
        } catch {
          return "network-error";
        }
      })(),
    };
  });
  assert.equal(offlineRequests.api, "network-error", "offline API request must not be replayed from cache");
  assert.equal(offlineRequests.paymentQr, "network-error", "payment QR must not be served from the offline cache");
  assert.equal(offlineRequests.orderPost, "network-error", "offline order submission must fail rather than queue");

  await context.setOffline(false);
  const recovery = await page.goto(origin, { waitUntil: "domcontentloaded" });
  assert.equal(recovery?.status(), 200, "the app should load again after reconnecting");
  await delay(500);
  assert.equal(offlineOrderRequestCount, 1, "the explicit synthetic offline order attempt must not be replayed after reconnecting");
  console.log("PWA smoke passed: install metadata, icons, safe tracking/staff fallbacks, and network-only API/payment/order paths.");
} finally {
  if (browser) await browser.close();
  if (preview.exitCode === null) preview.kill("SIGTERM");
}
