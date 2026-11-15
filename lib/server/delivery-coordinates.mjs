export function parseDeliveryCoordinates(latitude, longitude, fulfillment) {
  const hasLatitude = latitude !== null && latitude !== undefined;
  const hasLongitude = longitude !== null && longitude !== undefined;
  if (hasLatitude !== hasLongitude) return { valid: false };
  if (hasLatitude && (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 || latitude > 90 ||
    longitude < -180 || longitude > 180
  )) return { valid: false };
  if (fulfillment !== "delivery" && hasLatitude) return { valid: false };
  return { valid: true, latitude: hasLatitude ? latitude : null, longitude: hasLongitude ? longitude : null };
}
