export type DeliveryCoordinate = [latitude: number, longitude: number];
export type OsrmRouteResult = {
  distanceMeters: number;
  durationSeconds: number;
  cached: boolean;
};
export type OsrmClientOptions = {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  cacheTtlMs?: number;
  maxCacheEntries?: number;
  now?: () => number;
  authToken?: string;
};
export function createOsrmClient(options?: OsrmClientOptions): {
  route(origin: DeliveryCoordinate, destination: DeliveryCoordinate): Promise<OsrmRouteResult>;
};
export function getOsrmClientFromEnv(options?: OsrmClientOptions): ReturnType<typeof createOsrmClient> | null;
