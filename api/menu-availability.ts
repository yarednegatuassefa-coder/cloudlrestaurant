import { pool, reject, type ApiReq, type ApiRes } from "./_server.js";

export default async function handler(req: ApiReq, res: ApiRes) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return reject(res, 405, "Use GET.");
  }
  if (!process.env.DATABASE_URL) return reject(res, 503, "Menu availability is temporarily unavailable.");
  try {
    const result = await pool.query("SELECT menu_item_id FROM public.menu_availability WHERE is_sold_out=true");
    return res.status(200).json({ soldOutItemIds: result.rows.map((row) => row.menu_item_id as string) });
  } catch (error) {
    console.error("menu_availability_read_failed", error instanceof Error ? error.message : "unknown");
    return reject(res, 503, "Menu availability is temporarily unavailable.");
  }
}
