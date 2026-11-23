/**
 * Provider-neutral delivery boundary. Provider adapters are intentionally
 * disabled until their commercial and technical contracts are verified.
 */
export async function sendNotification(notification) {
  const { channel } = notification || {};
  if (channel === "sms") return sendSms(notification);
  const error = new Error(`The ${channel || "requested"} notification channel is not configured.`);
  error.code = "NOTIFICATION_CHANNEL_DISABLED";
  error.retryable = false;
  throw error;
}

export async function sendSms({ to, message }) {
  if (process.env.SMS_PROVIDER !== "uplink" || process.env.UPLINK_SMS_ENABLED !== "true") {
    const error = new Error("SMS provider is not enabled.");
    error.code = "SMS_PROVIDER_DISABLED";
    error.retryable = true;
    throw error;
  }

  // Do not guess between Uplink's conflicting published API specifications.
  const error = new Error("Uplink API contract has not yet been verified.");
  error.code = "SMS_PROVIDER_CONTRACT_UNVERIFIED";
  error.retryable = true;
  throw error;
}
