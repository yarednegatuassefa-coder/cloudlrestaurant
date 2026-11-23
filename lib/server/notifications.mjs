/**
 * Durable transactional notification queue.
 * Call with the same PostgreSQL transaction/client that writes the order event.
 */
export async function enqueueSms(client, { orderId, eventKey, recipient, message }) {
  if (!orderId || !eventKey || !recipient || !message) {
    throw new TypeError("SMS outbox requires orderId, eventKey, recipient and message.");
  }
  await client.query(
    `INSERT INTO public.notification_outbox
       (order_id, event_key, recipient, message)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (event_key) DO NOTHING`,
    [orderId, eventKey, recipient, message.slice(0, 1000)],
  );
}
