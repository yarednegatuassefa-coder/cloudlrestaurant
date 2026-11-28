import test from "node:test";
import assert from "node:assert/strict";
import { buildDraftCopilotInput, validateDraftCopilotOutput, draftCopilotLimits } from "../../lib/server/draft-copilot-policy.mjs";

test("draft input is bounded and keeps only approved catalog fields", () => {
  const input = buildDraftCopilotInput({
    task: "Draft a bilingual menu explanation",
    menuItems: [{ id: "food-1", name: "Shiro", nameAm: "ሽሮ", category: "fasting", priceEtb: 250, available: true, customerPhone: "+251 900 000 000" }],
    approvedCopy: ["Call token=secret-value; phone +251 901 120 012"],
  });
  assert.deepEqual(input.menuItems[0], { id: "food-1", name: "Shiro", nameAm: "ሽሮ", category: "fasting", priceEtb: 250, available: true });
  assert.match(input.approvedCopy[0], /\[REDACTED\]/);
  assert.doesNotMatch(input.approvedCopy[0], /secret-value|901 120 012/);
  assert.equal(input.mode, "draft_only");
  assert.equal(draftCopilotLimits.maxMenuItems, 100);
});

test("draft output always requires human review", () => {
  assert.deepEqual(validateDraftCopilotOutput("Try our fasting shiro today.", { knownMenuNames: ["Shiro"] }), {
    ok: true,
    text: "Try our fasting shiro today.",
    requiresHumanReview: true,
  });
});

test("draft output rejects payment, order, price, and tracking authority claims", () => {
  for (const text of [
    "Payment is verified; start preparing the order.",
    "Order confirmed and ready.",
    "Change the price to 500 ETB.",
    "Send the tracking token to the customer.",
  ]) assert.deepEqual(validateDraftCopilotOutput(text), { ok: false, code: "consequential_claim" });
});

test("draft output rejects unsupported price claims and oversized output", () => {
  assert.deepEqual(validateDraftCopilotOutput("Special price: 999 ETB"), { ok: false, code: "unsupported_price_claim" });
  assert.deepEqual(validateDraftCopilotOutput("x".repeat(6_001)), { ok: false, code: "output_too_large" });
});
