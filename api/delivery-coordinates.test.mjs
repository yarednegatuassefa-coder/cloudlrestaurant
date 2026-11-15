import test from "node:test";
import assert from "node:assert/strict";
import { parseDeliveryCoordinates } from "./delivery-coordinates.mjs";

test("accepts a valid optional delivery pin", () => {
  assert.deepEqual(parseDeliveryCoordinates(9.04, 38.76, "delivery"), { valid: true, latitude: 9.04, longitude: 38.76 });
});
test("allows written-address-only delivery", () => {
  assert.deepEqual(parseDeliveryCoordinates(null, null, "delivery"), { valid: true, latitude: null, longitude: null });
});
test("rejects partial coordinate pairs", () => {
  assert.equal(parseDeliveryCoordinates(9.04, null, "delivery").valid, false);
});
test("rejects out-of-range coordinates", () => {
  assert.equal(parseDeliveryCoordinates(91, 38.76, "delivery").valid, false);
});
test("rejects string coordinates", () => {
  assert.equal(parseDeliveryCoordinates("9.04", "38.76", "delivery").valid, false);
});
test("rejects coordinates on non-delivery orders", () => {
  assert.equal(parseDeliveryCoordinates(9.04, 38.76, "pickup").valid, false);
});
