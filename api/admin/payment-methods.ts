import { randomBytes } from "node:crypto";
import type { PoolClient } from "pg";
import { pool, isAllowedOrigin, reject, validSession, type ApiReq, type ApiRes } from "../_server.js";

const fieldLimits: Record<string, number> = { label: 120, bank_name: 120, recipient_name: 120, phone_number: 40, account_number: 80, merchant_id: 80, instructions: 1000 };
const mutable = Object.keys(fieldLimits);
type Req = ApiReq & { body?: unknown };
function hasControlCharacters(value: string) {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if ((code >= 0 && code <= 8) || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127) return true;
  }
  return false;
}
function parseFields(body: Record<string, unknown>, creating: boolean) {
  const fields: Record<string, string | null> = {};
  for (const [key, max] of Object.entries(fieldLimits)) {
    if (!(key in body) && !creating) continue;
    const value = body[key];
    if (typeof value !== "string" || value.trim().length > max || (key === "label" && value.trim().length < 1)) throw new Error(`invalid:${key}`);
    const clean = value.trim();
    if (hasControlCharacters(clean)) throw new Error(`invalid:${key}`);
    fields[key] = clean || null;
  }
  if (creating && (!fields.label || !fields.bank_name || !fields.recipient_name)) throw new Error("invalid:required");
  return fields;
}
function parseQr(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 700000) throw new Error("invalid:qr");
  const match = value.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match || !Buffer.from(match[2], "base64").length || Buffer.from(match[2], "base64").length > 512 * 1024) throw new Error("invalid:qr");
  const decoded = Buffer.from(match[2], "base64");
  const valid = match[1] === "png" ? decoded.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : match[1] === "jpeg" ? decoded[0] === 0xff && decoded[1] === 0xd8 && decoded[decoded.length - 2] === 0xff && decoded[decoded.length - 1] === 0xd9 : decoded.length >= 12 && decoded.toString("ascii", 0, 4) === "RIFF" && decoded.toString("ascii", 8, 12) === "WEBP";
  if (!valid || decoded.toString("base64") !== match[2]) throw new Error("invalid:qr");
  return value;
}
function currentActor(req: Req) {
  void req;
  return "staff_session";
}
function snapshot(row: Record<string, unknown>) {
  const { qr_code_data_url: _qr, ...safe } = row;
  return safe;
}
async function preserveLegacyOrderSnapshots(client: PoolClient, methodId: string) {
  await client.query(`UPDATE public.orders o SET payment_destination_snapshot=jsonb_build_object('id',p.id,'label',p.label,'payment_type',p.payment_type,'bank_name',p.bank_name,'recipient_name',p.recipient_name,'phone_number',p.phone_number,'account_number',p.account_number,'merchant_id',p.merchant_id,'instructions',p.instructions,'qr_asset_id',p.qr_asset_id) FROM public.payment_methods p WHERE p.id=$1 AND o.payment_method=p.id AND (o.payment_destination_snapshot IS NULL OR o.payment_destination_snapshot='{}'::jsonb)`, [methodId]);
}

export default async function handler(req: Req, res: ApiRes) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method === "GET" ? (req.headers.origin !== undefined && !isAllowedOrigin(req)) : !isAllowedOrigin(req)) return reject(res, 403, "This request is not allowed.");
  if (!validSession(req)) return reject(res, 401, "Staff login required.");
  if (!process.env.DATABASE_URL) return reject(res, 503, "Payment settings are not configured.");
  if (req.method === "GET") {
    try {
      const [methods, changes] = await Promise.all([
        pool.query(`SELECT p.id,p.label,p.payment_type,p.is_enabled,p.bank_name,p.recipient_name,p.phone_number,p.account_number,p.merchant_id,p.instructions,q.data_url AS qr_code_data_url FROM public.payment_methods p LEFT JOIN public.payment_qr_assets q ON q.id=p.qr_asset_id ORDER BY p.sort_order,p.id`),
        pool.query(`SELECT id,method_id,method_label,action,created_at,changed_by,summary FROM public.payment_method_changes ORDER BY created_at DESC,id DESC LIMIT 100`),
      ]);
      return res.status(200).json({ methods: methods.rows, changes: changes.rows });
    } catch (error) {
      console.error("payment_methods_read_failed", error instanceof Error ? error.message : "unknown");
      return reject(res, 503, "Payment settings could not be loaded.");
    }
  }
  if (req.method !== "POST" && req.method !== "PATCH") { res.setHeader("Allow", "GET, POST, PATCH"); return reject(res, 405, "Use GET, POST, or PATCH."); }
  const body = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body as Record<string, unknown> : {};
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (req.method === "POST") {
      let fields: Record<string, string | null>;
      let qr: string | null;
      try { fields = parseFields(body, true); qr = parseQr(body.qr_code_data_url); } catch { await client.query("ROLLBACK"); return reject(res, 400, "Payment details are invalid or exceed allowed lengths."); }
      if (!fields.account_number && !fields.phone_number && !fields.merchant_id && !qr) { await client.query("ROLLBACK"); return reject(res, 400, "Add an account number, phone number, merchant ID, or QR image."); }
      const id = `manual_${randomId()}`;
      let qrId: string | null = null;
      if (qr) { qrId = `qr_${randomId()}`; await client.query("INSERT INTO public.payment_qr_assets (id,data_url) VALUES ($1,$2)", [qrId, qr]); }
      const result = await client.query(`INSERT INTO public.payment_methods (id,label,payment_type,is_enabled,sort_order,bank_name,recipient_name,phone_number,account_number,merchant_id,instructions,qr_asset_id) VALUES ($1,$2,'manual_transfer',false,100,$3,$4,$5,$6,$7,$8,$9) RETURNING id,label,payment_type,is_enabled,bank_name,recipient_name,phone_number,account_number,merchant_id,instructions,qr_asset_id`, [id, fields.label, fields.bank_name, fields.recipient_name, fields.phone_number, fields.account_number, fields.merchant_id, fields.instructions, qrId]);
      const created = result.rows[0];
      await client.query("INSERT INTO public.payment_method_changes (method_id,method_label,action,changed_by,summary,before_state,after_state) VALUES ($1,$2,'create',$3,'Created manual transfer destination.',NULL,$4::jsonb)", [id, fields.label, currentActor(req), JSON.stringify(created)]);
      await client.query("COMMIT");
      return res.status(201).json({ method: { ...created, qr_code_data_url: qr } });
    }
    if (body.action !== "update" && body.action !== "toggle") { await client.query("ROLLBACK"); return reject(res, 400, "Choose update or toggle."); }
    if (typeof body.id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(body.id)) { await client.query("ROLLBACK"); return reject(res, 400, "Payment method ID is invalid."); }
    const found = await client.query(`SELECT p.*,q.data_url AS qr_code_data_url FROM public.payment_methods p LEFT JOIN public.payment_qr_assets q ON q.id=p.qr_asset_id WHERE p.id=$1 FOR UPDATE OF p`, [body.id]);
    if (!found.rowCount) { await client.query("ROLLBACK"); return reject(res, 404, "Payment method not found."); }
    const before = found.rows[0];
    if (before.payment_type === "cash") { await client.query("ROLLBACK"); return reject(res, 409, "Cash cannot be changed or disabled here."); }
    await preserveLegacyOrderSnapshots(client, body.id);
    let after: Record<string, unknown>;
    let action: "edit" | "toggle";
    if (body.action === "toggle") {
      if (typeof body.is_enabled !== "boolean") { await client.query("ROLLBACK"); return reject(res, 400, "is_enabled must be true or false."); }
      action = "toggle";
      const result = await client.query("UPDATE public.payment_methods SET is_enabled=$2,updated_at=now() WHERE id=$1 RETURNING *", [body.id, body.is_enabled]); after = result.rows[0];
    } else {
      let fields: Record<string, string | null>;
      let qr: string | null | undefined;
      try { fields = parseFields(body, false); qr = body.qr_code_data_url !== undefined ? parseQr(body.qr_code_data_url) : undefined; if (body.remove_qr !== undefined && typeof body.remove_qr !== "boolean") throw new Error(); } catch { await client.query("ROLLBACK"); return reject(res, 400, "Payment details are invalid or exceed allowed lengths."); }
      if (body.remove_qr === true) qr = null;
      if (typeof qr === "string" && qr === before.qr_code_data_url) qr = undefined;
      const effectiveValue = (key: string) => key in fields ? fields[key] : before[key];
      const effectiveQr = qr === undefined ? before.qr_code_data_url : qr;
      if (!effectiveValue("account_number") && !effectiveValue("phone_number") && !effectiveValue("merchant_id") && !effectiveQr) { await client.query("ROLLBACK"); return reject(res, 400, "Keep an account number, phone number, merchant ID, or QR image on the destination."); }
      const qrId = qr === undefined ? before.qr_asset_id : qr === null ? null : `qr_${randomId()}`;
      if (typeof qr === "string") await client.query("INSERT INTO public.payment_qr_assets (id,data_url) VALUES ($1,$2)", [qrId, qr]);
      const columns = mutable.filter((key) => key in fields);
      const sets = columns.map((key, index) => `${key}=$${index + 2}`);
      const vals: unknown[] = [body.id, ...columns.map((key) => fields[key])];
      vals.push(qrId); sets.push(`qr_asset_id=$${vals.length}`); sets.push("updated_at=now()");
      const result = await client.query(`UPDATE public.payment_methods SET ${sets.join(",")} WHERE id=$1 RETURNING *`, vals); after = result.rows[0]; action = "edit";
    }
    await client.query("INSERT INTO public.payment_method_changes (method_id,method_label,action,changed_by,summary,before_state,after_state) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)", [body.id, after.label, action, currentActor(req), action === "toggle" ? (after.is_enabled ? "Enabled payment destination." : "Disabled payment destination.") : "Updated payment destination details.", JSON.stringify(snapshot(before)), JSON.stringify(snapshot(after))]);
    await client.query("COMMIT");
    return res.status(200).json({ method: after });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("payment_method_write_failed", error instanceof Error ? error.message : "unknown");
    return reject(res, 503, "Payment settings could not be saved.");
  } finally { client.release(); }
}

function randomId() { return randomBytes(12).toString("hex"); }
