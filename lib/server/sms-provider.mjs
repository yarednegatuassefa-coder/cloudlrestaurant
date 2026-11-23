/**
 * Provider boundary for Cloud L transactional SMS.
 *
 * Deliberately disabled until Uplink confirms which of its conflicting API
 * specifications is the supported production contract. Do not guess endpoints,
 * request fields, authentication, or delivery semantics.
 */
export async function sendSms(_message) {
  if (process.env.SMS_PROVIDER !== "uplink" || process.env.UPLINK_SMS_ENABLED !== "true") {
    const error = new Error("SMS provider is not enabled.");
    error.code = "SMS_PROVIDER_DISABLED";
    error.retryable = true;
    throw error;
  }

  // Implement the Uplink adapter here after written confirmation of the API
  // version, authentication scheme, payload, sender-ID format and response.
  const error = new Error("Uplink API contract has not yet been verified.");
  error.code = "SMS_PROVIDER_CONTRACT_UNVERIFIED";
  error.retryable = true;
  throw error;
}
