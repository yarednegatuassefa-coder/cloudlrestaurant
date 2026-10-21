import { createHmac, timingSafeEqual } from "node:crypto";
import { Pool } from "pg";

const globalForPool = globalThis as typeof globalThis & { cloudlPool?: Pool };
export const pool = globalForPool.cloudlPool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: 3, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 7_000, ssl: { rejectUnauthorized: true } });
globalForPool.cloudlPool = pool;

export type ApiReq = { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown; query?: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } };
export type ApiRes = { status: (code: number) => ApiRes; setHeader: (name: string, value: string | number) => void; json: (data: unknown) => void; end: () => void };
export const COOKIE_NAME = "cloudl_staff_session";
const allowedOrigins = new Set(["https://www.cloudlrestaurant.com", "https://cloudlrestaurant.com"]);
export function isAllowedOrigin(req: ApiReq) {
  const origin = req.headers.origin;
  return typeof origin === "string" && allowedOrigins.has(origin);
}
function signature(payload: string, secret: string) { return createHmac("sha256", secret).update(payload).digest("base64url"); }
export function issueSession(secret: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ exp: now + 8 * 60 * 60 * 1000 })).toString("base64url");
  return `${payload}.${signature(payload, secret)}`;
}
export function validSession(req: ApiReq) {
  const secret = process.env.STAFF_SESSION_SECRET;
  if (!secret || secret.length < 32) return false;
  const cookies = (req.headers.cookie || "").toString().split(";").map((entry) => entry.trim());
  const raw = cookies.find((entry) => entry.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1) || "";
  const [payload, supplied, ...extra] = raw.split(".");
  if (!payload || !supplied || extra.length) return false;
  const expected = signature(payload, secret);
  const left = Buffer.from(supplied); const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return false;
  try { const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: number }; return typeof session.exp === "number" && session.exp > Date.now(); }
  catch { return false; }
}
export function setSessionCookie(res: ApiRes, value: string, maxAge: number) {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=${value}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`);
}
export function reject(res: ApiRes, status: number, message: string) {
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).json({ error: message });
}
