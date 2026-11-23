import { sendNotification } from "./sms-provider.mjs";

/** Claim and process a bounded batch from the durable notification outbox. */
export async function dispatchNotificationOutbox(pool, batchSize = 20, eventKey = null) {
  const client = await pool.connect();
  let claimed = [];
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `WITH candidates AS (
         SELECT id FROM public.notification_outbox
         WHERE ((status = 'pending' AND available_at <= now())
             OR (status = 'sending' AND locked_until < now()))
           AND ($2::text IS NULL OR event_key=$2)
         ORDER BY created_at
         FOR UPDATE SKIP LOCKED
         LIMIT $1
       )
       UPDATE public.notification_outbox AS n
       SET status='sending', attempt_count=n.attempt_count + 1,
           locked_until=now() + interval '3 minutes'
       FROM candidates
       WHERE n.id=candidates.id
       RETURNING n.id, n.channel, n.purpose, n.recipient, n.message, n.metadata, n.attempt_count`,
      [batchSize, eventKey],
    );
    claimed = result.rows;
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }

  let sent = 0;
  let deferred = 0;
  for (const item of claimed) {
    try {
      const result = await sendNotification({
        channel: item.channel,
        purpose: item.purpose,
        to: item.recipient,
        message: item.message,
        metadata: item.metadata || {},
      });
      await pool.query(
        "UPDATE public.notification_outbox SET status='sent', sent_at=now(), locked_until=NULL, provider_message_id=$2, last_error=NULL WHERE id=$1",
        [item.id, result?.messageId ?? null],
      );
      sent += 1;
    } catch (error) {
      const attempt = Number(item.attempt_count);
      const retryable = error?.retryable !== false;
      const exhausted = attempt >= 6 || !retryable;
      const delayMinutes = Math.min(60, 2 ** Math.min(attempt, 6));
      const detail = error instanceof Error ? error.message.slice(0, 300) : "Unknown notification provider error";
      await pool.query(
        `UPDATE public.notification_outbox
         SET status=$2, locked_until=NULL,
             available_at=now() + ($3::integer * interval '1 minute'),
             last_error=$4
         WHERE id=$1`,
        [item.id, exhausted ? "failed" : "pending", delayMinutes, detail],
      );
      deferred += 1;
    }
  }
  return { claimed: claimed.length, sent, deferred };
}

/** Compatibility export retained for existing API routes. */
export const dispatchSmsOutbox = dispatchNotificationOutbox;
