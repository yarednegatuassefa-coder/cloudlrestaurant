import test from "node:test";
import assert from "node:assert/strict";
import { enqueueSms } from "../../lib/server/notifications.mjs";

test("enqueueSms writes a deduplicated notification into the caller's transaction", async () => {
  const calls = [];
  const client = {
    async query(sql, values) {
      calls.push({ sql, values });
      return { rowCount: 1 };
    },
  };

  await enqueueSms(client, {
    orderId: "00000000-0000-4000-8000-000000000001",
    eventKey: "order-received:00000000-0000-4000-8000-000000000001",
    recipient: "+251911123456",
    message: "Cloud L received your order.",
  });

  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /INSERT INTO public\.notification_outbox/);
  assert.match(calls[0].sql, /ON CONFLICT \(event_key\) DO NOTHING/);
  assert.deepEqual(calls[0].values, [
    "00000000-0000-4000-8000-000000000001",
    "order-received:00000000-0000-4000-8000-000000000001",
    "+251911123456",
    "Cloud L received your order.",
  ]);
});

test("enqueueSms rejects incomplete payloads", async () => {
  await assert.rejects(
    enqueueSms({ query: async () => ({}) }, { orderId: "order-1" }),
    /requires orderId, eventKey, recipient and message/,
  );
});
