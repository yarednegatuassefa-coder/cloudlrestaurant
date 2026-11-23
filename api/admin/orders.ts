import { timingSafeEqual } from "node:crypto";
import { pool, reject, validSession, type ApiReq, type ApiRes } from "../_server.js";
import { dispatchSmsOutbox } from "../../lib/server/dispatch-sms.mjs";

function cronAuthorized(req: ApiReq) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.authorization;
  const supplied = Array.isArray(header) ? header[0] : header;
  if (!secret || !supplied?.startsWith("Bearer ")) return false;
  const token = Buffer.from(supplied.slice(7));
  const expected = Buffer.from(secret);
  return token.length === expected.length && timingSafeEqual(token, expected);
}

export default async function handler(req: ApiReq, res: ApiRes) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return reject(res, 405, "Use GET."); }
  if (cronAuthorized(req)) {
    if (!process.env.DATABASE_URL) return reject(res, 503, "Order service is not configured.");
    if (process.env.SMS_PROVIDER !== "uplink" || process.env.UPLINK_SMS_ENABLED !== "true") return res.status(503).json({ paused: true, reason: "SMS provider is not enabled or its API contract is not verified." });
    try { return res.status(200).json(await dispatchSmsOutbox(pool)); }
    catch (error) {
      console.error("sms_outbox_dispatch_failed", error instanceof Error ? error.message : "unknown");
      return reject(res, 503, "SMS notifications could not be dispatched.");
    }
  }
  if (!validSession(req)) return reject(res, 401, "Staff login required.");
  if (!process.env.DATABASE_URL) return reject(res, 503, "Order service is not configured.");
  try {
    const result = await pool.query(
      `SELECT o.id, o.public_reference, o.created_at, o.status, o.payment_method,
              COALESCE(NULLIF(o.payment_destination_snapshot,'{}'::jsonb),(SELECT jsonb_build_object('id',p.id,'label',p.label,'payment_type',p.payment_type,'bank_name',p.bank_name,'recipient_name',p.recipient_name,'phone_number',p.phone_number,'account_number',p.account_number,'merchant_id',p.merchant_id,'instructions',p.instructions,'qr_asset_id',p.qr_asset_id) FROM public.payment_methods p WHERE p.id=o.payment_method)) AS payment_destination_snapshot,
              o.payment_status, o.customer_name, o.customer_phone,
              o.fulfillment, o.delivery_address, o.delivery_landmark, o.delivery_notes, o.delivery_latitude, o.delivery_longitude, o.delivery_zone_id, (SELECT z.name FROM public.delivery_zones z WHERE z.id=o.delivery_zone_id) AS delivery_zone_name, o.special_instructions, o.guest_count, o.table_number,
              o.subtotal_etb, o.delivery_fee_etb, o.total_etb, o.estimated_ready_at, o.wants_whatsapp_updates, o.wants_sms_updates, o.wants_sms_marketing,
              (SELECT json_build_object('rating', f.rating, 'comment', f.comment, 'created_at', f.created_at) FROM public.order_feedback f WHERE f.order_id=o.id) AS feedback,
              o.customer_payment_reference, o.customer_payment_submitted_at,
              (SELECT e.message FROM public.order_events e WHERE e.order_id=o.id AND e.event_type='status_changed' AND e.status='needs_clarification' ORDER BY e.created_at DESC LIMIT 1) AS clarification_message,
              COALESCE(json_agg(json_build_object('name', i.name, 'nameAmharic', i.name_amharic, 'menuItemId', i.menu_item_id, 'size', i.size, 'quantity', i.quantity, 'unitPriceEtb', i.unit_price_etb, 'lineTotalEtb', i.line_total_etb) ORDER BY i.id) FILTER (WHERE i.id IS NOT NULL), '[]') AS items
       FROM public.orders o LEFT JOIN public.order_items i ON i.order_id=o.id
       WHERE o.created_at > now() - interval '14 days'
       GROUP BY o.id ORDER BY o.created_at DESC LIMIT 100`,
    );
    return res.status(200).json({ orders: result.rows });
  } catch (error) {
    console.error("staff_order_list_failed", error instanceof Error ? error.message : "unknown");
    return reject(res, 503, "The staff order board is temporarily unavailable.");
  }
}
