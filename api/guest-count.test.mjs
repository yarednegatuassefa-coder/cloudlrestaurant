import assert from "node:assert/strict";
import test from "node:test";
import { normalizeGuestCount } from "./guest-count.mjs";

test("allows an omitted dine-in guest count", () => {
  assert.deepEqual(normalizeGuestCount("dine_in", null), { ok: true, guestCount: null });
  assert.deepEqual(normalizeGuestCount("dine_in", undefined), { ok: true, guestCount: null });
  assert.deepEqual(normalizeGuestCount("dine_in", ""), { ok: true, guestCount: null });
});

test("accepts whole-number boundaries from one through forty", () => {
  assert.deepEqual(normalizeGuestCount("dine_in", 1), { ok: true, guestCount: 1 });
  assert.deepEqual(normalizeGuestCount("dine_in", 40), { ok: true, guestCount: 40 });
  assert.deepEqual(normalizeGuestCount("dine_in", 18), { ok: true, guestCount: 18 });
});

test("rejects zero, out-of-range, fractional, and non-number dine-in values", () => {
  for (const value of [0, 41, -1, 2.5, "4", " ", true, {}, Number.NaN, Number.POSITIVE_INFINITY]) {
    const result = normalizeGuestCount("dine_in", value);
    assert.equal(result.ok, false, `expected ${String(value)} to be rejected`);
    if (!result.ok) assert.match(result.error, /whole number from 1 to 40/);
  }
});

test("discards any guest count submitted for pickup or delivery", () => {
  for (const fulfillment of ["pickup", "delivery"]) {
    assert.deepEqual(normalizeGuestCount(fulfillment, 4), { ok: true, guestCount: null });
    assert.deepEqual(normalizeGuestCount(fulfillment, 99), { ok: true, guestCount: null });
    assert.deepEqual(normalizeGuestCount(fulfillment, "not a number"), { ok: true, guestCount: null });
  }
});
