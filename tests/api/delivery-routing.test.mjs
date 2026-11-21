import test from "node:test";
import assert from "node:assert/strict";
import { createOsrmClient, getOsrmClientFromEnv } from "../../lib/server/delivery-routing.mjs";

const origin = [9.03, 38.75];
const destination = [9.04, 38.76];
const okPayload = { code: "Ok", routes: [{ distance: 1840.5, duration: 420.25 }] };

function fakeFetch(payload = okPayload, options = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    if (options.delay) await new Promise((resolve) => setTimeout(resolve, options.delay));
    if (options.reject) throw new Error("private upstream detail");
    return {
      ok: options.httpOk !== false,
      json: async () => payload,
    };
  };
  return { fetchImpl, calls };
}

test("builds OSRM coordinates in longitude,latitude order", async () => {
  const fake = fakeFetch();
  const client = createOsrmClient({ baseUrl: "http://127.0.0.1:5000/", fetchImpl: fake.fetchImpl });
  const result = await client.route(origin, destination);
  assert.equal(result.distanceMeters, 1840.5);
  assert.equal(result.durationSeconds, 420.25);
  assert.equal(result.cached, false);
  assert.match(fake.calls[0].url, /38\.75,9\.03;38\.76,9\.04/);
  assert.match(fake.calls[0].url, /overview=false/);
});

test("sends the gateway bearer token when configured", async () => {
  const fake = fakeFetch();
  const client = createOsrmClient({ baseUrl: "https://gateway.example", authToken: "a".repeat(64), fetchImpl: fake.fetchImpl });
  await client.route(origin, destination);
  assert.equal(fake.calls[0].init.headers.Authorization, `Bearer ${"a".repeat(64)}`);
});

test("caches successful route results and marks cache hits", async () => {
  const fake = fakeFetch();
  let now = 1_000;
  const client = createOsrmClient({ baseUrl: "http://localhost:5000", fetchImpl: fake.fetchImpl, now: () => now });
  assert.equal((await client.route(origin, destination)).cached, false);
  assert.equal((await client.route(origin, destination)).cached, true);
  assert.equal(fake.calls.length, 1);
  now += 60_001;
  assert.equal((await client.route(origin, destination)).cached, false);
  assert.equal(fake.calls.length, 2);
});

test("does not cache failed or unreachable routes", async () => {
  const fake = fakeFetch({ code: "NoRoute", routes: [] });
  const client = createOsrmClient({ baseUrl: "http://localhost:5000", fetchImpl: fake.fetchImpl });
  await assert.rejects(client.route(origin, destination), /No drivable road route/);
  await assert.rejects(client.route(origin, destination), /No drivable road route/);
  assert.equal(fake.calls.length, 2);
});

test("rejects malformed route responses and hides upstream error details", async () => {
  const invalid = createOsrmClient({ baseUrl: "http://localhost:5000", fetchImpl: fakeFetch({ code: "Ok", routes: [{ distance: -1, duration: 2 }] }).fetchImpl });
  await assert.rejects(invalid.route(origin, destination), /invalid route response/);
  const unavailable = createOsrmClient({ baseUrl: "http://localhost:5000", fetchImpl: fakeFetch(okPayload, { reject: true }).fetchImpl });
  await assert.rejects(unavailable.route(origin, destination), /Routing service is unavailable/);
});

test("validates coordinates and endpoint configuration", async () => {
  const client = createOsrmClient({ baseUrl: "http://localhost:5000", fetchImpl: fakeFetch().fetchImpl });
  await assert.rejects(client.route([91, 0], destination), /coordinate pairs/);
  assert.throws(() => createOsrmClient({ baseUrl: "file:///tmp/router" }), /HTTP\(S\) URL/);
  assert.throws(() => createOsrmClient({ baseUrl: "https://user:pass@example.com" }), /without credentials/);
});

test("enforces a request timeout", async () => {
  const fake = fakeFetch(okPayload, { delay: 100 });
  const client = createOsrmClient({ baseUrl: "http://localhost:5000", fetchImpl: fake.fetchImpl, timeoutMs: 100 });
  // The fake transport does not consume AbortSignal, so simulate a transport that does.
  const abortingFetch = (_url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
  });
  const abortingClient = createOsrmClient({ baseUrl: "http://localhost:5000", fetchImpl: abortingFetch, timeoutMs: 100 });
  await assert.rejects(abortingClient.route(origin, destination), /timed out/);
  assert.equal(typeof fake.fetchImpl, "function");
});

test("returns null when OSRM is not configured", () => {
  assert.equal(getOsrmClientFromEnv({ baseUrl: "" }), null);
});
