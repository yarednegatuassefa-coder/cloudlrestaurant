import test from "node:test";
import assert from "node:assert/strict";
import { parseDeliveryGeoJson, zonesToDeliveryGeoJson } from "../../lib/server/delivery-geojson.mjs";

const feature = {
  type: "Feature",
  properties: { name: "Kebena", delivery_fee_etb: 80, is_active: true },
  geometry: { type: "Polygon", coordinates: [[[38.70,8.99],[38.82,8.99],[38.82,9.10],[38.70,9.10],[38.70,8.99]]] },
};

test("imports GeoJSON longitude/latitude as Cloud L latitude/longitude", () => {
  const [zone] = parseDeliveryGeoJson({ type: "FeatureCollection", features: [feature] });
  assert.deepEqual(zone.polygon[0], [8.99, 38.70]);
  assert.equal(zone.deliveryFeeEtb, 80);
  assert.equal(zone.isActive, true);
});

test("rejects unclosed rings, holes, invalid fees and duplicate names", () => {
  const unclosed = structuredClone(feature); unclosed.geometry.coordinates[0].pop();
  assert.throws(() => parseDeliveryGeoJson({ type: "FeatureCollection", features: [unclosed] }), /closed/);
  const holes = structuredClone(feature); holes.geometry.coordinates.push(holes.geometry.coordinates[0]);
  assert.throws(() => parseDeliveryGeoJson({ type: "FeatureCollection", features: [holes] }), /single-ring/);
  const badFee = structuredClone(feature); badFee.properties.delivery_fee_etb = 1.5;
  assert.throws(() => parseDeliveryGeoJson({ type: "FeatureCollection", features: [badFee] }), /integer/);
  assert.throws(() => parseDeliveryGeoJson({ type: "FeatureCollection", features: [feature, structuredClone(feature)] }), /duplicate/);
});

test("defaults missing activation flag to inactive", () => {
  const withoutFlag = structuredClone(feature); delete withoutFlag.properties.is_active;
  assert.equal(parseDeliveryGeoJson({ type: "FeatureCollection", features: [withoutFlag] })[0].isActive, false);
});

test("exports zones as closed GeoJSON polygons with longitude first", () => {
  const [result] = zonesToDeliveryGeoJson([{ name: "Kebena", delivery_fee_etb: 80, is_active: true, polygon: [[8.99,38.70],[9.10,38.70],[9.10,38.82]] }]).features;
  assert.deepEqual(result.geometry.coordinates[0][0], [38.70, 8.99]);
  assert.deepEqual(result.geometry.coordinates[0][3], [38.70, 8.99]);
});
