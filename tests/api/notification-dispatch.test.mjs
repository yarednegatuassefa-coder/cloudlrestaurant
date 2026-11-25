import test from "node:test";
import assert from "node:assert/strict";
import { dispatchNotificationOutbox } from "../../lib/server/dispatch-sms.mjs";

function fixture(rows) {
  const calls = [];
  const client = {
    async query(sql, values) {
      calls.push({ target: "client", sql, values });
      if (/WITH candidates AS/.test(sql)) return { rows };
      return { rows: [], rowCount: 1 };
    },
    release() { calls.push({ target: "client", release: true }); },
  };
  const pool = {
    async connect() { return client; },
    async query(sql, values) {
      calls.push({ target: "pool", sql, values });
      return { rowCount: 1 };
    },
  };
  return { pool, calls };
}

const notification = (id, attempt_count = 1) => ({
  id,
  channel: "sms",
  purpose: "transactional",
  recipient: "+251911123456",
  message: "Cloud L order update",
  metadata: { eventKey: "order-status:" + id },
  attempt_count,
});

test("dispatcher claims a bounded batch and marks successful sends with provider ID", async () => {
  const { pool, calls } = fixture([notification("n-1")]);
  const sent = [];
  const result = await dispatchNotificationOutbox(pool, 5, null, async (message) => {
    sent.push(message);
    return { messageId: "provider-123" };
  });

  assert.deepEqual(result, { claimed: 1, sent: 1, deferred: 0 });
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0], {
    channel: "sms",
    purpose: "transactional",
    to: "+251911123456",
    message: "Cloud L order update",
    metadata: { eventKey: "order-status:n-1" },
  });
  const claim = calls.find((call) => /WITH candidates AS/.test(call.sql));
  assert.deepEqual(claim.values, [5, null]);
  assert.match(claim.sql, /FOR UPDATE SKIP LOCKED/);
  assert.match(claim.sql, /locked_until < now\(\)/);
  const sentUpdate = calls.find((call) => call.target === "pool" && /status='sent'/.test(call.sql));
  assert.deepEqual(sentUpdate.values, ["n-1", "provider-123"]);
  assert.ok(calls.some((call) => call.release));
});

test("dispatcher schedules transient provider failures with exponential backoff", async () => {
  const { pool, calls } = fixture([notification("n-retry", 2)]);
  const result = await dispatchNotificationOutbox(pool, 20, "order-status:n-retry", async () => {
    const error = new Error("temporary gateway timeout");
    error.retryable = true;
    throw error;
  });

  assert.deepEqual(result, { claimed: 1, sent: 0, deferred: 1 });
  const retry = calls.find((call) => call.target === "pool" && /available_at=now\(\)/.test(call.sql));
  assert.deepEqual(retry.values, ["n-retry", "pending", 4, "temporary gateway timeout"]);
});

test("dispatcher permanently fails non-retryable notifications", async () => {
  const { pool, calls } = fixture([notification("n-invalid", 1)]);
  const result = await dispatchNotificationOutbox(pool, 20, null, async () => {
    const error = new Error("recipient rejected");
    error.retryable = false;
    throw error;
  });

  assert.deepEqual(result, { claimed: 1, sent: 0, deferred: 1 });
  const failed = calls.find((call) => call.target === "pool" && /available_at=now\(\)/.test(call.sql));
  assert.equal(failed.values[1], "failed");
});

test("dispatcher stops retrying after the sixth attempt", async () => {
  const { pool, calls } = fixture([notification("n-exhausted", 6)]);
  const result = await dispatchNotificationOutbox(pool, 20, null, async () => {
    throw new Error("gateway unavailable");
  });

  assert.deepEqual(result, { claimed: 1, sent: 0, deferred: 1 });
  const failed = calls.find((call) => call.target === "pool" && /available_at=now\(\)/.test(call.sql));
  assert.equal(failed.values[1], "failed");
  assert.equal(failed.values[2], 60);
});

test("dispatcher continues processing the batch after one notification fails", async () => {
  const { pool, calls } = fixture([notification("n-ok"), notification("n-fail")]);
  const result = await dispatchNotificationOutbox(pool, 2, null, async ({ metadata }) => {
    if (metadata.eventKey.endsWith("n-fail")) throw new Error("temporary failure");
    return { messageId: "ok-1" };
  });

  assert.deepEqual(result, { claimed: 2, sent: 1, deferred: 1 });
  assert.equal(calls.filter((call) => call.target === "pool").length, 2);
});

test("dispatcher rolls back a failed claim and never calls the provider", async () => {
  const calls = [];
  let released = false;
  let sends = 0;
  const pool = {
    async connect() {
      return {
        async query(sql) {
          calls.push(sql);
          if (/WITH candidates AS/.test(sql)) throw new Error("database unavailable");
          return { rows: [] };
        },
        release() { released = true; },
      };
    },
  };

  await assert.rejects(
    dispatchNotificationOutbox(pool, 20, null, async () => { sends += 1; }),
    /database unavailable/,
  );
  assert.ok(calls.includes("ROLLBACK"));
  assert.equal(released, true);
  assert.equal(sends, 0);
});
