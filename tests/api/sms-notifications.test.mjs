import test from "node:test";
import assert from "node:assert/strict";
import { enqueueNotification, enqueueSms } from "../../lib/server/notifications.mjs";
import { shouldSendTransactionalStatusSms } from "../../lib/server/notification-policy.mjs";

const orderId = "00000000-0000-4000-8000-000000000001";

test("enqueueSms checks explicit consent and writes a deduplicated transactional notification", async () => {
  const calls = [];
  const client = {
    async query(sql, values) {
      calls.push({ sql, values });
      if (/SELECT status/.test(sql)) return { rows: [{ status: "granted" }] };
      return { rowCount: 1 };
    },
  };

  await enqueueSms(client, {
    orderId,
    eventKey: "order-received:" + orderId,
    recipient: "+251911123456",
    message: "Cloud L received your order.",
  });

  assert.equal(calls.length, 2);
  assert.match(calls[0].sql, /customer_notification_consents/);
  assert.deepEqual(calls[0].values, ["+251911123456", "sms", "transactional"]);
  assert.match(calls[1].sql, /INSERT INTO public\.notification_outbox/);
  assert.match(calls[1].sql, /ON CONFLICT \(event_key\) DO NOTHING/);
  assert.deepEqual(calls[1].values.slice(0, 9), [
    "order", orderId, orderId, "sms", "transactional", null,
    "order-received:" + orderId, "+251911123456", "Cloud L received your order.",
  ]);
});

test("notification enqueue rejects absent or revoked consent", async () => {
  const client = { query: async () => ({ rows: [{ status: "revoked" }] }) };
  await assert.rejects(
    enqueueSms(client, { orderId, eventKey: "test", recipient: "+251911123456", message: "Hello" }),
    (error) => error.code === "NOTIFICATION_CONSENT_REQUIRED" && error.retryable === false,
  );
});

test("notification enqueue supports future channels only with matching channel consent", async () => {
  const calls = [];
  const client = {
    async query(sql, values) {
      calls.push({ sql, values });
      if (/SELECT status/.test(sql)) return { rows: [{ status: "granted" }] };
      return { rowCount: 1 };
    },
  };
  await enqueueNotification(client, {
    entityType: "customer",
    entityId: orderId,
    channel: "whatsapp",
    purpose: "marketing",
    eventKey: "whatsapp-campaign:" + orderId,
    recipient: "+251911123456",
    message: "Cloud L has a new offer.",
  });
  assert.deepEqual(calls[0].values, ["+251911123456", "whatsapp", "marketing"]);
  assert.deepEqual(calls[1].values.slice(0, 5), ["customer", orderId, null, "whatsapp", "marketing"]);
});

test("transactional SMS policy suppresses low-value status changes", () => {
  assert.equal(shouldSendTransactionalStatusSms("confirmed"), true);
  assert.equal(shouldSendTransactionalStatusSms("ready_for_pickup"), true);
  assert.equal(shouldSendTransactionalStatusSms("out_for_delivery"), true);
  assert.equal(shouldSendTransactionalStatusSms("cancelled"), true);
  assert.equal(shouldSendTransactionalStatusSms("preparing"), false);
  assert.equal(shouldSendTransactionalStatusSms("needs_clarification"), false);
  assert.equal(shouldSendTransactionalStatusSms("completed"), false);
});
