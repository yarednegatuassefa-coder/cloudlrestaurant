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
const labels: Record<string, string> = { received: "Received · awaiting confirmation", needs_clarification: "Needs clarification", confirmed: "Confirmed", preparing: "Being prepared", ready_for_pickup: "Ready for pickup", out_for_delivery: "On the way", delivered: "Delivered", completed: "Complete", declined: "Unable to accept", cancelled: "Cancelled" };
const journey = ["received", "confirmed", "preparing", "ready_for_pickup", "completed"];
const paymentLabels: Record<string, string> = {
  telebirr_manual: "Telebirr",
  bunna_bank_qr_manual: "Bunna Bank QR",
  dashen_bank_manual: "Dashen Bank",
};
const manualPaymentMethods = new Set(Object.keys(paymentLabels));

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

  const currentIndex = order ? (order.status === "needs_clarification" ? 0 : journey.indexOf(order.status)) : -1;
  const paymentName = order ? paymentLabels[order.payment_method] || "your selected method" : "your selected method";
  const awaitingTransfer = Boolean(order && manualPaymentMethods.has(order.payment_method) && order.status === "confirmed" && order.payment_status === "awaiting_transfer");
  const manualTransferPending = Boolean(order && manualPaymentMethods.has(order.payment_method) && ["received", "confirmed"].includes(order.status) && !awaitingTransfer);

  return <main className="tracking-page"><header className="tracking-header"><a href="/" className="tracking-brand"><img src="/assets/restaurant/cloud-l-logo.svg" alt="Cloud L" /></a><span>PRIVATE ORDER TRACKING</span></header><div className="tracking-card">
    <p className="tracking-eyebrow">CLOUD L · ORDER STATUS</p>
    <h1>Your order, <em>in good hands.</em></h1>
    {loading && <p className="tracking-muted" role="status">Loading your private order status…</p>}
    {!loading && error && <div className="tracking-error" role="alert"><p>{error}</p><button type="button" onClick={() => { setLoading(true); void load(); }}>Try again</button></div>}
    {order && <>
      <div className="tracking-reference"><small>ORDER REFERENCE</small><strong>{order.public_reference}</strong><span>{new Date(order.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span></div>
      <section className="tracking-status" aria-label="Order progress"><div className="tracking-status__current"><span>Current status</span><strong>{labels[order.status] || "In progress"}</strong></div><ol>{journey.map((step, index) => <li key={step} className={`${index <= currentIndex ? "is-done" : ""} ${order.status === step ? "is-current" : ""}`}><i aria-hidden="true" /><span>{labels[step]}</span></li>)}</ol>{order.status === "needs_clarification" && <p className="tracking-live-status">Cloud L needs a detail before confirming your order. See the latest update below, then contact us if you need help.</p>}{order.status === "out_for_delivery" && <p className="tracking-live-status">Your order is on its way.</p>}{order.status === "delivered" && <p className="tracking-live-status">Your order has been delivered.</p>}</section>
      {order.estimated_ready_at && <p className="tracking-eta">Estimated ready · <strong>{new Date(order.estimated_ready_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</strong></p>}
      <section className="tracking-summary"><h2>Your order</h2><ul>{order.items.map((item, index) => <li key={`${item.name}-${index}`}><span>{item.quantity} × {item.name}{item.size ? ` · ${item.size}` : ""}</span><strong>{money(item.lineTotalEtb)} ETB</strong></li>)}</ul><div><span>Menu subtotal</span><strong>{money(order.subtotal_etb)} ETB</strong></div>{order.delivery_fee_etb !== null && <div><span>Delivery</span><strong>{money(order.delivery_fee_etb)} ETB</strong></div>}{order.total_etb !== null && <div className="tracking-summary__total"><span>Confirmed total</span><strong>{money(order.total_etb)} ETB</strong></div>}</section>
      <p className="tracking-fulfillment">{order.fulfillment === "pickup" ? "Pickup at Cloud L" : order.fulfillment === "delivery" ? "Home delivery · details confirmed by staff" : "Dine in at Cloud L"}</p>
      {awaitingTransfer && order.total_etb !== null && <section className="telebirr-card payment-instructions"><p className="tracking-eyebrow">MANUAL TRANSFER · {paymentName.toUpperCase()}</p><h2>Pay the confirmed amount</h2><p>Transfer <strong>{money(order.total_etb)} ETB</strong> using the selected Cloud L payment method. This is a manual transfer, not an online payment. Check the receiving details in your payment app before confirming.</p>
        {order.payment_method === "telebirr_manual" && <div className="telebirr-number"><div><small>TELEBIRR NUMBER</small><strong>+251 901 120 012</strong><small>RECIPIENT NAME</small><strong>Lidia</strong></div><button type="button" onClick={() => void navigator.clipboard?.writeText("+251901120012")}>Copy number</button></div>}
        {order.payment_method === "bunna_bank_qr_manual" && <div className="payment-qr"><img src="/assets/payments/bunna-bank-qr.png" alt="Bunna Bank merchant payment QR for Cloud L Trading PLC" /><div><strong>Cloud L Trading PLC</strong><span>Merchant ID 450043</span><span>Bunna Bank</span></div></div>}
        {order.payment_method === "dashen_bank_manual" && <div className="payment-account"><div><small>DASHEN BANK ACCOUNT</small><strong>0194970006011</strong><button type="button" onClick={() => void navigator.clipboard?.writeText("0194970006011")}>Copy account number</button></div><p>Account name <strong>Cloud L Trading PLC</strong></p></div>}
        <p className="telebirr-note">Include order reference <strong>{order.public_reference}</strong> in the transfer note if your bank supports it. Never transfer more than the confirmed total. Cloud L staff will verify the payment manually.{order.payment_method === "telebirr_manual" && <> Do not transfer if your Telebirr recipient name does not match <strong>Lidia</strong>.</>}</p>
        {order.payment_status === "awaiting_transfer" && <form onSubmit={submitReference}><label className="tracking-label">Transaction reference or receipt ID<input required minLength={4} maxLength={100} value={paymentReference} onChange={(event) => setPaymentReference(event.currentTarget.value)} placeholder="Reference shown in your receipt" /></label><button className="tracking-submit" type="submit" disabled={sending}>{sending ? "Submitting…" : "Submit for staff verification"}</button>{paymentMessage && <p role="status" className="tracking-muted">{paymentMessage}</p>}</form>}
      </section>}
      {manualTransferPending && <p className="tracking-payment-hold">Please wait for Cloud L to confirm your order and exact total before transferring by {paymentName}.</p>}
      {order.payment_status === "submitted" && manualPaymentMethods.has(order.payment_method) && <p className="tracking-payment-hold">Your transfer reference has been submitted. Cloud L staff will verify it manually.</p>}
      {order.payment_status === "paid" && <p className="tracking-payment-hold">Your payment has been verified by Cloud L staff.</p>}
      <section className="tracking-history"><h2>Updates</h2>{order.events.map((event, index) => <article key={`${event.at}-${index}`}><time>{new Date(event.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</time><p>{event.message}</p></article>)}</section>
      <p className="tracking-footnote">This is a private link. Keep it to yourself; your order reference alone cannot show these details.</p>
    </>}
  </div><footer className="tracking-footer"><span>Cloud L · Kebena, Addis Ababa</span><a href="tel:+251901120012">Need help? Call Cloud L</a></footer></main>;
}
