# RustGIS 0.8.0 assessment for Cloud L

**Status:** integration design and verification only. RustGIS is not yet a Cloud L runtime dependency, and no production routing or delivery-pricing behavior is changed by this document.

**Version check (22 November 2026):** the official `opengeos/RustGIS` main branch reports `0.8.0` in both `Cargo.toml` and `CITATION.cff` (release date 2026-11-22). The indexed GitHub Releases page may lag and still surface v0.6.0. Before pinning a binary, verify the actual signed v0.8.0 release asset and checksum at https://github.com/opengeos/RustGIS/releases.

## Decision

Use RustGIS as an **offline, staff-operated spatial-analysis workbench** that exchanges reviewed GeoPackage/GeoJSON data with Cloud L. Do not replace Cloud L's existing OSRM route service, PostgreSQL delivery-zone records, fee rules, or authenticated staff APIs.

RustGIS is a separate GIS application and headless CLI, not a drop-in routing library or a Cloud L server module. Its CLI can run engine commands and geoprocessing tools in a controlled batch:
- `rustgis-cli tools` lists available tools and parameter schemas.
- `rustgis-cli run --data <file> --cmd 'gp.run={...}'` runs headless analysis.
- `rustgis-cli info <file>` inspects an input.
- `--save <project.rgis>` saves a RustGIS project.

Official references:
- https://github.com/opengeos/RustGIS
- https://rustgis.app/cli/
- https://rustgis.app/user-guide/analysis/

## What v0.8.0 contributes that is relevant

The current RustGIS source documents:
- Built-in **Service Area** (`serviceArea`) and **OD Cost Matrix** (`odCostMatrix`) over a line network.
- A network graph shared/reused by routing, service-area and OD-matrix analysis while the line layer remains unchanged.
- PROJ 9.9 coordinate-system catalogue and on-request datum-grid downloads.
- Picture markers, expression-driven cartography, curved labels and chart-enabled layouts.
- GRIB, SRTM/DTED, GeoPDF and other geospatial data workflows.

For Cloud L, the first two network tools are the material additions. The cartography, raster and layout improvements are useful for reports and market analysis, not checkout or dispatch.

## Critical limits of RustGIS network analysis

Do not mistake the current network tools for a complete last-mile delivery optimiser:

1. **Service Area output is line segments, not isochrone polygons.** It cuts reachable network lines at break values and assigns each segment to its nearest facility. A polygon catchment/isochrone workflow is listed as future work in the project's roadmap.
2. **Network edges are bidirectional.** One-way travel restrictions and turn restrictions are not currently modelled by these tools.
3. **Default cost is ellipsoidal line length.** An optional cost field multiplies line length. A calibrated seconds-per-metre or other impedance factor could provide a proxy, but that does not create traffic-aware or courier-specific ETAs.
4. **Disconnected OD pairs are omitted** and counted in a notice. The OD matrix is an analysis table, not a live dispatch response.
5. **Topology matters.** Lines connect where vertices meet. Crossing lines without a shared vertex do not automatically form a junction. The network must be cleaned/noded before analysis.
6. **Snapping is bounded.** Facilities are snapped to the nearest line only within the configured Snap Distance (1,000 m by default); unmatched or ambiguous points are excluded and reported.

These limits are especially important in Addis Ababa, where one-way restrictions, narrow access roads, traffic, informal access conditions and motorcycle routing can materially change the route.

## Existing Cloud L foundation (already implemented)

- Delivery territories are polygons stored in PostgreSQL.
- Staff can create/edit/delete territories and configure an ETB fee per territory.
- Staff can export delivery territories as GeoJSON and import reviewed GeoJSON through the authenticated `/api/admin/delivery-zones` endpoint.
- The import contract currently accepts 1–50 single-ring Polygon features, with 3–100 vertices, unique names, an integer `delivery_fee_etb` from 0 to 10,000, and an `is_active` flag. Holes and MultiPolygons are rejected.
- Delivery analytics aggregate orders into coarse spatial cells and suppress cells with fewer than two orders.
- Staff can request a route estimate through `POST /api/admin/delivery-route`; it is session-protected and calls the private Addis OSRM service through the authenticated Railway gateway.
- OSRM uses a car profile, does not provide live traffic, and is informational only. It does not change delivery fees or customer checkout.

Relevant implementation:
- `api/admin/delivery-zones.ts`
- `api/admin/delivery-route.ts`
- `lib/server/delivery-geojson.mjs`
- `lib/server/delivery-geometry.mjs`
- `lib/server/delivery-routing.mjs`
- `docs/osrm-routing.md`
- `docs/osrm-railway-pilot.md`

## Proposed controlled workflow

### Phase A — offline analysis pilot

1. Obtain a dated Addis Ababa OSM road extract from a trusted source. Keep source URL, extract timestamp, license attribution and checksum.
2. Build a separate analysis network dataset. Preserve road class, access, one-way and surface attributes even though RustGIS's current network tools do not yet enforce all directional restrictions.
3. Normalize and node line topology so intersections share vertices. Exclude private/restricted roads where justified; document every filter.
4. Create a dispatch-facility point layer and synthetic test delivery points. Do not export customer names, phone numbers, order references or raw production customer coordinates into the GIS project.
5. Run RustGIS Service Area at explicitly stated distance breaks and OD Cost Matrix for the selected synthetic points. Use the default length impedance first; do not label it as travel time.
6. Compare results with OSRM driving routes and manually observed courier journeys. Record coverage, disconnected pairs, snap failures, and route discrepancies.
7. Export analysis outputs to GeoPackage/GeoJSON. Staff review them visually and validate the result before importing any delivery territory polygons into Cloud L.
8. Keep fee amounts independently approved by restaurant management. Spatial analysis may recommend a boundary; it must never silently set or change an ETB fee.

### Phase B — only after the pilot passes

- Decide whether to maintain a separate directed/turn-aware motorcycle network or continue using OSRM for all operational route calculations.
- Add an authenticated staff workflow for importing reviewed analytical outputs only if repeated manual work justifies it.
- Consider automated zone recommendations only with explicit preview, approval, rollback and audit history.
- Keep all live order coordinates server-side. Do not send customer coordinates to public GIS websites, third-party AI prompts or untrusted GIS plugins.

## Example RustGIS CLI analysis

The following is an illustrative command sequence, not a tested Cloud L command. Replace the file and layer names with verified inputs and inspect the installed v0.8.0 tool schema using `rustgis-cli tools` before running.

```sh
rustgis-cli info addis-roads.gpkg
rustgis-cli run --data addis-network.gpkg \
  --cmd 'gp.run={"tool":"serviceArea","params":{"network":"roads","facilities":"cloudl_dispatch","breaks":"1000, 2000, 3000"}}' \
  --cmd 'gp.run={"tool":"odCostMatrix","params":{"network":"roads","origins":"cloudl_dispatch","destinations":"synthetic_delivery_points","count":20}}' \
  --save cloudl-delivery-analysis.rgis
```

The actual network, facilities and destination layer names, cost-field configuration and output export method must be confirmed against the data and installed CLI. Never run this example against production customer coordinates.

## Acceptance gates

Do not merge a production integration or deploy a new analysis service until all of these pass:

- Confirm a signed RustGIS v0.8.0 binary and verify its published SHA-256 checksum.
- Validate Addis road-network coverage and topology on a synthetic fixture.
- Prove that one-way restrictions and turn restrictions are either handled by a separate directed routing engine or excluded from any claim of operational ETA accuracy.
- Test disconnected origins/destinations, snap failures, missing cost values, closed edges and duplicate vertices.
- Benchmark runtime and memory on the intended host; do not assume a desktop GIS workload is suitable for a small Railway service.
- Validate output CRS and coordinate order before GeoJSON import.
- Preserve existing OSRM routing, manual fee entry, territory matching and checkout behavior on every failure path.
- Require staff approval before any new or changed territory becomes active.

## Non-goals

- Replacing OSRM with RustGIS for live customer routing.
- Sending private customer coordinates to a public web app or an AI model.
- Automatically deriving delivery fees from distance or analysis cost.
- Claiming that current Service Area output is a polygon isochrone.
- Deploying RustGIS or changing production infrastructure as part of this documentation update.
