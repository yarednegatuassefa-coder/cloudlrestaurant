const CHANNELS = new Set(["sms", "whatsapp", "email"]);
const PURPOSES = new Set(["transactional", "marketing", "feedback", "reservation"]);
const ENTITY_TYPES = new Set(["order", "reservation", "customer"]);

/**
 * Enqueue a notification inside the business transaction that created its event.
 * A current, purpose-specific consent grant is mandatory for every channel.
 */
export async function enqueueNotification(client, {
  entityType = "order",
  entityId,
  orderId = null,
  reservationId = null,
  channel = "sms",
  purpose = "transactional",
  templateKey = null,
  eventKey,
  recipient,
  message,
  metadata = {},
}) {
  if (!ENTITY_TYPES.has(entityType) || !entityId || !CHANNELS.has(channel) ||
      !PURPOSES.has(purpose) || !eventKey || !recipient || !message) {
    throw new TypeError("Notification requires a valid entity, channel, purpose, eventKey, recipient and message.");
  }
  if (typeof message !== "string" || message.trim().length === 0 || message.length > 1000) {
    throw new TypeError("Notification message must contain 1–1000 characters.");
  }
  if (entityType === "order" && !orderId) orderId = entityId;

  const consent = await client.query(
    `SELECT status
       FROM public.customer_notification_consents
      WHERE customer_phone=$1 AND channel=$2 AND purpose=$3
      ORDER BY created_at DESC, id DESC
      LIMIT 1`,
    [recipient, channel, purpose],
  );
  if (consent.rows[0]?.status !== "granted") {
    const error = new Error("No active customer consent exists for this notification.");
    error.code = "NOTIFICATION_CONSENT_REQUIRED";
    error.retryable = false;
    throw error;
  }

  await client.query(
    `INSERT INTO public.notification_outbox
       (entity_type, entity_id, order_id, reservation_id, channel, purpose, template_key, event_key, recipient, message, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
     ON CONFLICT (event_key) DO NOTHING`,
    [entityType, entityId, orderId, reservationId, channel, purpose, templateKey, eventKey, recipient, message, JSON.stringify(metadata)],
  );
}

/** Backwards-compatible helper for existing order event handlers. */
export async function enqueueSms(client, { orderId, eventKey, recipient, message, purpose = "transactional" }) {
  if (!orderId || !eventKey || !recipient || !message) {
    throw new TypeError("SMS outbox requires orderId, eventKey, recipient and message.");
  }
  return enqueueNotification(client, {
    entityType: "order",
    entityId: orderId,
    orderId,
    channel: "sms",
    purpose,
    eventKey,
    recipient,
    message: message.slice(0, 1000),
  });
}
