# Cloud L Location Intelligence — Implementation Gate

## Status

Architecture discovery complete. This document defines the first safe implementation slice; it does not enable location tracking, geocoding, mapping providers, or production database changes.

## Repository facts verified

- The customer-facing app is a React 19 + TypeScript + Vite application.
- Cloud L currently presents one named restaurant location in Kebena, Addis Ababa. The inspected code does not establish a multi-restaurant or multi-tenant SaaS model.
- PostgreSQL is accessed through the `pg` package and a shared pool in `api/_server.ts`, using `DATABASE_URL`.
- Customer delivery addresses are currently stored as text in `orders.delivery_address`; the inspected order creation API does not accept latitude/longitude.
- Staff can set a delivery fee while confirming a delivery order. The current staff API returns customer contact and delivery details to authenticated staff.
- The public site currently links to a fixed Google Maps directions URL.
- No GeoLibre/MapLibre map dependency or geospatial query layer was found in the inspected package manifest and application entry points.

These findings are based on the files inspected, not a complete database or deployment audit.

## Product decision

Build **Delivery Zones** first. Defer demand heatmaps, driver routing, competitor intelligence, and branch expansion analytics until the first feature is proven.

### First release

1. Staff can create, edit, activate, deactivate, and order delivery zones.
2. Each zone has a name, optional description, delivery fee in ETB, optional minimum order value, and a polygon boundary.
3. A customer delivery location can be checked against active zone boundaries.
4. The checkout flow can tell the customer whether the selected pin is serviceable and show the applicable delivery fee before order submission.
5. Staff can see the assigned zone and the delivery location needed to fulfil that order.
6. The order-creation API remains authoritative: it rechecks zone availability and calculates the fee server-side inside the order transaction. Client-submitted fees are never trusted.
7. Pickup and dine-in orders do not require location coordinates or a delivery zone.

### Explicitly out of scope

- No automatic geocoding of existing customer addresses.
- No sending raw customer addresses, phone numbers, names, or order history to third-party map, geocoding, analytics, or AI providers.
- No public display of customer delivery pins.
- No driver tracking, live traffic, route optimization, heatmaps, or competitor datasets in this first release.
- No production migration, deployment, or changes to live order/payment records as part of this PR.

## Data protection and security requirements

Delivery coordinates are sensitive location data and must be treated with the same care as delivery addresses.

- Collect a map pin only for delivery orders and explain why it is needed.
- Keep precise coordinates visible only to authenticated staff with an operational need.
- Do not place customer coordinates in public tiles, client-side static JSON, analytics events, logs, URLs, or error messages.
- Do not send coordinates or address text to an external provider unless the provider, data flow, retention, and legal basis have been reviewed and approved.
- Use parameterized SQL and server-side point-in-polygon checks.
- Validate polygon geometry, coordinate order, coordinate reference system, and valid geographic ranges.
- Reject overlapping active zones unless an explicit priority rule resolves the overlap.
- Record staff changes to zones in an audit trail.
- Apply rate limits and no-store response headers to private endpoints.
- Keep the existing private staff session controls; do not expose zone administration through the public API.
- Do not introduce tenant IDs or claim tenant isolation until a real tenant model exists. If Cloud L becomes multi-tenant, tenant scoping must be enforced in every query, mutation, export, tile and cache before enabling spatial features for multiple restaurants.

## Proposed technical approach

1. Confirm the production database engine/version and whether PostGIS is available. The repository uses PostgreSQL, but PostGIS availability has not been verified.
2. If PostGIS is available and approved, store zone polygons using a documented SRID (normally WGS 84 / EPSG:4326 for exchanged GPS coordinates) and use geography-aware containment/distance operations as appropriate.
3. If PostGIS is unavailable, compare enabling it with a narrowly scoped alternative before choosing a geometry representation. Do not silently approximate polygon containment in the browser.
4. Choose the web map renderer only after checking current deployment constraints, bundle impact, licensing, accessibility, mobile behaviour, and offline requirements. The GeoLibre desktop/GIS release is not assumed to be a drop-in React map component.
5. Keep all authoritative zone validation and fee calculation on the server. The map is an input and visualization surface, not a security boundary.

## Proposed API boundaries

Private staff endpoints:
- `GET /api/admin/delivery-zones`
- `POST /api/admin/delivery-zones`
- `PATCH /api/admin/delivery-zones/:id`

Customer-facing endpoint:
- `POST /api/delivery/coverage` accepts a validated coordinate and returns only serviceability and the public fee/threshold. It must not return zone polygons, staff notes, other orders, or customer data.

Order creation:
- Accept a delivery coordinate only when fulfillment is `delivery`.
- Resolve the active zone on the server and derive the delivery fee from the zone.
- Persist the zone reference and coordinate only if retention and access rules are approved.
- Preserve the existing transaction and order integrity guarantees.

## Test and release gates

- Unit tests for polygon validity, point-in-zone, boundary points, no-zone cases, overlapping zones, disabled zones, and fee calculation.
- API tests for unauthenticated staff access, invalid geometry, invalid coordinates, origin checks, rate limits, and forged client fee values.
- Order tests for delivery vs pickup/dine-in behaviour and transaction rollback.
- UI tests for mobile pin placement, keyboard-accessible alternatives, location permission denial, and clear out-of-zone messaging.
- Build, lint, API tests, and end-to-end tests must pass before merge.
- Use synthetic coordinates and test fixtures only. No live customer/order data for development or agent testing.

## Required inputs before implementation

- Confirm whether the deployed PostgreSQL database has PostGIS enabled and identify the migration mechanism used for the live schema.
- Confirm whether Cloud L wants customers to place a pin at checkout, or staff to assign a zone manually from the supplied address.
- Confirm the operational delivery zones, ETB fees, and any minimum-order thresholds.

Until those facts are verified, do not write or apply a database migration, add a map provider, or change the order-creation contract.
