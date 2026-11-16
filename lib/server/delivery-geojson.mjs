import { isValidPolygon } from "./delivery-geometry.mjs";

export function geoJsonFeatureToZone(feature) {
  if (!feature || feature.type !== "Feature" || !feature.geometry || feature.geometry.type !== "Polygon") {
    throw new Error("Every feature must be a GeoJSON Polygon.");
  }
  const rings = feature.geometry.coordinates;
  if (!Array.isArray(rings) || rings.length !== 1 || !Array.isArray(rings[0])) {
    throw new Error("Only single-ring Polygon features are supported. Remove holes or multipolygons in the GIS project.");
  }
  const ring = rings[0];
  if (ring.length < 4 || ring.length > 101) throw new Error("Each polygon needs 3–100 vertices and a closing coordinate.");
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (!Array.isArray(first) || !Array.isArray(last) || first.length < 2 || last.length < 2 ||
      first[0] !== last[0] || first[1] !== last[1]) {
    throw new Error("GeoJSON polygon rings must be closed (first and last coordinates must match).");
  }
  const polygon = ring.slice(0, -1).map((position) => {
    if (!Array.isArray(position) || position.length < 2 ||
        typeof position[0] !== "number" || typeof position[1] !== "number") {
      throw new Error("Polygon coordinates must be numeric [longitude, latitude] pairs.");
    }
    return [position[1], position[0]];
  });
  if (!isValidPolygon(polygon)) throw new Error("Polygon coordinates are outside valid latitude/longitude ranges.");
  const properties = feature.properties || {};
  const name = typeof properties.name === "string" ? properties.name.trim() : "";
  const fee = properties.delivery_fee_etb;
  const isActive = properties.is_active === true;
  if (name.length < 2 || name.length > 80) throw new Error("Every feature needs a name between 2 and 80 characters.");
  if (!Number.isInteger(fee) || fee < 0 || fee > 10000) throw new Error("Every feature needs an integer delivery_fee_etb from 0 to 10,000.");
  return { name, polygon, deliveryFeeEtb: fee, isActive };
}

export function parseDeliveryGeoJson(document) {
  if (!document || document.type !== "FeatureCollection" || !Array.isArray(document.features)) {
    throw new Error("Upload a GeoJSON FeatureCollection.");
  }
  if (document.features.length < 1 || document.features.length > 50) {
    throw new Error("Import between 1 and 50 delivery territories at a time.");
  }
  const zones = document.features.map(geoJsonFeatureToZone);
  const names = new Set();
  for (const zone of zones) {
    const key = zone.name.toLocaleLowerCase("en");
    if (names.has(key)) throw new Error("The GeoJSON contains duplicate territory names.");
    names.add(key);
  }
  return zones;
}

export function zonesToDeliveryGeoJson(zones) {
  return {
    type: "FeatureCollection",
    name: "Cloud L delivery territories",
    features: zones.map((zone) => ({
      type: "Feature",
      properties: {
        name: zone.name,
        delivery_fee_etb: Number(zone.delivery_fee_etb),
        is_active: Boolean(zone.is_active),
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          ...zone.polygon.map(([latitude, longitude]) => [Number(longitude), Number(latitude)]),
          [Number(zone.polygon[0][1]), Number(zone.polygon[0][0])],
        ]],
      },
    })),
  };
}
