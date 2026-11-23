import test from "node:test";
import assert from "node:assert/strict";
import { validateReservationRequest } from "../../lib/server/reservation-validation.mjs";

const now = Date.parse("2026-11-30T00:00:00Z");

test("accepts requests at opening and closing time in Addis Ababa", () => {
  for (const requestedFor of [
    new Date("2026-12-01T07:00:00+03:00"),
    new Date("2026-12-01T21:00:00+03:00"),
  ]) {
    assert.deepEqual(validateReservationRequest({ partySize: 2, requestedFor, now }), { valid: true });
  }
});

test("rejects requested times outside Cloud L's Addis Ababa opening hours", () => {
  for (const requestedFor of [
    new Date("2026-12-01T06:59:00+03:00"),
    new Date("2026-12-01T21:01:00+03:00"),
  ]) {
    assert.equal(validateReservationRequest({ partySize: 2, requestedFor, now }).valid, false);
  }
});

test("enforces the 30-minute lead time and 60-day booking horizon", () => {
  const tooSoon = new Date(now + 20 * 60_000);
  const tooFar = new Date(now + 61 * 24 * 60 * 60_000);
  assert.match(validateReservationRequest({ partySize: 2, requestedFor: tooSoon, now }).error, /30 minutes/);
  assert.match(validateReservationRequest({ partySize: 2, requestedFor: tooFar, now }).error, /60 days/);
});

test("limits reservation party size to 1–20 guests", () => {
  const requestedFor = new Date("2026-12-01T12:00:00+03:00");
  for (const partySize of [0, 21, 2.5, NaN]) {
    assert.equal(validateReservationRequest({ partySize, requestedFor, now }).valid, false);
  }
});

test("rejects invalid dates", () => {
  assert.equal(validateReservationRequest({ partySize: 2, requestedFor: new Date("invalid"), now }).valid, false);
});
