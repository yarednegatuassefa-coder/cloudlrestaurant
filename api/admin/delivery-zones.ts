import { pool, isAllowedOrigin, reject, validSession, type ApiReq, type ApiRes } from "../_server.js";
import { isValidPolygon } from "../delivery-geometry.mjs";
export default async function handler(req: ApiReq, res: ApiRes) {
  res.setHeader("Cache-Control","no-store"); res.setHeader("X-Content-Type-Options","nosniff");
  if (!validSession(req)) return reject(res,401,"Staff login required.");
  if (!process.env.DATABASE_URL) return reject(res,503,"Delivery zone service is not configured.");
  if (req.method === "GET") {
    if (req.query?.view === "analytics") {
      const raw = Array.isArray(req.query?.days) ? req.query.days[0] : req.query?.days;
      const days = raw === "7" ? 7 : raw === "90" ? 90 : 30;
      try {
        const [cells, zoneStats, summary] = await Promise.all([
          pool.query(`SELECT floor(delivery_latitude*100)::int AS lat_cell,floor(delivery_longitude*100)::int AS lng_cell,count(*)::int AS orders,coalesce(sum(total_etb),0)::int AS revenue_etb FROM public.orders WHERE fulfillment='delivery' AND delivery_latitude IS NOT NULL AND created_at>=now()-($1::text||' days')::interval AND status NOT IN ('declined','cancelled') GROUP BY 1,2 HAVING count(*)>=2 ORDER BY orders DESC LIMIT 250`, [days]),
          pool.query(`SELECT z.id,z.name,z.delivery_fee_etb,z.is_active,count(o.id)::int AS orders,coalesce(sum(o.total_etb),0)::int AS revenue_etb FROM public.delivery_zones z LEFT JOIN public.orders o ON o.delivery_zone_id=z.id AND o.created_at>=now()-($1::text||' days')::interval AND o.status NOT IN ('declined','cancelled') GROUP BY z.id ORDER BY z.name`, [days]),
          pool.query(`SELECT count(*)::int AS orders,coalesce(sum(total_etb),0)::int AS revenue_etb,count(*) FILTER(WHERE delivery_latitude IS NOT NULL)::int AS pinned_orders FROM public.orders WHERE fulfillment='delivery' AND created_at>=now()-($1::text||' days')::interval AND status NOT IN ('declined','cancelled')`, [days])
        ]);
        return res.status(200).json({days,cells:cells.rows.map(r=>({latitude:Number(r.lat_cell)/100+0.005,longitude:Number(r.lng_cell)/100+0.005,orders:r.orders,revenueEtb:r.revenue_etb})),zones:zoneStats.rows,summary:summary.rows[0]});
      } catch(error) { console.error("delivery_analytics_failed",error instanceof Error?error.message:"unknown"); return reject(res,503,"Delivery analytics are temporarily unavailable."); }
    }
    try { const result=await pool.query("SELECT id,name,polygon,delivery_fee_etb,is_active,created_at,updated_at FROM public.delivery_zones ORDER BY name"); return res.status(200).json({zones:result.rows}); }
    catch(error){console.error("delivery_zones_read_failed",error instanceof Error?error.message:"unknown");return reject(res,503,"Delivery zones are temporarily unavailable.");}
  }
  if (req.method !== "POST") {res.setHeader("Allow","GET, POST");return reject(res,405,"Use GET or POST.");}
  if (!isAllowedOrigin(req)) return reject(res,403,"This request is not allowed.");
  const body=req.body&&typeof req.body==="object"?req.body as Record<string,unknown>:{};
  const action=body.action;
  if(action==="delete"){
    const id=typeof body.id==="string"?body.id:"";
    if(!/^[0-9a-f-]{36}$/i.test(id)) return reject(res,400,"Zone ID is invalid.");
    try {const result=await pool.query("DELETE FROM public.delivery_zones WHERE id=$1 RETURNING id",[id]);return result.rowCount?res.status(200).json({deleted:true}):reject(res,404,"Delivery zone not found.");}
    catch(error){console.error("delivery_zone_delete_failed",error instanceof Error?error.message:"unknown");return reject(res,503,"The delivery zone could not be deleted.");}
  }
  if(action!=="save") return reject(res,400,"Choose save or delete.");
  const name=typeof body.name==="string"?body.name.trim():"";
  const fee=body.deliveryFeeEtb;
  const polygon=body.polygon;
  const active=body.isActive!==false;
  const id=typeof body.id==="string"?body.id:null;
  if(name.length<2||name.length>80) return reject(res,400,"Zone name must be 2–80 characters.");
  if(!Number.isInteger(Number(fee))||Number(fee)<0||Number(fee)>10000) return reject(res,400,"Delivery fee must be an integer from 0 to 10,000 ETB.");
  if(!isValidPolygon(polygon)) return reject(res,400,"Draw a valid territory with 3–100 map points.");
  if(id&&!/^[0-9a-f-]{36}$/i.test(id)) return reject(res,400,"Zone ID is invalid.");
  try {
    const result=id
      ? await pool.query("UPDATE public.delivery_zones SET name=$2,polygon=$3::jsonb,delivery_fee_etb=$4,is_active=$5,updated_at=now() WHERE id=$1 RETURNING id,name,polygon,delivery_fee_etb,is_active",[id,name,JSON.stringify(polygon),fee,active])
      : await pool.query("INSERT INTO public.delivery_zones(name,polygon,delivery_fee_etb,is_active) VALUES($1,$2::jsonb,$3,$4) RETURNING id,name,polygon,delivery_fee_etb,is_active",[name,JSON.stringify(polygon),fee,active]);
    if(id&&!result.rowCount) return reject(res,404,"Delivery zone not found.");
    return res.status(id?200:201).json({zone:result.rows[0]});
  } catch(error) { if((error as {code?:string}).code==="23505") return reject(res,409,"A delivery zone already uses that name."); console.error("delivery_zone_save_failed",error instanceof Error?error.message:"unknown");return reject(res,503,"The delivery zone could not be saved.");}
}
