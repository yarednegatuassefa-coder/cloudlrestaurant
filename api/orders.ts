import { createHash, randomBytes } from "node:crypto";
import { pool } from "./_server.js";
import catalogData from "./_catalog.json" with { type: "json" };

type Req = { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown; socket?: { remoteAddress?: string } };
type Res = { status: (code: number) => Res; setHeader: (name: string, value: string | number) => void; json: (data: unknown) => void; end: () => void };
type CatalogEntry = { id: string; name: string; nameAmharic: string; price: number; size?: string };
const catalog = new Map((catalogData as CatalogEntry[]).map((item) => [item.id, item]));
const rate = new Map<string, { count: number; until: number }>();

function reply(res: Res, status: number, data: unknown) { res.status(status).json(data); }
function originAllowed(req: Req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  return ["https://www.cloudlrestaurant.com", "https://cloudlrestaurant.com"].includes(Array.isArray(origin) ? origin[0] : origin);
}
function tokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }
function makeReference() {
  const date = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Addis_Ababa", year: "2-digit", month: "2-digit", day: "2-digit" }).format(new Date()).split("/").reverse().join("");
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  let n = BigInt(`0x${randomBytes(5).toString("hex")}`);
  let suffix = "";
  for (let i = 0; i < 8; i++) { suffix = alphabet[Number(n & 31n)] + suffix; n >>= 5n; }
  return `CL-${date}-${suffix}`;
}
function normalizePhone(value: unknown) {
  if (typeof value !== "string") return "";
  let phone = value.replace(/[\s().-]/g, "");
  if (/^09\d{8}$/.test(phone)) phone = `+251${phone.slice(1)}`;
  if (/^9\d{8}$/.test(phone)) phone = `+251${phone}`;
  if (/^2519\d{8}$/.test(phone)) phone = `+${phone}`;
  return /^\+2519\d{8}$/.test(phone) ? phone : "";
}
function validString(value: unknown, max: number) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function rateLimited(req: Req) {
  const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  const now = Date.now(); const slot = rate.get(ip);
  if (!slot || now >= slot.until) { rate.set(ip, { count: 1, until: now + 60_000 }); return false; }
  slot.count += 1; return slot.count > 8;
}

export default async function handler(req: Req, res: Res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  if (!originAllowed(req)) return reply(res, 403, { error: "This request is not allowed from this website." });
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return reply(res, 405, { error: "Use POST." }); }
  if (!process.env.DATABASE_URL) return reply(res, 503, { error: "Online ordering is temporarily unavailable. Please use WhatsApp to request your order." });
  const body = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
  const action = body.action;

  if (action === "create") {
    if (rateLimited(req)) return reply(res, 429, { error: "Please wait a moment before trying again." });
    const name = validString(body.customerName, 120);
    const phone = normalizePhone(body.customerPhone);
    const fulfillment = body.fulfillment;
    const paymentMethod = body.paymentMethod;
    const rows = Array.isArray(body.items) ? body.items : [];
    const address = validString(body.deliveryAddress, 400);
    if (name.length < 2 || !phone) return reply(res, 400, { error: "Enter your name and an Ethiopian mobile number, such as +251 9…" });
    if (!["pickup", "delivery", "dine_in"].includes(String(fulfillment))) return reply(res, 400, { error: "Choose pickup, delivery, or dine-in." });
    if (!["cash", "telebirr_manual", "bunna_bank_qr_manual", "dashen_bank_manual"].includes(String(paymentMethod))) return reply(res, 400, { error: "Choose one of the available payment methods." });
    if (fulfillment === "delivery" && address.length < 5) return reply(res, 400, { error: "Add the delivery address so staff can confirm coverage and fee." });
    if (rows.length < 1 || rows.length > 30) return reply(res, 400, { error: "Your order must contain 1–30 menu lines." });
    const items: (CatalogEntry & { quantity: number })[] = [];
    for (const row of rows) {
      if (!row || typeof row !== "object") return reply(res, 400, { error: "One of the selected menu items is invalid." });
      const selection = row as Record<string, unknown>;
      const entry = catalog.get(String(selection.id || ""));
      const quantity = Number(selection.quantity);
      if (!entry || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) return reply(res, 400, { error: "A menu item or quantity is no longer available. Refresh the page and try again." });
      items.push({ ...entry, quantity });
    }
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (!Number.isSafeInteger(subtotal) || subtotal <= 0) return reply(res, 400, { error: "The order total is invalid." });
    const trackingToken = randomBytes(32).toString("base64url");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      let reference = "";
      for (let attempt = 0; attempt < 3; attempt++) {
        const candidate = makeReference();
        const result = await client.query("SELECT 1 FROM public.orders WHERE public_reference=$1", [candidate]);
        if (result.rowCount === 0) { reference = candidate; break; }
      }
      if (!reference) throw new Error("Unable to allocate order reference");
      const inserted = await client.query(
        `INSERT INTO public.orders (public_reference, tracking_token_hash, payment_method, payment_status, fulfillment, customer_name, customer_phone, delivery_address, delivery_landmark, delivery_notes, special_instructions, guest_count, table_number, subtotal_etb, total_etb, wants_whatsapp_updates)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14,$15) RETURNING id`,
        [reference, tokenHash(trackingToken), paymentMethod, "unpaid", fulfillment, name, phone, fulfillment === "delivery" ? address : null, validString(body.deliveryLandmark, 200) || null, validString(body.deliveryNotes, 500) || null, validString(body.specialInstructions, 500) || null, Number.isInteger(body.guestCount) && Number(body.guestCount) >= 1 && Number(body.guestCount) <= 40 ? Number(body.guestCount) : null, validString(body.tableNumber, 40) || null, subtotal, body.wantsWhatsAppUpdates === true],
      );
      const orderId = inserted.rows[0].id as string;
      for (const item of items) await client.query(
        "INSERT INTO public.order_items (order_id, menu_item_id, name, name_amharic, size, unit_price_etb, quantity) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [orderId, item.id, item.name, item.nameAmharic, item.size ?? null, item.price, item.quantity],
      );
      await client.query("INSERT INTO public.order_events (order_id, actor_type, event_type, status, message, customer_visible) VALUES ($1,'customer','order_received','received','Order request received — awaiting staff confirmation.',true)", [orderId]);
      await client.query("COMMIT");
      return reply(res, 201, { reference, trackingUrl: `https://www.cloudlrestaurant.com/#track/${trackingToken}`, status: "received", subtotalEtb: subtotal, currency: "ETB" });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      console.error("order_create_failed", error instanceof Error ? error.message : "unknown");
      return reply(res, 500, { error: "We could not save the order. Your cart is unchanged; please try again or use WhatsApp." });
    } finally { client.release(); }
  }

  if (action === "track") {
    const token = typeof body.token === "string" ? body.token : "";
    if (!/^[A-Za-z0-9_-]{40,50}$/.test(token)) return reply(res, 400, { error: "Tracking link is not valid." });
    try {
      const result = await pool.query(
        `SELECT o.public_reference, o.created_at, o.status, o.fulfillment, o.payment_method, o.payment_status, o.subtotal_etb, o.delivery_fee_etb, o.total_etb, o.estimated_ready_at,
                COALESCE(json_agg(json_build_object('name', i.name, 'nameAmharic', i.name_amharic, 'size', i.size, 'quantity', i.quantity, 'unitPriceEtb', i.unit_price_etb, 'lineTotalEtb', i.line_total_etb) ORDER BY i.id) FILTER (WHERE i.id IS NOT NULL), '[]') AS items,
                COALESCE((SELECT json_agg(json_build_object('at', e.created_at, 'status', e.status, 'message', e.message) ORDER BY e.created_at) FROM public.order_events e WHERE e.order_id=o.id AND e.customer_visible=true), '[]') AS events
         FROM public.orders o LEFT JOIN public.order_items i ON i.order_id=o.id WHERE o.tracking_token_hash=$1 GROUP BY o.id`,
        [tokenHash(token)],
      );
      if (!result.rowCount) return reply(res, 404, { error: "We could not find that order. Check the private tracking link." });
      return reply(res, 200, { order: result.rows[0] });
    } catch (error) {
      console.error("order_track_failed", error instanceof Error ? error.message : "unknown");
      return reply(res, 503, { error: "Tracking is temporarily unavailable. Please try again shortly." });
    }
  }

  if (action === "payment-reference") {
    const token = typeof body.token === "string" ? body.token : "";
    const paymentReference = validString(body.paymentReference, 100);
    if (!/^[A-Za-z0-9_-]{40,50}$/.test(token) || paymentReference.length < 4) return reply(res, 400, { error: "Enter the transaction reference or receipt ID shown by your payment method." });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query("SELECT id, payment_method, payment_status FROM public.orders WHERE tracking_token_hash=$1 FOR UPDATE", [tokenHash(token)]);
      if (!result.rowCount) { await client.query("ROLLBACK"); return reply(res, 404, { error: "We could not find that order." }); }
      const order = result.rows[0];
      if (!["telebirr_manual", "bunna_bank_qr_manual", "dashen_bank_manual"].includes(order.payment_method) || !["awaiting_transfer", "submitted"].includes(order.payment_status)) { await client.query("ROLLBACK"); return reply(res, 409, { error: "This order is not waiting for a manual payment reference." }); }
      await client.query("UPDATE public.orders SET customer_payment_reference=$2, customer_payment_submitted_at=now(), payment_status='submitted', updated_at=now() WHERE id=$1", [order.id, paymentReference]);
      await client.query("INSERT INTO public.order_events (order_id, actor_type, event_type, message, customer_visible) VALUES ($1,'customer','payment_submitted','Manual payment reference submitted — awaiting staff verification.',true)", [order.id]);
      await client.query("COMMIT");
      return reply(res, 200, { paymentStatus: "submitted", message: "Reference received. Cloud L staff will verify the transfer manually." });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      console.error("payment_reference_failed", error instanceof Error ? error.message : "unknown");
      return reply(res, 503, { error: "We could not record that reference just now. Please try again." });
    } finally { client.release(); }
  }

  return reply(res, 400, { error: "Choose create, track, or payment-reference." });
}
