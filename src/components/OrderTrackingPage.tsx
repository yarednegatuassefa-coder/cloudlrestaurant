import { useCallback, useEffect, useState, type FormEvent } from "react";

type Event = { at: string; status: string | null; message: string };
type Order = {
  public_reference: string; created_at: string; status: string; fulfillment: string;
  payment_method: string; payment_status: string; subtotal_etb: number;
  delivery_fee_etb: number | null; total_etb: number | null; estimated_ready_at: string | null;
  items: { name: string; nameAmharic: string; size: string | null; quantity: number; unitPriceEtb: number; lineTotalEtb: number }[];
  events: Event[];
};
const money = (value: number) => Number(value).toLocaleString("en-US");
const labels: Record<string, string> = { received: "Received · awaiting confirmation", confirmed: "Confirmed", preparing: "Being prepared", ready_for_pickup: "Ready for pickup", out_for_delivery: "On the way", delivered: "Delivered", completed: "Complete", declined: "Unable to accept", cancelled: "Cancelled" };
const journey = ["received", "confirmed", "preparing", "ready_for_pickup", "completed"];

export default function OrderTrackingPage({ token }: { token: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "track", token }) });
      const data = await response.json() as { order?: Order; error?: string };
      if (!response.ok || !data.order) throw new Error(data.error || "Tracking is unavailable.");
      setOrder(data.order); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Tracking is temporarily unavailable."); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function submitReference(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSending(true); setPaymentMessage("");
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "payment-reference", token, paymentReference }) });
      const data = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(data.error || "We could not record that reference.");
      setPaymentMessage(data.message || "Reference received."); setPaymentReference(""); await load();
    } catch (cause) { setPaymentMessage(cause instanceof Error ? cause.message : "Please try again."); }
    finally { setSending(false); }
  }

  const currentIndex = order ? journey.indexOf(order.status) : -1;
  return <main className="tracking-page"><header className="tracking-header"><a href="/" className="tracking-brand"><img src="/assets/restaurant/cloud-l-logo.svg" alt="Cloud L" /></a><span>PRIVATE ORDER TRACKING</span></header><div className="tracking-card">
    <p className="tracking-eyebrow">CLOUD L · ORDER STATUS</p>
    <h1>Your order, <em>in good hands.</em></h1>
    {loading && <p className="tracking-muted" role="status">Loading your private order status…</p>}
    {!loading && error && <div className="tracking-error" role="alert"><p>{error}</p><button type="button" onClick={() => { setLoading(true); void load(); }}>Try again</button></div>}
    {order && <>
      <div className="tracking-reference"><small>ORDER REFERENCE</small><strong>{order.public_reference}</strong><span>{new Date(order.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span></div>
      <section className="tracking-status" aria-label="Order progress"><div className="tracking-status__current"><span>Current status</span><strong>{labels[order.status] || "In progress"}</strong></div><ol>{journey.map((step, index) => <li key={step} className={`${index <= currentIndex ? "is-done" : ""} ${order.status === step ? "is-current" : ""}`}><i aria-hidden="true" /><span>{labels[step]}</span></li>)}</ol>{order.status === "out_for_delivery" && <p className="tracking-live-status">Your order is on its way.</p>}{order.status === "delivered" && <p className="tracking-live-status">Your order has been delivered.</p>}</section>
      {order.estimated_ready_at && <p className="tracking-eta">Estimated ready · <strong>{new Date(order.estimated_ready_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</strong></p>}
      <section className="tracking-summary"><h2>Your order</h2><ul>{order.items.map((item, index) => <li key={`${item.name}-${index}`}><span>{item.quantity} × {item.name}{item.size ? ` · ${item.size}` : ""}</span><strong>{money(item.lineTotalEtb)} ETB</strong></li>)}</ul><div><span>Menu subtotal</span><strong>{money(order.subtotal_etb)} ETB</strong></div>{order.delivery_fee_etb !== null && <div><span>Delivery</span><strong>{money(order.delivery_fee_etb)} ETB</strong></div>}{order.total_etb !== null && <div className="tracking-summary__total"><span>Confirmed total</span><strong>{money(order.total_etb)} ETB</strong></div>}</section>
      <p className="tracking-fulfillment">{order.fulfillment === "pickup" ? "Pickup at Cloud L" : order.fulfillment === "delivery" ? "Home delivery · details confirmed by staff" : "Dine in at Cloud L"}</p>
      {order.payment_method === "telebirr_manual" && order.status === "confirmed" && order.payment_status === "awaiting_transfer" && order.total_etb !== null && <section className="telebirr-card"><p className="tracking-eyebrow">MANUAL TRANSFER · TELEBIRR</p><h2>Pay the confirmed amount</h2><p>Transfer <strong>{money(order.total_etb)} ETB</strong> to the number below. Before confirming, check that the recipient name in your Telebirr app is <strong>Lidia</strong>.</p><div className="telebirr-number"><div><small>TELEBIRR NUMBER</small><strong>+251 901 120 012</strong></div><button type="button" onClick={() => void navigator.clipboard?.writeText("+251901120012")}>Copy</button></div><p className="telebirr-note">Use your order reference as the transfer note. Do not send money if the displayed recipient does not match Lidia.</p><form onSubmit={submitReference}><label className="tracking-label">Telebirr transaction reference<input required minLength={4} maxLength={100} value={paymentReference} onChange={(event) => setPaymentReference(event.currentTarget.value)} placeholder="Reference shown in your receipt" /></label><button className="tracking-submit" type="submit" disabled={sending}>{sending ? "Submitting…" : "Submit reference for verification"}</button>{paymentMessage && <p role="status" className="tracking-muted">{paymentMessage}</p>}</form></section>}
      {order.payment_method === "telebirr_manual" && ["received", "confirmed"].includes(order.status) && order.payment_status !== "awaiting_transfer" && <p className="tracking-payment-hold">Please wait for Cloud L to confirm availability and the exact amount before making a Telebirr transfer.</p>}
      <section className="tracking-history"><h2>Updates</h2>{order.events.map((event, index) => <article key={`${event.at}-${index}`}><time>{new Date(event.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</time><p>{event.message}</p></article>)}</section>
      <p className="tracking-footnote">This is a private link. Keep it to yourself; your order reference alone cannot show these details.</p>
    </>}
  </div><footer className="tracking-footer"><span>Cloud L · Kebena, Addis Ababa</span><a href="tel:+251901120012">Need help? Call Cloud L</a></footer></main>;
}
