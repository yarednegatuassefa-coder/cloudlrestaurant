# Cloud L road-routing foundation (OSRM)

## Decision

Cloud L uses a provider-independent server-side routing interface with OSRM as the first adapter. OSRM is self-hostable and consumes OpenStreetMap road-network extracts. Its upstream project recommends the Multi-Level Dijkstra (MLD) pipeline for most deployments. The application does not call the public OSRM demo server.

## Current implementation boundary

- `lib/server/delivery-routing.mjs` provides a server-side OSRM client.
- Coordinates at the application boundary are `[latitude, longitude]`; the adapter converts them to OSRM's `longitude,latitude` URL order.
- The adapter requests driving routes and returns road distance in metres and estimated duration in seconds.
- Successful responses are cached in process memory (default 60 seconds, maximum 500 entries).
- Requests have a bounded timeout; invalid upstream responses and transport errors are normalized without returning upstream response details.
- The adapter is opt-in. If `OSRM_BASE_URL` is absent, `getOsrmClientFromEnv()` returns `null`.
- No customer coordinate is sent to OSRM unless a server-side caller explicitly invokes the adapter.
- This foundation does not yet change checkout, delivery pricing, order confirmation, customer-facing APIs, or existing territory fees.

## Local OSRM with Docker

Requirements: Docker Engine with Compose, and enough disk/RAM for the chosen OpenStreetMap extract and OSRM preprocessing. For the first working pilot, use the Ethiopia extract; a clipped Addis Ababa extract can reduce preprocessing and storage once a suitable boundary polygon is available.

1. Create the local data directory:

   ```sh
   mkdir -p data/osrm
   ```

2. Download the Ethiopia PBF extract from [Geofabrik](https://download.geofabrik.de/africa/ethiopia-latest.osm.pbf). Save it as `data/osrm/ethiopia-latest.osm.pbf`. Record the download date and SHA-256 checksum in your operations notes. Do not commit the PBF or generated OSRM graph files. The whole-country extract is a reliable starting point; later, clip to Addis Ababa using a maintained city boundary polygon and `osmium extract` to reduce local preprocessing requirements.

3. Preprocess the extract using the official OSRM backend image (replace the filename with the downloaded file):

   ```sh
   docker run --rm -t -v "$PWD/data/osrm:/data" ghcr.io/project-osrm/osrm-backend:v26.10.0 osrm-extract -p /opt/car.lua /data/ethiopia-latest.osm.pbf
   docker run --rm -t -v "$PWD/data/osrm:/data" ghcr.io/project-osrm/osrm-backend:v26.10.0 osrm-partition /data/ethiopia-latest.osrm
   docker run --rm -t -v "$PWD/data/osrm:/data" ghcr.io/project-osrm/osrm-backend:v26.10.0 osrm-customize /data/ethiopia-latest.osrm
   ```

4. Start the local service:

   ```sh
   docker compose -f docker-compose.osrm.yml --profile routing up -d
   ```

5. Verify the local service with a known route:

   ```sh
   curl "http://127.0.0.1:5000/route/v1/driving/38.75,9.03;38.76,9.04?overview=false&steps=false"
   ```

6. Configure the Cloud L server process with `OSRM_BASE_URL=http://127.0.0.1:5000`. Do not expose port 5000 publicly. In production, place the router on a private network and allow access only from the application server.

The Compose service binds only to loopback. It is a local development/staging helper, not a Vercel deployment recipe. The router and its dataset must be hosted on infrastructure that can run the OSRM container and retain the preprocessed graph files.

## OpenStreetMap attribution and data handling

OpenStreetMap data is licensed under the Open Database License (ODbL). If Cloud L publicly displays maps or other produced works based on OSM data, provide visible attribution such as `© OpenStreetMap contributors` and link to https://www.openstreetmap.org/copyright. Review the ODbL terms before redistributing an extracted or derived database. Keep source and extract timestamps so route results can be traced to the road-network snapshot.

## Operational and modelling limits

- OSRM's standard `driving` profile models car routing. It is not a motorcycle-specific Addis Ababa delivery model and does not provide live traffic. Treat duration as a baseline estimate until validated against actual courier trips.
- OSRM returns road-network distance and modelled duration, not guaranteed delivery time. Preparation time, rider availability, congestion, weather, access restrictions and building-level navigation are outside this adapter.
- Cache is process-local. Multiple server instances have independent caches; use a shared cache only if measured traffic justifies it.
- The adapter is deliberately not wired into order creation yet. The next integration step needs an explicit quote/fee policy, operational validation against real routes, and tests proving the existing manual and zone-fee fallbacks remain intact.
- Never log raw customer coordinates or include them in public analytics, URLs exposed to browsers, or third-party AI prompts.

## Release gates

Before connecting routing to checkout or staff fee calculation:

1. Validate OSRM route coverage for a representative sample of Addis Ababa delivery pairs using synthetic coordinates.
2. Measure preprocessing time, dataset size, resident memory, request latency and failure rate on the intended host.
3. Compare OSRM distances/durations with actual courier journeys; document systematic error and any rider-specific limitations.
4. Define a fee formula in ETB and have the restaurant approve it. Do not infer commercial pricing from route duration alone.
5. Add rate limits and bounded concurrency at the server boundary.
6. Test router timeout, no-route, unavailable-router, out-of-coverage and stale-data cases.
7. Confirm manual fee entry and current territory-based fees still work if OSRM is unavailable.
8. Keep production deployment and any database changes as separately approved release actions.

## Upstream references

- OSRM backend and recommended MLD Docker workflow: https://github.com/Project-OSRM/osrm-backend
- OSRM route and table API: https://project-osrm.org/docs/v26.4.0/api/
