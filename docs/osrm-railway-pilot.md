# Cloud L Railway OSRM pilot

## Deployment

- Railway project: `cloudl-geospatial-routing`
- Service: `osrm-ethiopia`
- Region: Railway Europe West (`europe-west4`)
- Runtime image: `ghcr.io/project-osrm/osrm-backend:26.10.0-debian`
- Runtime allocation: 1 vCPU, 1 GB RAM
- Persistent volume: 500 MB mounted at `/data`
- Listener: `0.0.0.0:5000`
- Networking: private service only; no public domain is configured

The 500 MB volume and 1 GB memory are current plan limits, not recommended long-term production capacity.

## Dataset

The pilot graph is limited to the Addis Ababa bounding box:

- South: 8.75
- West: 38.55
- North: 9.20
- East: 39.05

The service bootstraps a road-only OSM XML extract from the Ethiopia Overpass instance, then runs:

1. `osrm-extract --threads 1 -p /opt/car.lua`
2. `osrm-partition --threads 1`
3. `osrm-customize --threads 1`

The resulting MLD graph is persisted on the Railway volume. The original OSM XML is removed after graph preparation.

The full Ethiopia PBF was tested as an initial approach but the first extraction exceeded the current runtime memory limit. The Addis-only extract completed within the current allocation. The observed OSRM extraction peak was approximately 317 MB; partitioning peaked around 84 MB.

## Smoke test

A container-local route request was executed after graph preparation:

```text
GET /route/v1/driving/38.75,9.03;38.76,9.04?overview=false&steps=false
```

Observed result:

- OSRM response code: `Ok`
- HTTP status: 200
- Response size: 592 bytes
- Observed local request time: approximately 155 ms

This verifies one synthetic route inside the pilot bounding box. It does not establish complete Addis road coverage, real courier ETA accuracy, or motorcycle routing quality.

## Integration boundary

- Cloud L checkout and order confirmation are not connected to this service.
- Existing delivery-zone fees and manual fee entry remain unchanged.
- No public OSRM domain is exposed.
- Vercel-to-Railway connectivity still requires a secure private connection or authenticated gateway; do not expose raw OSRM publicly to solve this.
- The OSRM `car.lua` profile is not motorcycle-specific and does not include live traffic.

## Data attribution

The road network is derived from OpenStreetMap. Any public-facing maps or derived data must provide appropriate OpenStreetMap attribution and comply with ODbL obligations. See the [OpenStreetMap attribution guidelines](https://www.openstreetmap.org/copyright).
