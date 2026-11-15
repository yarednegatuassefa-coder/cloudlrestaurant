export function isValidPolygon(polygon) {
  if (!Array.isArray(polygon) || polygon.length < 3 || polygon.length > 100) return false;
  return polygon.every((point) => Array.isArray(point) && point.length === 2 &&
    typeof point[0] === "number" && typeof point[1] === "number" &&
    Number.isFinite(point[0]) && Number.isFinite(point[1]) &&
    point[0] >= -90 && point[0] <= 90 && point[1] >= -180 && point[1] <= 180);
}
export function pointInPolygon(latitude, longitude, polygon) {
  if (!isValidPolygon(polygon) || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i]; const [yj, xj] = polygon[j];
    const crosses = (yi > latitude) !== (yj > latitude) &&
      longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}
export function findMatchingZones(latitude, longitude, zones) {
  return zones.filter((zone) => zone.is_active && pointInPolygon(latitude, longitude, zone.polygon));
}
export function findMatchingZone(latitude, longitude, zones) {
  const matches = findMatchingZones(latitude, longitude, zones);
  return matches.length === 1 ? matches[0] : null;
}
