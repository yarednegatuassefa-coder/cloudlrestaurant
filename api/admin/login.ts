import { timingSafeEqual, scryptSync, randomBytes } from "node:crypto";
import { isAllowedOrigin, issueSession, reject, setSessionCookie, type ApiReq, type ApiRes } from "../_server.js";

const attempts = new Map<string, { count: number; until: number }>();
function tooMany(req: ApiReq) {
  const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  const now = Date.now(); const item = attempts.get(ip);
  if (!item || now > item.until) { attempts.set(ip, { count: 1, until: now + 10 * 60_000 }); return false; }
  item.count += 1; return item.count > 8;
}
function equalSecret(candidate: string, expected: string) {
  const salt = randomBytes(16);
  const a = scryptSync(candidate, salt, 32);
  const b = scryptSync(expected, salt, 32);
  return timingSafeEqual(a, b);
}

export default function handler(req: ApiReq, res: ApiRes) {
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
  if (tooMany(req)) return reject(res, 429, "Too many attempts. Please wait and try again.");
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length > 200 || !equalSecret(password, expected)) return reject(res, 401, "That password was not accepted.");
  setSessionCookie(res, issueSession(sessionSecret), 8 * 60 * 60);
  res.setHeader("X-Frame-Options", "DENY");
  return res.status(200).json({ authenticated: true, expiresInSeconds: 8 * 60 * 60 });
}
