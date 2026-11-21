import { pool, reject, validSession, type ApiReq, type ApiRes } from "../_server.js";
import { getOsrmClientFromEnv } from "../../lib/server/delivery-routing.mjs";

const DISPATCH_ORIGIN: [number, number] = [9.0323875, 38.774515625];
const PILOT_BOUNDS = { south: 8.75, west: 38.55, north: 9.2, east: 39.05 };
const MAX_ROUTE_CELLS = 12;

type RouteAnalyticsReq = ApiReq & { query?: Record<string, string | string[] | undefined> };

export const config = { maxDuration: 60 };

export default async function handler(req: RouteAnalyticsReq, res: ApiRes) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return reject(res, 405, "Use GET.");
  }
  if (!validSession(req)) return reject(res, 401, "Staff login required.");
  if (!process.env.DATABASE_URL) return reject(res, 503, "Delivery analytics are not configured.");

  const rawDays = Array.isArray(req.query?.days) ? req.query.days[0] : req.query?.days;
  const days = rawDays === "7" ? 7 : rawDays === "90" ? 90 : 30;
  const gatewayToken = process.env.OSRM_GATEWAY_TOKEN;
  if (!process.env.OSRM_BASE_URL || !gatewayToken || gatewayToken.length < 32) {
    return reject(res, 503, "Delivery routing is not configured.");
  }
  const client = getOsrmClientFromEnv({ authToken: gatewayToken });
  if (!client) return reject(res, 503, "Delivery routing is not configured.");

  try {
    const [clusters, totals] = await Promise.all([
      pool.query(
        `SELECT floor(delivery_latitude * 100)::int AS lat_cell,
                floor(delivery_longitude * 100)::int AS lng_cell,
                (floor(delivery_latitude * 100)::int / 100.0 + 0.005)::float AS latitude,
                (floor(delivery_longitude * 100)::int / 100.0 + 0.005)::float AS longitude,
                count(*)::int AS orders
         FROM public.orders
         WHERE fulfillment = 'delivery'
           AND delivery_latitude BETWEEN $2 AND $3
           AND delivery_longitude BETWEEN $4 AND $5
           AND created_at >= now() - ($1::text || ' days')::interval
           AND status NOT IN ('declined', 'cancelled')
         GROUP BY 1, 2
         HAVING count(*) >= 2
         ORDER BY orders DESC
         LIMIT ${MAX_ROUTE_CELLS}`,
        [days, PILOT_BOUNDS.south, PILOT_BOUNDS.north, PILOT_BOUNDS.west, PILOT_BOUNDS.east],
      ),
      pool.query(
        `SELECT count(*)::int AS pinned_orders,
                count(*) FILTER (
                  WHERE delivery_latitude BETWEEN $2 AND $3
                    AND delivery_longitude BETWEEN $4 AND $5
                )::int AS orders_inside_pilot
         FROM public.orders
         WHERE fulfillment = 'delivery'
           AND delivery_latitude IS NOT NULL
           AND delivery_longitude IS NOT NULL
           AND created_at >= now() - ($1::text || ' days')::interval
           AND status NOT IN ('declined', 'cancelled')`,
        [days, PILOT_BOUNDS.south, PILOT_BOUNDS.north, PILOT_BOUNDS.west, PILOT_BOUNDS.east],
      ),
    ]);

    const cells: Array<{
      latitude: number;
      longitude: number;
      orders: number;
      distanceMeters: number;
      estimatedMinutes: number;
    }> = [];
    let failedCells = 0;
    for (const row of clusters.rows) {
      try {
        const route = await client.route(DISPATCH_ORIGIN, [Number(row.latitude), Number(row.longitude)]);
        cells.push({
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
          orders: Number(row.orders),
          distanceMeters: Math.round(route.distanceMeters),
          estimatedMinutes: Math.ceil(route.durationSeconds / 60),
        });
      } catch {
        failedCells += 1;
      }
    }

    const sampledOrders = cells.reduce((sum, cell) => sum + cell.orders, 0);
    const weightedDistance = sampledOrders
      ? cells.reduce((sum, cell) => sum + cell.distanceMeters * cell.orders, 0) / sampledOrders
      : 0;
    const weightedMinutes = sampledOrders
      ? cells.reduce((sum, cell) => sum + cell.estimatedMinutes * cell.orders, 0) / sampledOrders
      : 0;

    return res.status(200).json({
      days,
      origin: DISPATCH_ORIGIN,
      sampleLimit: MAX_ROUTE_CELLS,
      cells,
      summary: {
        pinnedOrders: Number(totals.rows[0]?.pinned_orders || 0),
        ordersInsidePilot: Number(totals.rows[0]?.orders_inside_pilot || 0),
        sampledCells: clusters.rows.length,
        routedCells: cells.length,
        failedCells,
        sampledOrders,
        weightedAverageDistanceMeters: Math.round(weightedDistance),
        weightedAverageMinutes: Math.round(weightedMinutes),
      },
      disclaimer: "Advisory sample of the busiest 1.1 km order clusters. Car-profile road estimates; no live traffic or motorcycle adjustment. Not a courier ETA or a pricing recommendation.",
    });
  } catch (error) {
    console.error("staff_delivery_route_analytics_failed", error instanceof Error ? error.message : "unknown");
    return reject(res, 503, "Route coverage analysis is temporarily unavailable.");
  }
}
