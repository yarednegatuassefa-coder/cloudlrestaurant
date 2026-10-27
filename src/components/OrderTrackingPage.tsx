import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { CartLine } from "./orderTypes";

type Event = { at: string; status: string | null; message: string };
type PaymentSnapshot = {
  id: string;
  label: string;
  payment_type: "cash" | "manual_transfer";
  bank_name?: string | null;
  recipient_name?: string | null;
  phone_number?: string | null;
  account_number?: string | null;
  merchant_id?: string | null;
  instructions?: string | null;
  qr_code_data_url?: string | null;
};
type HistoricalItem = {
  name: string;
  nameAmharic: string;
  size: string | null;
  quantity: number;
  unitPriceEtb: number;
  lineTotalEtb: number;
};
type Order = {
  public_reference: string;
  created_at: string;
  status: string;
  fulfillment: string;
  payment_method: string;
  payment_status: string;
  payment_destination_snapshot?: PaymentSnapshot | null;
  subtotal_etb: number;
  delivery_fee_etb: number | null;
  total_etb: number | null;
  estimated_ready_at: string | null;
  items: HistoricalItem[];
  events: Event[];
  reorderItems?: CartLine[];
  reorderWarnings?: string[];
};
type Props = { token: string; onReorder: (items: CartLine[], warnings: string[]) => boolean };

const money = (value: number) => Number(value).toLocaleString("en-US");
const labels: Record<string, string> = {
  received: "Received · awaiting confirmation",
  needs_clarification: "Needs clarification",
  confirmed: "Confirmed",
  preparing: "Being prepared",
  ready_for_pickup: "Ready for pickup",
  out_for_delivery: "On the way",
  delivered: "Delivered",
  completed: "Complete",
  declined: "Unable to accept",
  cancelled: "Cancelled",
};
const journey = ["received", "confirmed", "preparing", "ready_for_pickup", "completed"];
const reorderableStatuses = new Set(["delivered", "completed", "declined", "cancelled"]);

export default function OrderTrackingPage({ token, onReorder }: Props) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [reorderMessage, setReorderMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "track", token }),
      });
      const data = await response.json() as { order?: Order; error?: string };
      if (!response.ok || !data.order) throw new Error(data.error || "Tracking is unavailable.");
      setOrder(data.order);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Tracking is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function submitReference(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setPaymentMessage("");
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "payment-reference", token, paymentReference }),
      });
      const data = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(data.error || "We could not record that reference.");
      setPaymentMessage(data.message || "Reference received. Cloud L staff will review it manually.");
      setPaymentReference("");
      await load();
    } catch (cause) {
      setPaymentMessage(cause instanceof Error ? cause.message : "Please try again.");
    } finally {
      setSending(false);
    }
  }

  async function reorderPreviousOrder() {
    if (!order || !reorderableStatuses.has(order.status) || !order.reorderItems?.length) return;
    setReordering(true);
    setReorderMessage("");
    let soldOutIds = new Set<string>();
    try {
      const response = await fetch("/api/menu-availability", { cache: "no-store" });
      if (!response.ok) throw new Error("Availability check failed.");
      const data = await response.json() as { soldOutItemIds?: unknown };
      if (!Array.isArray(data.soldOutItemIds) || !data.soldOutItemIds.every((id) => typeof id === "string")) {
        throw new Error("Availability response was invalid.");
      }
      soldOutIds = new Set(data.soldOutItemIds);
    } catch {
      setReorderMessage("Cloud L couldn’t confirm current availability, so your cart was not changed. Please try again shortly.");
      setReordering(false);
      return;
    }

    const warnings = [...(order.reorderWarnings ?? [])];
    const availableItems = order.reorderItems.filter((item) => {
      if (!soldOutIds.has(item.id)) return true;
      warnings.push(`${item.name}${item.size ? ` (${item.size})` : ""} — currently sold out`);
      return false;
    });
    if (availableItems.length === 0) {
      setReorderMessage("None of the items in this order are currently available to reorder. Your cart has not been changed.");
      setReordering(false);
      return;
    }
    const didReorder = onReorder(availableItems, [...new Set(warnings)]);
    if (!didReorder) {
      setReorderMessage("Your current cart was left unchanged.");
      setReordering(false);
    }
  }

  const currentIndex = order ? (order.status === "needs_clarification" ? 0 : journey.indexOf(order.status)) : -1;
  const destination = order?.payment_destination_snapshot;
  const isManual = destination?.payment_type === "manual_transfer";
  const showTransferInstructions = Boolean(order && isManual && order.status === "confirmed" && ["awaiting_transfer", "submitted"].includes(order.payment_status));
  const manualTransferPending = Boolean(order && isManual && ["received", "needs_clarification"].includes(order.status));
  const canReorder = Boolean(order && reorderableStatuses.has(order.status));

  return (
    <main className="tracking-page">
      <header className="tracking-header">
        <a href="/" className="tracking-brand"><img src="/assets/restaurant/cloud-l-logo.svg" alt="Cloud L" /></a>
        <span>PRIVATE ORDER TRACKING</span>
      </header>
      <div className="tracking-card">
        <p className="tracking-eyebrow">CLOUD L · ORDER STATUS</p>
        <h1>Your order, <em>in good hands.</em></h1>
        {loading && <p className="tracking-muted" role="status">Loading your private order status…</p>}
        {!loading && error && <div className="tracking-error" role="alert"><p>{error}</p><button type="button" onClick={() => { setLoading(true); void load(); }}>Try again</button></div>}
        {order && <>
          <div className="tracking-reference">
            <small>ORDER REFERENCE</small>
            <strong>{order.public_reference}</strong>
            <span>{new Date(order.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
          </div>
          <section className="tracking-status" aria-label="Order progress">
            <div className="tracking-status__current"><span>Current status</span><strong>{labels[order.status] || "In progress"}</strong></div>
            <ol>{journey.map((step, index) => <li key={step} className={`${index <= currentIndex ? "is-done" : ""} ${order.status === step ? "is-current" : ""}`}><i aria-hidden="true" /><span>{labels[step]}</span></li>)}</ol>
            {order.status === "needs_clarification" && <p className="tracking-live-status">Cloud L needs a detail before confirming your order. See the latest update below, then contact us if you need help.</p>}
            {order.status === "out_for_delivery" && <p className="tracking-live-status">Your order is on its way.</p>}
            {order.status === "delivered" && <p className="tracking-live-status">Your order has been delivered.</p>}
          </section>
          {order.estimated_ready_at && <p className="tracking-eta">Estimated ready · <strong>{new Date(order.estimated_ready_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</strong></p>}
          <section className="tracking-summary">
            <h2>Your order</h2>
            <ul>{order.items.map((item, index) => <li key={`${item.name}-${index}`}><span>{item.quantity} × {item.name}{item.size ? ` · ${item.size}` : ""}</span><strong>{money(item.lineTotalEtb)} ETB</strong></li>)}</ul>
            <div><span>Menu subtotal</span><strong>{money(order.subtotal_etb)} ETB</strong></div>
            {order.delivery_fee_etb !== null && <div><span>Delivery</span><strong>{money(order.delivery_fee_etb)} ETB</strong></div>}
            {order.total_etb !== null && <div className="tracking-summary__total"><span>Confirmed total</span><strong>{money(order.total_etb)} ETB</strong></div>}
          </section>
          <p className="tracking-fulfillment">{order.fulfillment === "pickup" ? "Pickup at Cloud L" : order.fulfillment === "delivery" ? "Home delivery · details confirmed by staff" : "Dine in at Cloud L"}</p>
          {canReorder && <section className="tracking-reorder" aria-labelledby="tracking-reorder-title">
            <h2 id="tracking-reorder-title">Order it again</h2>
            <p>Available items will be added to a new cart at today’s menu prices. Your previous payment, delivery details, and special instructions will not be reused; Cloud L will confirm availability again.</p>
            {order.reorderItems?.length ? <button className="tracking-submit" type="button" disabled={reordering} onClick={() => void reorderPreviousOrder()}>{reordering ? "Checking today’s menu…" : "Add these items to a new order"}</button> : <p className="tracking-muted">None of the previous items are on the current menu.</p>}
            {reorderMessage && <p className="tracking-reorder__message" role="status">{reorderMessage}</p>}
          </section>}
          {showTransferInstructions && order.total_etb !== null && <section className="telebirr-card payment-instructions">
            <p className="tracking-eyebrow">MANUAL TRANSFER · {(destination?.label || "Payment option").toUpperCase()}</p>
            <h2>Pay the confirmed amount</h2>
            <p>Transfer <strong>{money(order.total_etb)} ETB</strong> using the confirmed Cloud L receiving details below. This is a manual transfer, not an online payment. Check the recipient before confirming in your payment app.</p>
            <div className="payment-destination">
              {destination?.bank_name && <p><small>INSTITUTION / BANK</small><strong>{destination.bank_name}</strong></p>}
              {destination?.recipient_name && <p><small>RECIPIENT</small><strong>{destination.recipient_name}</strong></p>}
              {destination?.account_number && <p><small>ACCOUNT NUMBER</small><strong>{destination.account_number}</strong><button type="button" onClick={() => void navigator.clipboard?.writeText(destination.account_number || "")}>Copy account number</button></p>}
              {destination?.phone_number && <p><small>PHONE NUMBER</small><strong>{destination.phone_number}</strong><button type="button" onClick={() => void navigator.clipboard?.writeText(destination.phone_number || "")}>Copy phone number</button></p>}
              {destination?.merchant_id && <p><small>MERCHANT ID</small><strong>{destination.merchant_id}</strong></p>}
              {destination?.instructions && <p className="payment-destination__instructions"><small>INSTRUCTIONS</small><span>{destination.instructions}</span></p>}
              {destination?.qr_code_data_url && <div className="payment-qr"><img src={destination.qr_code_data_url} alt={`${destination.label} payment QR code`} /></div>}
            </div>
            <p className="telebirr-note">Include order reference <strong>{order.public_reference}</strong> in the transfer note if supported. Never transfer more than the confirmed total. Cloud L staff will verify the payment manually.</p>
            {order.payment_status === "awaiting_transfer" && <form onSubmit={submitReference}>
              <label className="tracking-label">Transaction reference or receipt ID<input required minLength={4} maxLength={100} value={paymentReference} onChange={(event) => setPaymentReference(event.currentTarget.value)} placeholder="Reference shown in your receipt" /></label>
              <button className="tracking-submit" type="submit" disabled={sending}>{sending ? "Submitting…" : "Submit for staff verification"}</button>
              {paymentMessage && <p role="status" className="tracking-muted">{paymentMessage}</p>}
            </form>}
          </section>}
          {manualTransferPending && <p className="tracking-payment-hold">Please wait for Cloud L to confirm your order and exact total before transferring. No payment instructions are available yet.</p>}
          {order.payment_status === "submitted" && isManual && <p className="tracking-payment-hold">Your transfer reference has been submitted. Cloud L staff will verify it manually.</p>}
          {order.payment_status === "paid" && <p className="tracking-payment-hold">Your payment has been verified by Cloud L staff. Payment status is separate from your order’s preparation status.</p>}
          <section className="tracking-history">
            <h2>Updates</h2>
            {order.events.map((event, index) => <article key={`${event.at}-${index}`}><time>{new Date(event.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</time><p>{event.message}</p></article>)}
          </section>
          <p className="tracking-footnote">This is a private link. Keep it to yourself; your order reference alone cannot show these details.</p>
        </>}
      </div>
      <footer className="tracking-footer"><span>Cloud L · Kebena, Addis Ababa</span><a href="tel:+251901120012">Need help? Call Cloud L</a></footer>
    </main>
  );
}
