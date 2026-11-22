import { pool } from "../../../api/_server.js";

export const name = "menu.unavailable_items";
export const description = "Return IDs of currently unavailable menu items. No customer or order data is read.";

export async function run() {
  const result = await pool.query(
    "SELECT menu_item_id FROM public.menu_availability WHERE is_sold_out = true ORDER BY menu_item_id LIMIT 500"
  );
  return { count: result.rows.length, itemIds: result.rows.map((row) => String(row.menu_item_id)), cappedAt: 500, truncated: result.rows.length === 500 };
}
