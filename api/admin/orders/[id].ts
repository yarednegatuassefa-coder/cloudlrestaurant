import { pool, isAllowedOrigin, reject, validSession, type ApiReq, type ApiRes } from "../../_server.js";

const transitions: Record<string, string[]> = {
  received: ["confirmed", "needs_clarification", "declined", "cancelled"],
  needs_clarification: ["confirmed", "declined", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready_for_pickup", "out_for_delivery", "cancelled"],
  ready_for_pickup: ["completed", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: ["completed"],
  completed: [], declined: [], cancelled: [],
};
const customerMessages: Record<string, string> = {
  confirmed: "Your order is confirmed by Cloud L.", preparing: "Cloud L is preparing your order.",
  ready_for_pickup: "Your order is ready for pickup.", out_for_delivery: "Your order is on the way.",
  delivered: "Your order has been delivered.", completed: "Your order is complete.",
  declined: "Cloud L is unable to accept this order. Please contact us for assistance.",
  cancelled: "This order has been cancelled. Please contact Cloud L if you have questions.",
};
const manualPaymentMethods = new Set(["telebirr_manual", "bunna_bank_qr_manual", "dashen_bank_manual"]);

type RouteReq = ApiReq & { query?: Record<string, string | string[] | undefined> };
export default async function handler(req: RouteReq, res: ApiRes) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "PATCH") { res.setHeader("Allow", "PATCH"); return reject(res, 405, "Use PATCH."); }
  if (!isAllowedOrigin(req)) return reject(res, 403, "This request is not allowed.");
  if (!validSession(req)) return reject(res, 401, "Staff login required.");
  if (!process.env.DATABASE_URL) return reject(res, 503, "Order service is not configured.");
  const orderId = Array.isArray(req.query?.id) ? req.query?.id[0] : req.query?.id;
  if (!orderId || !/^[0-9a-f-]{36}$/i.test(orderId)) return reject(res, 400, "Order ID is invalid.");
  const body = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const found = await client.query("SELECT id, status, fulfillment, payment_method, payment_status, subtotal_etb FROM public.orders WHERE id=$1 FOR UPDATE", [orderId]);
    if (!found.rowCount) { await client.query("ROLLBACK"); return reject(res, 404, "Order not found."); }
    const order = found.rows[0];
    if (body.action === "verify-payment") {
      if (!manualPaymentMethods.has(order.payment_method) || order.payment_status !== "submitted" || body.confirmed !== true) { await client.query("ROLLBACK"); return reject(res, 409, "Only a submitted manual transfer can be marked paid, after checking the matching receiving account."); }
      await client.query("UPDATE public.orders SET payment_status='paid', staff_payment_verified_at=now(), updated_at=now() WHERE id=$1", [orderId]);
      await client.query("INSERT INTO public.order_events (order_id, actor_type, actor_label, event_type, message, customer_visible) VALUES ($1,'staff','Cloud L staff','payment_verified','Manual payment verified by Cloud L staff.',true)", [orderId]);
      await client.query("COMMIT");
      return res.status(200).json({ paymentStatus: "paid" });
    }
    const next = typeof body.status === "string" ? body.status : "";
    if (!transitions[order.status]?.includes(next)) { await client.query("ROLLBACK"); return reject(res, 409, "That status change is not allowed from the current state."); }
    const clarificationMessage = typeof body.message === "string" ? body.message.trim() : "";
    if (next === "needs_clarification" && (clarificationMessage.length < 5 || clarificationMessage.length > 500)) {
      await client.query("ROLLBACK");
      return reject(res, 400, "Enter a customer-facing clarification message between 5 and 500 characters.");
    }
    let deliveryFee: number | null = null;
    let total: number | null = null;
    let eta: string | null = null;
    if (next === "confirmed") {
      if (order.fulfillment === "delivery") {
        deliveryFee = Number(body.deliveryFeeEtb);
        if (!Number.isInteger(deliveryFee) || deliveryFee < 0 || deliveryFee > 10_000) { await client.query("ROLLBACK"); return reject(res, 400, "Set the delivery fee (use 0 if delivery is free) before confirming."); }
      }
      total = Number(order.subtotal_etb) + (deliveryFee ?? 0);
      const minutes = Number(body.estimatedMinutes);
      if (Number.isInteger(minutes) && minutes >= 1 && minutes <= 240) eta = new Date(Date.now() + minutes * 60_000).toISOString();
      await client.query(
        "UPDATE public.orders SET status='confirmed', delivery_fee_etb=$2, total_etb=$3, estimated_ready_at=$4, payment_status=CASE WHEN payment_method <> 'cash' THEN 'awaiting_transfer' ELSE payment_status END, updated_at=now() WHERE id=$1",
        [orderId, deliveryFee, total, eta],
      );
    } else {
      await client.query("UPDATE public.orders SET status=$2, updated_at=now() WHERE id=$1", [orderId, next]);
    }
    const message = next === "needs_clarification" ? clarificationMessage : customerMessages[next] || "Your Cloud L order has been updated.";
    await client.query("INSERT INTO public.order_events (order_id, actor_type, actor_label, event_type, status, message, customer_visible) VALUES ($1,'staff','Cloud L staff','status_changed',$2,$3,true)", [orderId, next, message]);
    await client.query("COMMIT");
    return res.status(200).json({ status: next, totalEtb: total, deliveryFeeEtb: deliveryFee, estimatedReadyAt: eta });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("staff_order_update_failed", error instanceof Error ? error.message : "unknown");
    return reject(res, 503, "The order could not be updated. Please retry.");
  } finally { client.release(); }
}
