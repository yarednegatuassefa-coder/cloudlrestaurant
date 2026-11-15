export type DeliveryPolygon = [number, number][];
export function isValidPolygon(polygon: unknown): polygon is DeliveryPolygon;
export function pointInPolygon(latitude: number, longitude: number, polygon: unknown): boolean;
export function findMatchingZone<T extends { id: string; polygon: unknown; is_active: boolean }>(latitude: number, longitude: number, zones: T[]): T | null;
