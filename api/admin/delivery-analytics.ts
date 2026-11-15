import { pool, reject, validSession, type ApiReq, type ApiRes } from "../_server.js";
export default async function handler(req:ApiReq,res:ApiRes){
  res.setHeader("Cache-Control","no-store");res.setHeader("X-Content-Type-Options","nosniff");
  if(req.method!=="GET"){res.setHeader("Allow","GET");return reject(res,405,"Use GET.");}
  if(!validSession(req))return reject(res,401,"Staff login required.");
  const raw=Array.isArray(req.query?.days)?req.query?.days[0]:req.query?.days;
  const days=raw==="7"?7:raw==="90"?90:30;
  try{
    const [cells,zones,summary]=await Promise.all([
      pool.query(`SELECT floor(delivery_latitude*100)::int AS lat_cell,floor(delivery_longitude*100)::int AS lng_cell,count(*)::int AS orders,coalesce(sum(total_etb),0)::int AS revenue_etb FROM public.orders WHERE fulfillment='delivery' AND delivery_latitude IS NOT NULL AND created_at>=now()-($1::text||' days')::interval AND status NOT IN ('declined','cancelled') GROUP BY 1,2 HAVING count(*)>=2 ORDER BY orders DESC LIMIT 250`,[days]),
      pool.query(`SELECT z.id,z.name,z.delivery_fee_etb,z.is_active,count(o.id)::int AS orders,coalesce(sum(o.total_etb),0)::int AS revenue_etb FROM public.delivery_zones z LEFT JOIN public.orders o ON o.delivery_zone_id=z.id AND o.created_at>=now()-($1::text||' days')::interval AND o.status NOT IN ('declined','cancelled') GROUP BY z.id ORDER BY z.name`,[days]),
      pool.query(`SELECT count(*)::int AS orders,coalesce(sum(total_etb),0)::int AS revenue_etb,count(*) FILTER(WHERE delivery_latitude IS NOT NULL)::int AS pinned_orders FROM public.orders WHERE fulfillment='delivery' AND created_at>=now()-($1::text||' days')::interval AND status NOT IN ('declined','cancelled')`,[days])
    ]);
    return res.status(200).json({days,cells:cells.rows.map(r=>({latitude:Number(r.lat_cell)/100+0.005,longitude:Number(r.lng_cell)/100+0.005,orders:r.orders,revenueEtb:r.revenue_etb})),zones:zones.rows,summary:summary.rows[0]});
  }catch(error){console.error("delivery_analytics_failed",error instanceof Error?error.message:"unknown");return reject(res,503,"Delivery analytics are temporarily unavailable.");}
}
