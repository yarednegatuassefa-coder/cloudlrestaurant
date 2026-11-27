import { useState, type FormEvent } from "react";

const ADDIS_TIME_ZONE = "Africa/Addis_Ababa";
const ADDIS_UTC_OFFSET = "+03:00";

function toAddisInputValue(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ADDIS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

function toAddisIsoValue(value: string) {
  // Addis Ababa uses UTC+03:00 year-round; datetime-local itself has no timezone.
  return new Date(`${value}:00${ADDIS_UTC_OFFSET}`).toISOString();
}

function defaultReservationTime() {
  const tomorrow = toAddisInputValue(new Date(Date.now() + 24 * 60 * 60_000));
  return `${tomorrow.slice(0, 10)}T12:00`;
}

export default function ReservationRequestForm() {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [requestedFor, setRequestedFor] = useState(defaultReservationTime);
  const [partySize, setPartySize] = useState("2");
  const [notes, setNotes] = useState("");
  const [wantsSmsUpdates, setWantsSmsUpdates] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");

  const minDateTime = toAddisInputValue(new Date(Date.now() + 30 * 60_000));
  const maxDateTime = toAddisInputValue(new Date(Date.now() + 60 * 24 * 60 * 60_000));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reservation-create",
          customerName,
          customerPhone,
          requestedFor: toAddisIsoValue(requestedFor),
          partySize: Number(partySize),
          notes,
          wantsSmsUpdates,
        }),
      });
      const data = await response.json() as { reference?: string; error?: string };
      if (!response.ok || !data.reference) throw new Error(data.error || "Your table request could not be sent.");
      setReference(data.reference);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Connection problem. Please try again or call Cloud L.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="reservation-request">
      <summary>Request a table <span aria-hidden="true">＋</span></summary>
      {reference ? (
        <div className="reservation-request__success" role="status">
          <strong>Request received · {reference}</strong>
          <p>This is a request, not a confirmed booking. Cloud L staff will contact you to confirm availability.</p>
          <button type="button" onClick={() => { setReference(""); setCustomerName(""); setCustomerPhone(""); setNotes(""); }}>Make another request</button>
        </div>
      ) : (
        <form {...({ toolname: "cloudl-prepare-reservation-request", tooldescription: "Help the customer fill a table reservation request. This is a request only, not a confirmed booking. The customer must review and submit." } as any)} onSubmit={submit}>
          <p className="reservation-request__note">Send your preferred date and time. A team member will confirm the table; submitting this form does not reserve a table automatically.</p>
          <label className="checkout-label">Your name
            <input required minLength={2} maxLength={120} autoComplete="name" value={customerName} onChange={(event) => setCustomerName(event.currentTarget.value)} placeholder="Name for the reservation" />
          </label>
          <label className="checkout-label">Mobile number
            <input required type="tel" autoComplete="tel" value={customerPhone} onChange={(event) => setCustomerPhone(event.currentTarget.value)} placeholder="+251 9… or 09…" />
          </label>
          <label className="checkout-label">Preferred date and time
            <input required type="datetime-local" min={minDateTime} max={maxDateTime} value={requestedFor} onChange={(event) => setRequestedFor(event.currentTarget.value)} />
            <small>Daily · 7:00 a.m.–9:00 p.m. Addis Ababa time · Requests up to 60 days ahead.</small>
          </label>
          <label className="checkout-label">Number of guests
            <input required type="number" min={1} max={20} step={1} value={partySize} onChange={(event) => setPartySize(event.currentTarget.value)} />
          </label>
          <label className="checkout-label">Additional details (optional)
            <textarea rows={2} maxLength={500} value={notes} onChange={(event) => setNotes(event.currentTarget.value)} placeholder="Occasion, seating preference, or other details" />
          </label>
          <label className="checkout-optin">
            <input type="checkbox" checked={wantsSmsUpdates} onChange={(event) => setWantsSmsUpdates(event.currentTarget.checked)} />
            <span>I agree to receive SMS messages about this reservation request and its confirmation. Standard SMS charges may apply.</span>
          </label>
          {error && <p className="checkout-error" role="alert">{error}</p>}
          <button className="order-cart__whatsapp checkout-primary" type="submit" disabled={busy}>{busy ? "Sending request…" : "Send table request"} <span aria-hidden="true">→</span></button>
        </form>
      )}
    </details>
  );
}
