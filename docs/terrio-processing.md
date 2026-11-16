# Terrio geospatial preflight for Cloud L

## Purpose

Terrio is the local geospatial processing layer between GIS work (RustGIS) and Cloud L's existing staff GeoJSON import. It can inspect and validate vector datasets, convert supported formats, and reproject them to WGS84/EPSG:4326 before they enter Cloud L's strict delivery-zone contract.

This is an offline operator tool. It does not run in Vercel, call a hosted Terrio service, synchronize data, or write to the production database.

## Supported workflow

1. Export a working layer from RustGIS or another GIS.
2. Keep a copy of the source dataset unchanged.
3. Install Terrio CLI locally and verify `terrio --version`.
4. Run the normalizer from the repository root:

   ```powershell
   npm run gis:normalize-delivery-zones -- .\exports\candidate-zones.gpkg .\exports\candidate-zones-wgs84.geojson
   ```

5. The script runs `terrio info --json`, `terrio check --json`, then `terrio convert ... --t-srs EPSG:4326`.
6. It validates the resulting FeatureCollection using the same Cloud L GeoJSON parser used by the staff API.
7. Review the output and its summary. Only then sign in to Cloud L staff board → Delivery intelligence → Import from RustGIS.

Accepted local inputs: GeoPackage (.gpkg), GeoParquet (.parquet), FlatGeobuf (.fgb), GeoJSON (.geojson/.json), and zipped Shapefile (.shp.zip). Input limit: 100 MB. Output limit: 2 MB, matching the current staff import limit. The script never accepts URLs, symlink inputs, overwrites an existing output, or sends data to a third party. It invokes Terrio with an argument array and no shell.

## Cloud L import contract

- GeoJSON FeatureCollection.
- Polygon geometries with exactly one exterior ring; no holes or MultiPolygons.
- Every feature has a 2–80 character `properties.name`.
- Every feature has integer `properties.delivery_fee_etb` from 0 to 10,000 ETB.
- Optional `properties.is_active` is true only when explicitly set to boolean true; otherwise import is inactive.
- Entire import is atomic and creates new zones only. Duplicate names reject the complete batch; existing zones are never overwritten.

The normalization script deliberately calls the same parser as the API, so a file marked `ready-for-staff-review` satisfies the current server-side format and business-field validation. It does not validate whether the fee or boundary is commercially correct. The restaurant owner must review and approve the actual territory and fee before activation.

## Version note

Use Terrio 0.9.0 where the official release binary/package is available. The Terrio repository workspace manifest identifies version 0.9.0, but the public GitHub Releases page currently lists v0.8.0 as its latest tagged release. Verify the release asset and checksum before installing a 0.9.0 binary; do not assume a social announcement alone proves that an installer artifact is published. The preflight script prints the installed CLI version and warns when it is older than 0.9.0.

Upstream:
- https://github.com/opengeos/terrio
- https://terrio.dev/installation/
- https://terrio.dev/cli/
- https://terrio.dev/formats/

## Operational boundaries

- Terrio is not a replacement for Cloud L's server-side polygon matching or fee calculation.
- No customer coordinates, patient data, or unaggregated order records should be copied into GIS projects.
- Do not use remote URLs in this script. Remote reads can disclose request metadata and introduce SSRF/data-source trust risks in hosted workflows.
- This script is a local preflight, not a production API. It performs no database writes and does not automatically import or activate zones.
