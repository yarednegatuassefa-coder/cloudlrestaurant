import { pool, isAllowedOrigin, reject, validSession, type ApiReq, type ApiRes } from "../_server.js";
import { isValidPolygon } from "../delivery-geometry.mjs";
export default async function handler(req: ApiReq, res: ApiRes) {
  res.setHeader("Cache-Control","no-store"); res.setHeader("X-Content-Type-Options","nosniff");
  if (!validSession(req)) return reject(res,401,"Staff login required.");
  if (!process.env.DATABASE_URL) return reject(res,503,"Delivery zone service is not configured.");
  if (req.method === "GET") {
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
  if(!Number.isInteger(fee)||Number(fee)<0||Number(fee)>10000) return reject(res,400,"Delivery fee must be an integer from 0 to 10,000 ETB.");
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
