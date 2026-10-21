import { useState, type FormEvent } from "react";
import type { CartLine } from "./orderTypes";

type Props = { items: CartLine[]; subtotal: number; onPlaced: (trackingUrl: string, reference: string) => void };
type Fulfillment = "pickup" | "delivery" | "dine_in";
type PaymentMethod = "cash" | "telebirr_manual";
const money = (value: number) => value.toLocaleString("en-US");

export default function CheckoutForm({ items, subtotal, onPlaced }: Props) {
  const [stage, setStage] = useState<"review" | "details" | "sending" | "error">("review");
  const [error, setError] = useState("");
  const [fulfillment, setFulfillment] = useState<Fulfillment>("pickup");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryLandmark, setDeliveryLandmark] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [wantsWhatsAppUpdates, setWantsWhatsAppUpdates] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setStage("sending");
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create", customerName, customerPhone, fulfillment, paymentMethod,
          deliveryAddress, deliveryLandmark, deliveryNotes, specialInstructions,
          guestCount: guestCount ? Number(guestCount) : null, tableNumber, wantsWhatsAppUpdates,
          items: items.map(({ id, quantity }) => ({ id, quantity })),
        }),
      });
      const data = await response.json() as { error?: string; trackingUrl?: string; reference?: string };
      if (!response.ok || !data.trackingUrl || !data.reference) throw new Error(data.error || "The order could not be submitted.");
      onPlaced(data.trackingUrl, data.reference);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Connection problem. Your cart is still here—please try again or use WhatsApp.");
      setStage("error");
    }
  }

  if (stage === "review") return (
    <div className="checkout-intro">
      <p className="checkout-note">Place a request online. Cloud L will confirm availability and any delivery charge before preparing your order.</p>
      <button className="order-cart__whatsapp checkout-primary" type="button" onClick={() => setStage("details")}>Continue to checkout <span aria-hidden="true">→</span></button>
      <p className="checkout-secondary">No account needed. Your order is not confirmed until our team reviews it.</p>
    </div>
  );

  return (
    <form className="checkout-form" onSubmit={submit}>
      <div className="checkout-form__top"><button type="button" className="checkout-back" onClick={() => setStage("review")}>← Back to your order</button><p>GUEST CHECKOUT</p></div>
      <label className="checkout-label">Your name<input autoComplete="name" required minLength={2} maxLength={120} value={customerName} onChange={(e) => setCustomerName(e.currentTarget.value)} placeholder="Name for the order" /></label>
      <label className="checkout-label">Mobile number<input autoComplete="tel" type="tel" required value={customerPhone} onChange={(e) => setCustomerPhone(e.currentTarget.value)} placeholder="+251 9… or 09…" /><small>We’ll use this only if staff needs to clarify your order.</small></label>
      <fieldset className="checkout-choice"><legend>How would you like your order?</legend><div>
        {([["pickup", "Pickup", "Collect at Cloud L"], ["delivery", "Delivery", "We’ll confirm coverage and fee"], ["dine_in", "Dine in", "For a table at the restaurant"]] as const).map(([value, title, detail]) => <label key={value} className={fulfillment === value ? "is-selected" : ""}><input type="radio" name="fulfillment" value={value} checked={fulfillment === value} onChange={() => setFulfillment(value)} /><span><strong>{title}</strong><small>{detail}</small></span></label>)}
      </div></fieldset>
      {fulfillment === "delivery" && <div className="checkout-address"><label className="checkout-label">Delivery address<input autoComplete="street-address" required minLength={5} maxLength={400} value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.currentTarget.value)} placeholder="Area, street, building or house number" /></label><label className="checkout-label">Landmark (helpful)<input maxLength={200} value={deliveryLandmark} onChange={(e) => setDeliveryLandmark(e.currentTarget.value)} placeholder="Nearby place or building" /></label><label className="checkout-label">Delivery notes<textarea maxLength={500} rows={2} value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.currentTarget.value)} placeholder="Gate, floor, or directions for the courier" /></label><p className="checkout-note">Staff will confirm whether delivery is available and tell you the delivery fee before asking you to pay.</p></div>}
      {fulfillment === "dine_in" && <div className="checkout-inline"><label className="checkout-label">Guests (optional)<input type="number" min="1" max="40" value={guestCount} onChange={(e) => setGuestCount(e.currentTarget.value)} /></label><label className="checkout-label">Table (optional)<input maxLength={40} value={tableNumber} onChange={(e) => setTableNumber(e.currentTarget.value)} placeholder="If already seated" /></label></div>}
      <label className="checkout-label">Special instructions (optional)<textarea maxLength={500} rows={2} value={specialInstructions} onChange={(e) => setSpecialInstructions(e.currentTarget.value)} placeholder="Anything the kitchen should know?" /></label>
      <fieldset className="checkout-choice checkout-payment"><legend>Payment preference</legend><div>
        <label className={paymentMethod === "cash" ? "is-selected" : ""}><input type="radio" name="payment" checked={paymentMethod === "cash"} onChange={() => setPaymentMethod("cash")} /><span><strong>Cash</strong><small>{fulfillment === "delivery" ? "Pay on delivery" : fulfillment === "pickup" ? "Pay on pickup" : "Pay at the restaurant"}</small></span></label>
        <label className={paymentMethod === "telebirr_manual" ? "is-selected" : ""}><input type="radio" name="payment" checked={paymentMethod === "telebirr_manual"} onChange={() => setPaymentMethod("telebirr_manual")} /><span><strong>Telebirr transfer</strong><small>Manual transfer only after staff confirms your total</small></span></label>
      </div></fieldset>
      <label className="checkout-optin"><input type="checkbox" checked={wantsWhatsAppUpdates} onChange={(e) => setWantsWhatsAppUpdates(e.currentTarget.checked)} /><span>I’d like order-status updates by WhatsApp. Cloud L staff will review and send updates manually.</span></label>
      {error && <p className="checkout-error" role="alert">{error}</p>}
      <div className="checkout-submit-row"><span>Menu subtotal<br /><strong>{money(subtotal)} ETB</strong></span><button className="order-cart__whatsapp checkout-primary" type="submit" disabled={stage === "sending"}>{stage === "sending" ? "Sending securely…" : "Place order request"} <span aria-hidden="true">→</span></button></div>
      <p className="checkout-privacy">Your request is saved securely so Cloud L can confirm it. Never transfer money before staff confirms the final amount.</p>
    </form>
  );
}
