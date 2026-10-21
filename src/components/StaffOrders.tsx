import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import "../site.css";

type StaffItem = { name: string; size: string | null; quantity: number; lineTotalEtb: number };
type StaffOrder = {
  id: string; public_reference: string; created_at: string; status: string; payment_method: string; payment_status: string;
  customer_name: string; customer_phone: string; fulfillment: string; delivery_address: string | null; delivery_landmark: string | null;
  delivery_notes: string | null; special_instructions: string | null; guest_count: number | null; table_number: string | null; subtotal_etb: number; delivery_fee_etb: number | null;
  total_etb: number | null; estimated_ready_at: string | null; wants_whatsapp_updates: boolean;
  customer_payment_reference: string | null; items: StaffItem[];
};
const money = (value: number) => Number(value).toLocaleString("en-US");
const statusName: Record<string, string> = { received: "New · needs review", confirmed: "Confirmed", preparing: "Preparing", ready_for_pickup: "Ready for pickup", out_for_delivery: "Out for delivery", delivered: "Delivered", completed: "Complete", declined: "Declined", cancelled: "Cancelled" };
const nextActions: Record<string, [string, string][]> = { received: [["confirmed", "Confirm order"], ["declined", "Decline"]], confirmed: [["preparing", "Start preparing"]], preparing: [["ready_for_pickup", "Mark ready for pickup"], ["out_for_delivery", "Send out for delivery"]], ready_for_pickup: [["completed", "Complete order"]], out_for_delivery: [["delivered", "Mark delivered"]], delivered: [["completed", "Complete order"]] };

export default function StaffOrders() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const lastSeen = useRef<string[]>([]);
  const [feeById, setFeeById] = useState<Record<string, string>>({});
  const [etaById, setEtaById] = useState<Record<string, string>>({});
  const [passwordVisible, setPasswordVisible] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);

  const playAlert = useCallback(() => {
    try {
      const context = audioRef.current ?? new AudioContext(); audioRef.current = context;
      const oscillator = context.createOscillator(); const gain = context.createGain();
      oscillator.type = "sine"; oscillator.frequency.value = 880; gain.gain.value = 0.08;
      oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.22);
    } catch { /* Audio is optional and requires a supported browser. */ }
  }, []);

  const loadOrders = useCallback(async (initial = false) => {
    try {
      const response = await fetch("/api/admin/orders", { credentials: "same-origin", cache: "no-store" });
      if (response.status === 401) { setAuthenticated(false); return; }
      const data = await response.json() as { orders?: StaffOrder[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Order queue unavailable.");
      const next = data.orders || [];
      const newIds = next.filter((order) => order.status === "received").map((order) => order.id);
      if (!initial && newIds.some((id) => !lastSeen.current.includes(id))) {
        if (soundEnabled) playAlert();
        if ("Notification" in window && Notification.permission === "granted") new Notification("New Cloud L order", { body: "Open the staff board to review the order." });
      }
      lastSeen.current = next.map((order) => order.id); setOrders(next); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load orders."); }
  }, [playAlert, soundEnabled]);

  useEffect(() => { if (authenticated) { const startup = window.setTimeout(() => { void loadOrders(true); }, 0); const timer = window.setInterval(() => { void loadOrders(); }, 15_000); return () => { window.clearTimeout(startup); window.clearInterval(timer); }; } }, [authenticated, loadOrders]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/login", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "login", password }) });
      const data = await response.json() as { authenticated?: boolean; error?: string };
      if (!response.ok || !data.authenticated) throw new Error(data.error || "Login failed.");
      setPassword(""); setAuthenticated(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Login failed."); }
    finally { setBusy(false); }
  }

  function availableActions(order: StaffOrder) {
    const actions = nextActions[order.status] || [];
    if (order.status === "preparing") return actions.filter(([status]) => order.fulfillment === "delivery" ? status === "out_for_delivery" : status === "ready_for_pickup");
    return actions;
  }

  async function changeStatus(order: StaffOrder, status: string) {
    if (status === "declined" && !window.confirm(`Decline ${order.public_reference}?`)) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(order.id)}`, { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, deliveryFeeEtb: feeById[order.id] === undefined ? order.delivery_fee_etb : Number(feeById[order.id]), estimatedMinutes: etaById[order.id] ? Number(etaById[order.id]) : undefined }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "The order could not be updated.");
      await loadOrders(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The order could not be updated."); }
    finally { setBusy(false); }
  }

  async function verifyPayment(order: StaffOrder) {
    if (!window.confirm(`Have you checked the Telebirr wallet and matched this transaction reference to ${order.public_reference}? Only continue if the payment is visible in the Cloud L receiving account.`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(order.id)}`, { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "verify-payment", confirmed: true }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Payment could not be updated.");
      await loadOrders(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Payment could not be updated."); }
    finally { setBusy(false); }
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
    setAuthenticated(false); setOrders([]);
  }

  if (!authenticated) return <main className="staff-page"><a className="staff-brand" href="/">← Cloud L</a><section className="staff-login"><p className="checkout-form__top">PRIVATE OPERATIONS</p><h1>Staff <em>orders.</em></h1><p>Sign in to review customer requests and update order status.</p><form onSubmit={login}><label className="checkout-label">Staff password<span className="staff-password"><input type={passwordVisible ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.currentTarget.value)} /><button type="button" onClick={() => setPasswordVisible(!passwordVisible)}>{passwordVisible ? "Hide" : "Show"}</button></span></label><button className="staff-button" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>{error && <p className="checkout-error" role="alert">{error}</p>}</form></section></main>;

  return <main className="staff-page"><header className="staff-topbar"><a className="staff-brand" href="/">← Cloud L</a><div><span>PRIVATE STAFF BOARD</span><button type="button" onClick={() => void logout()}>Sign out</button></div></header><section className="staff-board"><div className="staff-heading"><div><p className="tracking-eyebrow">KEBENA · ADDIS ABABA</p><h1>Order <em>board.</em></h1><p>Refreshes every 15 seconds while open. New requests stay at the top.</p></div><div className="staff-controls"><button type="button" onClick={() => void loadOrders(true)}>Refresh</button><button type="button" onClick={() => { setSoundEnabled(true); playAlert(); }}>Enable sound</button><button type="button" onClick={() => { if ("Notification" in window) void Notification.requestPermission(); }}>Allow alerts</button></div></div>{error && <p className="checkout-error" role="alert">{error}</p>}{orders.length === 0 ? <div className="staff-empty">No orders to show yet. New customer requests will appear here.</div> : <div className="staff-order-list">{orders.map((order) => <article className={`staff-order ${order.status === "received" ? "is-new" : ""}`} key={order.id}><header><div><small>{order.public_reference} · {new Date(order.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</small><h2>{order.customer_name}</h2></div><span className={`staff-status status-${order.status}`}>{statusName[order.status] || order.status}</span></header><div className="staff-order__body"><section><h3>Order details</h3><ul>{order.items.map((item, index) => <li key={`${item.name}-${index}`}>{item.quantity} × {item.name}{item.size ? ` · ${item.size}` : ""}<strong>{money(item.lineTotalEtb)} ETB</strong></li>)}</ul><p>Menu subtotal <strong>{money(order.subtotal_etb)} ETB</strong></p>{order.delivery_fee_etb !== null && <p>Delivery <strong>{money(order.delivery_fee_etb)} ETB</strong></p>}{order.total_etb !== null && <p>Confirmed total <strong>{money(order.total_etb)} ETB</strong></p>}</section><section><h3>Customer & fulfillment</h3><a href={`tel:${order.customer_phone}`}>{order.customer_phone}</a><p>{order.fulfillment === "delivery" ? "Delivery" : order.fulfillment === "pickup" ? "Pickup" : "Dine in"}</p>{order.delivery_address && <p>{order.delivery_address}{order.delivery_landmark ? ` · ${order.delivery_landmark}` : ""}</p>}{order.delivery_notes && <p>Delivery notes: {order.delivery_notes}</p>}{order.special_instructions && <p>Kitchen: {order.special_instructions}</p>}{order.guest_count && <p>Guests: {order.guest_count}</p>}{order.table_number && <p>Table: {order.table_number}</p>}</section></div><footer className="staff-order__actions">{order.status === "received" && order.fulfillment === "delivery" && <label>Delivery fee (ETB)<input inputMode="numeric" type="number" min="0" max="10000" value={feeById[order.id] ?? ""} onChange={(event) => setFeeById({ ...feeById, [order.id]: event.currentTarget.value })} placeholder="Set before confirming" /></label>}{order.status === "received" && <label>Ready in (minutes)<input inputMode="numeric" type="number" min="1" max="240" value={etaById[order.id] ?? ""} onChange={(event) => setEtaById({ ...etaById, [order.id]: event.currentTarget.value })} placeholder="Optional estimate" /></label>}{order.payment_method === "telebirr_manual" && <span className="staff-payment">Telebirr · {order.payment_status === "submitted" ? `Reference: ${order.customer_payment_reference || "submitted"}` : order.payment_status}</span>}{availableActions(order).map(([status, label]) => <button key={status} type="button" disabled={busy} onClick={() => void changeStatus(order, status)}>{label}</button>)}{order.payment_method === "telebirr_manual" && order.payment_status === "submitted" && <button type="button" disabled={busy} onClick={() => void verifyPayment(order)}>Verify in Telebirr & mark paid</button>}{order.wants_whatsapp_updates && !["declined", "cancelled"].includes(order.status) && <a className="staff-whatsapp" href={`https://wa.me/${order.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello ${order.customer_name}, Cloud L order ${order.public_reference}: ${statusName[order.status] || order.status}. Please use your private tracking link for the latest details. Reply here if you need help.`)}`} target="_blank" rel="noreferrer">Review WhatsApp update ↗</a>}{order.wants_whatsapp_updates && <small className="staff-optin">Customer opted in to manual WhatsApp status updates</small>}</footer></article>)}</div>}</section></main>;
}
