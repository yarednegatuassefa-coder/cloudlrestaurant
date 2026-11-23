const MIN_LEAD_TIME_MS = 30 * 60_000;
const MAX_HORIZON_MS = 60 * 24 * 60 * 60_000;

/** Validate a requested table time using Cloud L's Addis Ababa operating hours. */
export function validateReservationRequest({ partySize, requestedFor, now = Date.now() }) {
  if (!Number.isInteger(partySize) || partySize < 1 || partySize > 20) {
    return { valid: false, error: "Choose a party size between 1 and 20 guests." };
  }
  if (!(requestedFor instanceof Date) || !Number.isFinite(requestedFor.getTime())) {
    return { valid: false, error: "Choose a valid reservation date and time." };
  }
  if (requestedFor.getTime() < now + MIN_LEAD_TIME_MS ||
      requestedFor.getTime() > now + MAX_HORIZON_MS) {
    return { valid: false, error: "Reservations must be requested at least 30 minutes ahead and no more than 60 days in advance." };
  }

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Addis_Ababa",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(requestedFor);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  if (hour < 7 || hour > 21 || (hour === 21 && minute > 0)) {
    return { valid: false, error: "Cloud L accepts table requests between 7:00 a.m. and 9:00 p.m. Addis Ababa time." };
  }
  return { valid: true };
}
