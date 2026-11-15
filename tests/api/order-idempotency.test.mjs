import assert from "node:assert/strict";
import test from "node:test";
import { isValidTrackingToken, orderRequestFingerprint } from "../../lib/server/order-idempotency.mjs";

test("accepts only 32-byte base64url tracking tokens", () => {
  assert.equal(isValidTrackingToken("A".repeat(43)), true);
  for (const value of ["", "short", "A".repeat(42), "A".repeat(44), "A".repeat(42) + "=", null, 123]) {
    assert.equal(isValidTrackingToken(value), false);
  }
});

test("fingerprint is stable for the same canonical order request", () => {
  const order = { customerName: "Test", fulfillment: "pickup", items: [{ id: "coffee", quantity: 2 }] };
  assert.equal(orderRequestFingerprint(order), orderRequestFingerprint({ ...order, items: [{ id: "coffee", quantity: 2 }] }));
});

test("fingerprint changes when an order detail changes", () => {
  const base = { customerName: "Test", fulfillment: "pickup", items: [{ id: "coffee", quantity: 2 }] };
  assert.notEqual(orderRequestFingerprint(base), orderRequestFingerprint({ ...base, items: [{ id: "coffee", quantity: 3 }] }));
});
