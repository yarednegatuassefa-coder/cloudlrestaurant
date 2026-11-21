import { isAllowedOrigin, reject, validSession, type ApiReq, type ApiRes } from "../_server.js";
import { getOsrmClientFromEnv } from "../../lib/server/delivery-routing.mjs";

type RouteRequest = ApiReq & { body?: unknown };

export default async function handler(req: RouteRequest, res: ApiRes) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return reject(res, 405, "Use POST.");
  }
  if (!isAllowedOrigin(req)) return reject(res, 403, "This request is not allowed.");
  if (!validSession(req)) return reject(res, 401, "Staff login required.");

  const client = getOsrmClientFromEnv({ authToken: process.env.OSRM_GATEWAY_TOKEN });
  if (!client) return reject(res, 503, "Delivery routing is not configured.");

  const body = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
  const isPair = (value: unknown): value is [number, number] =>
    Array.isArray(value) && value.length === 2 &&
    Number.isFinite(value[0]) && Number.isFinite(value[1]);
  if (!isPair(body.origin) || !isPair(body.destination)) {
    return reject(res, 400, "Provide origin and destination as [latitude, longitude] pairs.");
  }

  try {
    const route = await client.route(body.origin, body.destination);
    return res.status(200).json({
      ...route,
      estimatedMinutes: Math.ceil(route.durationSeconds / 60),
      estimateType: "OSRM driving-profile baseline",
      disclaimer: "Not a motorcycle-specific or live-traffic ETA. Validate against courier journeys before operational use.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Routing service is unavailable.";
    if (message.includes("coordinate pairs")) return reject(res, 400, "Coordinates are outside valid latitude/longitude ranges.");
    if (message.includes("No drivable road route")) return reject(res, 422, message);
    console.error("staff_delivery_route_failed", message);
    return reject(res, 503, "Routing is temporarily unavailable. Existing delivery-zone pricing is unaffected.");
  }
}
