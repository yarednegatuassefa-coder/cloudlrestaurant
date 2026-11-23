/**
 * Customer-facing transactional SMS policy.
 * Internal progress changes stay on the private tracking page to avoid fatigue.
 */
const SMS_STATUS_EVENTS = new Set([
  "confirmed",
  "ready_for_pickup",
  "out_for_delivery",
  "cancelled",
  "declined",
]);

export function shouldSendTransactionalStatusSms(status) {
  return SMS_STATUS_EVENTS.has(status);
}
