# Cloud L delivery intelligence

## Included

- Staff-only territory manager at **Staff board → Delivery intelligence**.
- Draw territories by clicking at least three points on the map; save a name and fee in ETB.
- Edit territory name, polygon and fee; activate/pause or delete a territory.
- New delivery orders with a customer pin are matched server-side against active polygons.
- If at least one active territory exists, a pinned location outside all active territories is rejected with a clear message. Orders without a pin continue through the manual address/staff-review fallback.
- Orders matched to a territory store its ID. When staff confirms the order, the server reads the current active territory fee and calculates the final total. The client cannot override that fee.
- Staff order board shows the matched territory. Unzoned orders retain the existing manual fee entry.
- Staff-only analytics summarize pinned delivery orders into approximately 1.1 km grid cells. A cell is returned only when it contains at least two orders. Period filters: 7, 30 or 90 days.

## Data model

Migration `007_delivery_zones.sql` creates `public.delivery_zones` and adds nullable `orders.delivery_zone_id`. It follows migration 006, which adds optional coordinates to orders. Plain PostgreSQL JSONB and numeric values are used; PostGIS is not required.

Cloud L's inspected application currently has one restaurant operation and no tenant/restaurant identity column. This implementation is scoped to that existing single Cloud L operation. Do not treat it as a multi-tenant SaaS design. Before onboarding multiple independent restaurants, add a verified tenant identity to staff sessions, zones, orders and every analytics query, then enforce it in the database.

## Fee and coverage behavior

- If a pinned point falls in more than one active territory, checkout rejects it as ambiguous and asks the customer to contact staff. Draw non-overlapping polygons to avoid this condition.
- If there are no active zones, the existing manual coverage and fee workflow remains unchanged.
- If active zones exist but a customer does not select a pin, staff must continue manual coverage review and fee entry.
- Existing orders retain their saved delivery fee even if a zone is later edited or deleted. New orders use the current active polygon and fee.
- If a zone is paused after an order is assigned but before confirmation, confirmation is blocked; staff must reactivate the zone or use a deliberate manual resolution workflow. If a zone is deleted, its foreign key is cleared and the order falls back to the existing manual fee-entry workflow.

## Privacy and map providers

- Coordinates are used for order fulfilment and are returned only by authenticated staff APIs.
- Analytics expose coarse cells, not individual order coordinates, and suppress cells with fewer than two orders.
- Leaflet is loaded from unpkg and map tiles are served by OpenStreetMap. Those services receive normal request metadata, including IP and tile coordinates. Review provider terms, availability and attribution before production use.
- Do not send customer coordinates to third-party AI systems or public map layers.

## Rollout — do not skip

1. Review migrations 006 and 007 together.
2. Apply both to a non-production Neon branch in order.
3. Run `npm run test:api`, `npm run build`, and the existing end-to-end suite.
4. Verify: create/edit/pause/delete zone; pin inside zone; pin outside zones; no-pin manual fallback; server-calculated fee; inactive zone before confirmation; pickup/dine-in; heatmap aggregation and period filters; staff authentication; no coordinate leakage through customer tracking.
5. Confirm the actual Cloud L map domain is allowed by the existing staff-session origin policy.
6. Only after successful staging verification, approve production migration and deployment separately.

No database migration or production deployment is performed by this PR.

## RustGIS workflow

The staff Delivery intelligence tab supports authenticated GeoJSON export/import for use with RustGIS or another GIS that supports standard GeoJSON.

1. Sign in to the staff board and open **Delivery intelligence**.
2. Export current territories as `cloudl-delivery-territories.geojson`.
3. Open the file in RustGIS. The GeoJSON coordinate order is standard longitude, latitude (WGS84/EPSG:4326).
4. Edit the polygons and attributes. Preserve each feature's `name`, integer `delivery_fee_etb` (0–10,000 ETB), and optional boolean `is_active`.
5. Export a GeoJSON **FeatureCollection** containing Polygon features. Cloud L currently accepts one exterior ring per Polygon; holes and MultiPolygons must be simplified to separate supported polygons before import.
6. Import the file from the staff board. The server validates the entire collection and inserts it atomically. Imports create new zones; they never overwrite existing zones. If any name conflicts, the whole import is rejected.
7. Review imported boundaries and fees on the map. Imported zones are inactive unless `is_active` is explicitly true. Review each boundary and fee, then activate only after the restaurant owner approves its operational use.

The adapter converts GeoJSON `[longitude, latitude]` coordinates to Cloud L's existing `[latitude, longitude]` polygon storage. It does not install RustGIS, call an external GIS service, synchronize automatically, or change production zones without a staff member importing and approving the file. GeoJSON import/export is authenticated with the existing staff session and is not exposed through customer APIs.

The adapter is covered by `tests/api/delivery-geojson.test.mjs` for coordinate-order conversion, ring closure, unsupported holes, fee validation, duplicate names and export round-tripping.
