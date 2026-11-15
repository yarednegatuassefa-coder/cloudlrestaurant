# Customer delivery pin

## Scope

Delivery checkout accepts an optional customer-selected map pin alongside the existing written address, landmark, and delivery notes. Customers can tap the map, drag the marker, or explicitly request browser geolocation. Written address entry remains required and is the fallback.

The authenticated staff order board exposes the saved coordinates through a Google Maps link. Customer tracking responses do not expose the coordinates.

## Data and migration

Apply `db/migrations/006_customer_delivery_coordinates.sql` to the target database before deploying this application revision. The migration adds nullable latitude/longitude columns with paired-value and range constraints. It does not install PostGIS or modify existing orders.

Do not apply this migration to production until it has been reviewed and tested against a non-production Neon branch and the normal database backup/rollback process is confirmed.

## Delivery coverage and fees

This change does not automatically approve delivery, calculate fees, or declare an address serviceable. Existing staff review remains authoritative: staff confirms coverage and enters the delivery fee before confirming the order. No zone polygons or delivery pricing rules are configured yet.

## Privacy and external services

- Coordinates are only requested from the browser when the customer presses **Use my location**.
- The map loads Leaflet from unpkg and map tiles from OpenStreetMap. Those providers receive normal network metadata such as IP address and requested tile coordinates.
- The app stores the selected coordinates with the order; only authenticated staff order APIs return them.
- Do not put customer coordinates into public maps, analytics exports, or third-party AI prompts.
- Customer can continue with the written address without selecting a pin.

## Verification

Run `npm run test:api` and `npm run build`. Then test on a non-production database with:
- Delivery with pin selected.
- Delivery with written address only.
- Pickup/dine-in with no pin.
- Invalid, partial, and out-of-range coordinates rejected by the API.
- Staff-only map link visible after login.
- Customer tracking endpoint does not include coordinates.

The migration must be applied before running the new API against a database, otherwise the order insert and staff query will fail due to the new columns not existing.
