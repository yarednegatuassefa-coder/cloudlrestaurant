import { pool, reject, type ApiReq, type ApiRes } from "./_server.js";

export default async function handler(req: ApiReq, res: ApiRes) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return reject(res, 405, "Use GET."); }
  if (!process.env.DATABASE_URL) return reject(res, 503, "Payment methods are temporarily unavailable.");
  try {
    const result = await pool.query("SELECT id,label,payment_type FROM public.payment_methods WHERE is_enabled=true ORDER BY sort_order,id");
    return res.status(200).json({ methods: result.rows });
  } catch (error) {
    console.error("payment_methods_public_read_failed", error instanceof Error ? error.message : "unknown");
    return reject(res, 503, "Payment methods are temporarily unavailable.");
  }
}
