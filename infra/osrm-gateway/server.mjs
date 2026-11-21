import http from "node:http";
import { timingSafeEqual } from "node:crypto";

const token = process.env.OSRM_GATEWAY_TOKEN || "";
const upstream = (process.env.OSRM_UPSTREAM_URL || "http://osrm-ethiopia.railway.internal:5000").replace(/\/$/, "");
const buckets = new Map();

function send(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
  });
  res.end(JSON.stringify(payload));
}

function authorized(value) {
  if (!token || !value?.startsWith("Bearer ")) return false;
  const supplied = Buffer.from(value.slice(7));
  const expected = Buffer.from(token);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function validRoute(path) {
  const match = path.match(/^\/route\/v1\/driving\/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?);(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/);
  if (!match) return false;
  const [lon1, lat1, lon2, lat2] = match.slice(1).map(Number);
  return [lon1, lon2].every((value) => Number.isFinite(value) && value >= 38.55 && value <= 39.05) &&
    [lat1, lat2].every((value) => Number.isFinite(value) && value >= 8.75 && value <= 9.20);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://gateway");
  if (req.method === "GET" && url.pathname === "/health") return send(res, 200, { ok: true });
  if (req.method !== "GET") {
    res.setHeader("allow", "GET");
    return send(res, 405, { error: "Method not allowed." });
  }
  if (!authorized(req.headers.authorization)) return send(res, 401, { error: "Unauthorized." });

  const ip = req.socket.remoteAddress || "unknown";
  const now = Date.now();
  let bucket = buckets.get(ip);
  if (!bucket || bucket.resetAt <= now) bucket = { count: 0, resetAt: now + 60_000 };
  bucket.count += 1;
  buckets.set(ip, bucket);
  if (bucket.count > 60) return send(res, 429, { error: "Rate limit exceeded." });

  if (url.pathname.length > 300 || !validRoute(url.pathname)) {
    return send(res, 400, { error: "Unsupported routing request." });
  }
  const allowed = new Set(["overview", "steps", "geometries", "alternatives", "annotations", "continue_straight"]);
  for (const [key, value] of url.searchParams) {
    if (!allowed.has(key) || value.length > 32) return send(res, 400, { error: "Unsupported routing option." });
  }
  if (buckets.size > 5_000) {
    for (const [key, value] of buckets) if (value.resetAt <= now) buckets.delete(key);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_500);
  try {
    const response = await fetch(upstream + url.pathname + url.search, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    const body = await response.text();
    if (body.length > 1_048_576) return send(res, 502, { error: "Routing response too large." });
    res.writeHead(response.status, {
      "content-type": response.headers.get("content-type") || "application/json",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    });
    res.end(body);
  } catch {
    send(res, 502, { error: "Routing engine unavailable." });
  } finally {
    clearTimeout(timeout);
  }
});

server.listen(Number(process.env.PORT || 3000), "0.0.0.0");
