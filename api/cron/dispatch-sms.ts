import { timingSafeEqual } from "node:crypto";
import { pool } from "../_server.js";
import { sendSms } from "../../lib/server/sms-provider.mjs";

type Req = { method?: string; headers: Record<string, string | string[] | undefined> };
type Res = { status: (code: number) => Res; setHeader: (name: string, value: string | number) => void; json: (data: unknown) => void };

function authorized(req: Req) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.authorization;
  const supplied = Array.isArray(header) ? header[0] : header;
  if (!secret || !supplied?.startsWith("Bearer ")) return false;
  const token = Buffer.from(supplied.slice(7));
  const expected = Buffer.from(secret);
  return token.length === expected.length && timingSafeEqual(token, expected);
}

export default async function handler(req: Req, res: Res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Use GET or POST." });
  }
  if (!authorized(req)) return res.status(401).json({ error: "Unauthorized." });
  if (process.env.SMS_PROVIDER !== "uplink" || process.env.UPLINK_SMS_ENABLED !== "true") {
    return res.status(503).json({ paused: true, reason: "SMS provider is not enabled or its API contract is not verified." });
  }

  const client = await pool.connect();
  let claimed: Array<{ id: number; recipient: string; message: string; attempt_count: number }> = [];
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `WITH candidates AS (
         SELECT id FROM public.notification_outbox
         WHERE (status = 'pending' AND available_at <= now())
            OR (status = 'sending' AND locked_until < now())
         ORDER BY created_at
         FOR UPDATE SKIP LOCKED
         LIMIT 20
       )
       UPDATE public.notification_outbox AS n
       SET status='sending', attempt_count=n.attempt_count + 1,
           locked_until=now() + interval '3 minutes'
       FROM candidates
       WHERE n.id=candidates.id
       RETURNING n.id, n.recipient, n.message, n.attempt_count`,
    );
    claimed = result.rows;
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("sms_outbox_claim_failed", error instanceof Error ? error.message : "unknown");
    return res.status(503).json({ error: "Could not claim SMS notifications." });
  } finally {
    client.release();
  }

  let sent = 0;
  let deferred = 0;
  for (const item of claimed) {
    try {
      const result = await sendSms({ to: item.recipient, message: item.message });
      await pool.query(
        "UPDATE public.notification_outbox SET status='sent', sent_at=now(), locked_until=NULL, provider_message_id=$2, last_error=NULL WHERE id=$1",
        [item.id, result?.messageId ?? null],
      );
      sent += 1;
    } catch (error) {
      const attempt = Number(item.attempt_count);
      const retryable = (error as { retryable?: boolean })?.retryable !== false;
      const exhausted = attempt >= 6 || !retryable;
      const delayMinutes = Math.min(60, 2 ** Math.min(attempt, 6));
      const detail = error instanceof Error ? error.message.slice(0, 300) : "Unknown SMS provider error";
      await pool.query(
        `UPDATE public.notification_outbox
         SET status=$2, locked_until=NULL, available_at=now() + ($3::text || ' minutes')::interval,
             last_error=$4
         WHERE id=$1`,
        [item.id, exhausted ? "failed" : "pending", delayMinutes, detail],
      );
      deferred += 1;
    }
  }
  return res.status(200).json({ claimed: claimed.length, sent, deferred });
}
