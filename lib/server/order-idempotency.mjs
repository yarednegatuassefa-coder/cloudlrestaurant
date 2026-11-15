import { createHash } from "node:crypto";

export function isValidTrackingToken(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
}

export function orderRequestFingerprint(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
