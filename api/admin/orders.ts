import { pool, reject, validSession, type ApiReq, type ApiRes } from "../_server.js";

export default async function handler(req: ApiReq, res: ApiRes) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return reject(res, 405, "Use GET."); }
  if (!validSession(req)) return reject(res, 401, "Staff login required.");
  if (!process.env.DATABASE_URL) return reject(res, 503, "Order service is not configured.");
  try {
    const result = await pool.query(
      `SELECT o.id, o.public_reference, o.created_at, o.status, o.payment_method,
              COALESCE(NULLIF(o.payment_destination_snapshot,'{}'::jsonb),(SELECT jsonb_build_object('id',p.id,'label',p.label,'payment_type',p.payment_type,'bank_name',p.bank_name,'recipient_name',p.recipient_name,'phone_number',p.phone_number,'account_number',p.account_number,'merchant_id',p.merchant_id,'instructions',p.instructions,'qr_asset_id',p.qr_asset_id) FROM public.payment_methods p WHERE p.id=o.payment_method)) AS payment_destination_snapshot,
              o.payment_status, o.customer_name, o.customer_phone,
              o.fulfillment, o.delivery_address, o.delivery_landmark, o.delivery_notes, o.special_instructions, o.guest_count, o.table_number,
              o.subtotal_etb, o.delivery_fee_etb, o.total_etb, o.estimated_ready_at, o.wants_whatsapp_updates,
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
