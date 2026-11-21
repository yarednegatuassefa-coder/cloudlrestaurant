const DEFAULT_TIMEOUT_MS = 3_500;
const DEFAULT_CACHE_TTL_MS = 60_000;
const DEFAULT_MAX_CACHE_ENTRIES = 500;

function isCoordinatePair(value) {
  return Array.isArray(value) && value.length === 2 &&
    Number.isFinite(value[0]) && Number.isFinite(value[1]) &&
    value[0] >= -90 && value[0] <= 90 &&
    value[1] >= -180 && value[1] <= 180;
}

function normalizeBaseUrl(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError("OSRM base URL is required.");
  }
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new TypeError("OSRM base URL must be an HTTP(S) URL without credentials, query, or fragment.");
  }
  return url.toString().replace(/\/+$/, "");
}

function cacheKey(origin, destination) {
  // Five decimal places are approximately metre-scale; avoid unbounded cache
  // cardinality from insignificant GPS jitter.
  return [origin, destination].map(([lat, lon]) => `${lat.toFixed(5)},${lon.toFixed(5)}`).join(";");
}

export function createOsrmClient({
  baseUrl = process.env.OSRM_BASE_URL,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  cacheTtlMs = DEFAULT_CACHE_TTL_MS,
  maxCacheEntries = DEFAULT_MAX_CACHE_ENTRIES,
  now = Date.now,
} = {}) {
  const endpoint = normalizeBaseUrl(baseUrl);
  if (typeof fetchImpl !== "function") throw new TypeError("A fetch implementation is required.");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30_000) throw new RangeError("OSRM timeout must be between 100 and 30000 ms.");
  if (!Number.isInteger(cacheTtlMs) || cacheTtlMs < 0 || cacheTtlMs > 3_600_000) throw new RangeError("OSRM cache TTL must be between 0 and 3600000 ms.");
  if (!Number.isInteger(maxCacheEntries) || maxCacheEntries < 0 || maxCacheEntries > 10_000) throw new RangeError("OSRM cache capacity must be between 0 and 10000.");
  const cache = new Map();

  async function route(origin, destination) {
    if (!isCoordinatePair(origin) || !isCoordinatePair(destination)) {
      throw new TypeError("Origin and destination must be [latitude, longitude] coordinate pairs.");
    }
    const key = cacheKey(origin, destination);
    const cached = cache.get(key);
    if (cached && cached.expiresAt > now()) {
      cache.delete(key);
      cache.set(key, cached);
      return { ...cached.value, cached: true };
    }
    if (cached) cache.delete(key);

    const coordinates = [origin, destination]
      .map(([latitude, longitude]) => `${longitude},${latitude}`).join(";");
    const url = `${endpoint}/route/v1/driving/${coordinates}?overview=false&steps=false`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let payload;
    try {
      const response = await fetchImpl(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!response || !response.ok) throw new Error("Routing service returned an unsuccessful HTTP response.");
      payload = await response.json();
    } catch (error) {
      if (controller.signal.aborted) throw new Error("Routing service request timed out.");
      throw new Error("Routing service is unavailable.");
    } finally {
      clearTimeout(timeout);
    }

    const result = payload?.routes?.[0];
    if (payload?.code !== "Ok" || !result ||
        !Number.isFinite(result.distance) || result.distance < 0 ||
        !Number.isFinite(result.duration) || result.duration < 0) {
      throw new Error(payload?.code === "NoRoute"
        ? "No drivable road route was found between these locations."
        : "Routing service returned an invalid route response.");
    }

    const value = {
      distanceMeters: result.distance,
      durationSeconds: result.duration,
      cached: false,
    };
    if (cacheTtlMs > 0 && maxCacheEntries > 0) {
      cache.set(key, { value, expiresAt: now() + cacheTtlMs });
      while (cache.size > maxCacheEntries) cache.delete(cache.keys().next().value);
    }
    return { ...value };
  }

  return Object.freeze({ route });
}

export function getOsrmClientFromEnv(options = {}) {
  const baseUrl = options.baseUrl ?? process.env.OSRM_BASE_URL;
  if (!baseUrl) return null;
  return createOsrmClient({ ...options, baseUrl });
}
