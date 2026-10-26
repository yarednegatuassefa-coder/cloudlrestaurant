import { MENU_AVAILABILITY_LOCK_SQL, pool, isAllowedOrigin, reject, validSession, type ApiReq, type ApiRes } from "../_server.js";
import catalogData from "../_catalog.json" with { type: "json" };

type CatalogEntry = { id: string; name: string; nameAmharic: string; size?: string };
const catalog = catalogData as CatalogEntry[];
const catalogById = new Map(catalog.map((item) => [item.id, item]));
function categoryFor(id: string) {
  if (id.startsWith("food-non-fasting-")) return "Non-fasting";
  if (id.startsWith("food-fasting-")) return "Fasting";
  if (id.startsWith("food-american-")) return "American";
  return "Drinks";
}

export default async function handler(req: ApiReq, res: ApiRes) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method === "GET" ? (req.headers.origin !== undefined && !isAllowedOrigin(req)) : !isAllowedOrigin(req)) return reject(res, 403, "This request is not allowed.");
  if (!validSession(req)) return reject(res, 401, "Staff login required.");
  if (!process.env.DATABASE_URL) return reject(res, 503, "Menu availability is temporarily unavailable.");
  if (req.method === "GET") {
    try {
      const result = await pool.query("SELECT menu_item_id,is_sold_out,updated_at,updated_by FROM public.menu_availability");
      const states = new Map(result.rows.map((row) => [row.menu_item_id as string, row]));
      const items = catalog.map((item) => {
        const state = states.get(item.id);
        return {
          id: item.id,
          name: item.name,
          nameAmharic: item.nameAmharic,
          ...(item.size ? { size: item.size } : {}),
          isSoldOut: state?.is_sold_out === true,
          updatedAt: state?.updated_at ?? null,
          updatedBy: state?.updated_by ?? null,
          category: categoryFor(item.id),
        };
      });
      return res.status(200).json({ items });
    } catch (error) {
      console.error("staff_menu_availability_read_failed", error instanceof Error ? error.message : "unknown");
      return reject(res, 503, "Menu availability could not be loaded.");
    }
  }
  if (req.method !== "PATCH") {
    res.setHeader("Allow", "GET, PATCH");
    return reject(res, 405, "Use GET or PATCH.");
  }
  const body = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body as Record<string, unknown> : {};
  if (typeof body.itemId !== "string" || !catalogById.has(body.itemId) || typeof body.isSoldOut !== "boolean") return reject(res, 400, "Choose a valid menu item and set isSoldOut to true or false.");
  const item = catalogById.get(body.itemId)!;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(MENU_AVAILABILITY_LOCK_SQL, [item.id]);
    const result = await client.query(
      `INSERT INTO public.menu_availability (menu_item_id,is_sold_out,updated_at,updated_by)
       VALUES ($1,$2,now(),'Cloud L staff')
       ON CONFLICT (menu_item_id) DO UPDATE SET is_sold_out=EXCLUDED.is_sold_out,updated_at=now(),updated_by='Cloud L staff'
       RETURNING menu_item_id,is_sold_out,updated_at,updated_by`,
      [item.id, body.isSoldOut],
    );
    await client.query("COMMIT");
    const state = result.rows[0];
    return res.status(200).json({ item: { id: item.id, name: item.name, nameAmharic: item.nameAmharic, ...(item.size ? { size: item.size } : {}), isSoldOut: state.is_sold_out, updatedAt: state.updated_at, updatedBy: state.updated_by, category: categoryFor(item.id) } });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("staff_menu_availability_write_failed", error instanceof Error ? error.message : "unknown");
    return reject(res, 503, "Menu availability could not be saved.");
  } finally { client.release(); }
}
