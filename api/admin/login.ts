import { createHash, timingSafeEqual, scryptSync, randomBytes } from "node:crypto";
import { pool, isAllowedOrigin, issueSession, reject, setSessionCookie, type ApiReq, type ApiRes } from "../_server.js";

const MAX_ATTEMPTS = 8;
const fallbackAttempts = new Map<string, { count: number; until: number }>();

function clientKey(req: ApiReq) {
  const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  return createHash("sha256").update(ip).digest("hex");
}
function tooManyInMemory(key: string) {
  const now = Date.now(); const item = fallbackAttempts.get(key);
  if (!item || now > item.until) { fallbackAttempts.set(key, { count: 1, until: now + 10 * 60_000 }); return false; }
  item.count += 1; return item.count > MAX_ATTEMPTS;
}
async function tooMany(key: string) {
  if (!process.env.DATABASE_URL) return tooManyInMemory(key);
  try {
    const result = await pool.query(
      `INSERT INTO public.staff_login_attempts (ip_hash, attempt_count, window_start)
       VALUES ($1, 1, now())
       ON CONFLICT (ip_hash) DO UPDATE SET
         attempt_count = CASE WHEN public.staff_login_attempts.window_start < now() - interval '10 minutes' THEN 1 ELSE public.staff_login_attempts.attempt_count + 1 END,
         window_start = CASE WHEN public.staff_login_attempts.window_start < now() - interval '10 minutes' THEN now() ELSE public.staff_login_attempts.window_start END
       RETURNING attempt_count`,
      [key],
    );
    pool.query("DELETE FROM public.staff_login_attempts WHERE window_start < now() - interval '1 day'").catch(() => undefined);
    return Number(result.rows[0].attempt_count) > MAX_ATTEMPTS;
  } catch (error) {
    console.error("staff_login_rate_limit_failed", error instanceof Error ? error.message : "unknown");
    return tooManyInMemory(key);
  }
}
function equalSecret(candidate: string, expected: string) {
  const salt = randomBytes(16);
  const a = scryptSync(candidate, salt, 32);
  const b = scryptSync(expected, salt, 32);
  return timingSafeEqual(a, b);
}

export default async function handler(req: ApiReq, res: ApiRes) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return reject(res, 405, "Use POST."); }
  if (!isAllowedOrigin(req)) return reject(res, 403, "This request is not allowed.");
  const body = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
  if (body.action === "logout") {
    setSessionCookie(res, "", 0);
    return res.status(200).json({ authenticated: false });
  }
  const expected = process.env.STAFF_PASSWORD;
  const sessionSecret = process.env.STAFF_SESSION_SECRET;
  if (!expected || expected.length < 12 || !sessionSecret || sessionSecret.length < 32) return reject(res, 503, "Staff access is not configured. Contact the site owner.");
  const key = clientKey(req);
  if (await tooMany(key)) return reject(res, 429, "Too many attempts. Please wait and try again.");
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length > 200 || !equalSecret(password, expected)) return reject(res, 401, "That password was not accepted.");
  fallbackAttempts.delete(key);
  pool.query("DELETE FROM public.staff_login_attempts WHERE ip_hash=$1", [key]).catch(() => undefined);
  setSessionCookie(res, issueSession(sessionSecret), 8 * 60 * 60);
  res.setHeader("X-Frame-Options", "DENY");
  return res.status(200).json({ authenticated: true, expiresInSeconds: 8 * 60 * 60 });
}
