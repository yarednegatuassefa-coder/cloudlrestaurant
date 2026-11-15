import { useEffect, useRef, useState } from "react";

type Point = [number, number];
type Zone = { id:string; name:string; polygon:Point[]; delivery_fee_etb:number; is_active:boolean; orders?:number; revenue_etb?:number };
type Cell = { latitude:number; longitude:number; orders:number; revenueEtb:number };
type MapApi = {
 map:(el:HTMLElement,options?:Record<string,unknown>)=>MapInstance;
 tileLayer:(url:string,options:Record<string,unknown>)=>{addTo:(map:MapInstance)=>void};
 polygon:(points:Point[],options:Record<string,unknown>)=>Layer;
 circleMarker:(point:Point,options:Record<string,unknown>)=>Layer;
};
type Layer = {addTo:(map:MapInstance)=>Layer;bindPopup:(text:string)=>Layer;remove:()=>void};
type MapInstance = {setView:(point:Point,zoom:number)=>MapInstance;on:(event:string,fn:(e:{latlng:{lat:number;lng:number}})=>void)=>MapInstance;remove:()=>void;invalidateSize:()=>void};
declare global { interface Window { L?:MapApi } }
let leaflet:Promise<MapApi>|null=null;
function loadMap():Promise<MapApi>{
 if(window.L)return Promise.resolve(window.L);
 if(!leaflet)leaflet=new Promise((resolve,reject)=>{
  const css=document.createElement("link");css.rel="stylesheet";css.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";if(!document.querySelector('link[href*="leaflet.css"]'))document.head.appendChild(css);
  const script=document.querySelector<HTMLScriptElement>('script[data-cloudl-leaflet="true"]')||document.createElement("script");
  if(!script.dataset.cloudlLeaflet){script.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";script.async=true;script.dataset.cloudlLeaflet="true";document.head.appendChild(script);}
  if(window.L){resolve(window.L);return;}script.addEventListener("load",()=>window.L?resolve(window.L):reject(new Error("Map unavailable")),{once:true});script.addEventListener("error",()=>reject(new Error("Map library could not load")),{once:true});
 });
 return leaflet;
}
const money=(n:number)=>Number(n||0).toLocaleString("en-US");
export default function StaffDeliveryIntelligence(){
 const mapEl=useRef<HTMLDivElement>(null);const mapRef=useRef<MapInstance|null>(null);const layers=useRef<Layer[]>([]);
 const [zones,setZones]=useState<Zone[]>([]);const [cells,setCells]=useState<Cell[]>([]);const [days,setDays]=useState(30);
 const [name,setName]=useState("");const [fee,setFee]=useState("0");const [points,setPoints]=useState<Point[]>([]);const [editingId,setEditingId]=useState<string|null>(null);
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [notice,setNotice]=useState("");
 const [summary,setSummary]=useState({orders:0,revenue_etb:0,pinned_orders:0});
 async function refresh(){
  const [z,a]=await Promise.all([fetch("/api/admin/delivery-zones",{credentials:"same-origin",cache:"no-store"}),fetch("/api/admin/delivery-analytics?days="+days,{credentials:"same-origin",cache:"no-store"})]);
  const zd=await z.json();const ad=await a.json();if(!z.ok)throw new Error(zd.error||"Could not load zones.");if(!a.ok)throw new Error(ad.error||"Could not load analytics.");
  setZones(zd.zones||[]);setCells(ad.cells||[]);setSummary(ad.summary||{orders:0,revenue_etb:0,pinned_orders:0});
 }
 useEffect(()=>{let live=true;refresh().catch(e=>{if(live)setError(e instanceof Error?e.message:"Could not load delivery intelligence.");});return()=>{live=false;};},[days]);
 useEffect(()=>{
  let active=true;let map:MapInstance|null=null;
  loadMap().then(L=>{if(!active||!mapEl.current)return;map=L.map(mapEl.current).setView([9.04,38.76],13);L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);mapRef.current=map;
   map.on("click",e=>setPoints(p=>p.length<100?[...p,[e.latlng.lat,e.latlng.lng]]:p));window.setTimeout(()=>map?.invalidateSize(),0);
  }).catch(e=>{if(active)setError(e instanceof Error?e.message:"Map unavailable.");});
  return()=>{active=false;map?.remove();mapRef.current=null;};
 },[]);
 useEffect(()=>{
  const L=window.L,map=mapRef.current;if(!L||!map)return;layers.current.forEach(x=>x.remove());layers.current=[];
  zones.forEach(z=>{const l=L.polygon(z.polygon,{color:z.is_active?"#a45d3c":"#999",weight:2,fillOpacity:.12}).addTo(map).bindPopup(z.name+" · "+money(z.delivery_fee_etb)+" ETB");layers.current.push(l);});
  cells.forEach(c=>{const l=L.circleMarker([c.latitude,c.longitude],{radius:Math.min(22,6+c.orders*1.4),color:"#9b432e",fillColor:"#c66d45",fillOpacity:.42,weight:1}).addTo(map).bindPopup(c.orders+" orders · "+money(c.revenueEtb)+" ETB");layers.current.push(l);});
  if(points.length>=2){const l=L.polygon(points,{color:"#236b91",dashArray:"5 5",fillOpacity:.08}).addTo(map);layers.current.push(l);}
 },[zones,cells,points]);
 async function save(){
  setBusy(true);setError("");setNotice("");
  try{const response=await fetch("/api/admin/delivery-zones",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"save",id:editingId||undefined,name,deliveryFeeEtb:Number(fee),polygon:points,isActive:true})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Zone could not be saved.");setName("");setFee("0");setPoints([]);setEditingId(null);setNotice("Delivery territory saved. Pinned customer orders inside this active zone will receive its fee.");await refresh();}
  catch(e){setError(e instanceof Error?e.message:"Could not save zone.");}finally{setBusy(false);}
 }
 function edit(zone:Zone){setEditingId(zone.id);setName(zone.name);setFee(String(zone.delivery_fee_etb));setPoints(zone.polygon);setNotice("Editing "+zone.name+". Adjust the boundary by clearing and redrawing it, or change its name and fee.");mapRef.current?.setView(zone.polygon[0],15);}
 async function toggle(zone:Zone){
  setBusy(true);try{const response=await fetch("/api/admin/delivery-zones",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"save",id:zone.id,name:zone.name,deliveryFeeEtb:Number(zone.delivery_fee_etb),polygon:zone.polygon,isActive:!zone.is_active})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Zone could not be updated.");await refresh();}catch(e){setError(e instanceof Error?e.message:"Could not update zone.");}finally{setBusy(false);}
 }
 async function remove(zone:Zone){
  if(!window.confirm("Delete "+zone.name+"? Existing orders keep their saved fee, but future orders cannot match this territory."))return;
  setBusy(true);try{const response=await fetch("/api/admin/delivery-zones",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"delete",id:zone.id})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Zone could not be deleted.");await refresh();}catch(e){setError(e instanceof Error?e.message:"Could not delete zone.");}finally{setBusy(false);}
 }
 return <section className="delivery-intelligence">
  <div className="delivery-intelligence__intro"><div><h2>Delivery territories & demand</h2><p>Draw zones around Cloud L's service areas. New customer pins inside active zones are matched automatically.</p></div><select aria-label="Analytics period" value={days} onChange={e=>setDays(Number(e.currentTarget.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select></div>
  <div className="delivery-intelligence__stats"><article><small>Delivery orders</small><strong>{money(summary.orders)}</strong></article><article><small>Delivery revenue</small><strong>{money(summary.revenue_etb)} ETB</strong></article><article><small>Orders with pins</small><strong>{money(summary.pinned_orders)}</strong></article></div>
  <div className="delivery-intelligence__map" ref={mapEl} aria-label="Map for drawing delivery territories and viewing aggregated order heatmap"/>
  <div className="delivery-intelligence__legend"><span><i className="zone-dot"/>Territories</span><span><i className="heat-dot"/>Aggregated order density</span><span><i className="draw-dot"/>New territory draft</span></div>
  <div className="delivery-intelligence__editor"><h3>{editingId?"Edit delivery territory":"Create a delivery territory"}</h3><p>Click at least three points on the map to outline the delivery boundary. The polygon closes automatically.</p>
   <div className="delivery-intelligence__fields"><label>Territory name<input value={name} maxLength={80} onChange={e=>setName(e.currentTarget.value)} placeholder="e.g. Kebena Zone"/></label><label>Delivery fee (ETB)<input type="number" min="0" max="10000" step="1" value={fee} onChange={e=>setFee(e.currentTarget.value)}/></label></div>
   <div className="delivery-intelligence__actions"><button type="button" onClick={()=>setPoints(p=>p.slice(0,-1))} disabled={!points.length}>Undo point</button><button type="button" onClick={()=>setPoints([])} disabled={!points.length}>Clear drawing</button>{editingId&&<button type="button" onClick={()=>{setEditingId(null);setName("");setFee("0");setPoints([]);}}>Cancel edit</button>}<button type="button" className="is-primary" onClick={()=>void save()} disabled={busy||name.trim().length<2||points.length<3||!Number.isInteger(Number(fee))||Number(fee)<0||Number(fee)>10000}>{editingId?"Update territory":"Save territory"}</button></div>
   <small>{points.length} boundary points selected. The first and last points are joined when saved.</small>
  </div>
  <div className="delivery-intelligence__zones"><h3>Configured territories</h3>{zones.length===0?<p>No delivery territories yet. Draw your first territory above. Until then, staff can continue manually confirming coverage and fees.</p>:zones.map(z=><article key={z.id}><div><strong>{z.name}</strong><small>{money(z.delivery_fee_etb)} ETB · {z.is_active?"Active":"Inactive"} · {z.orders||0} orders · {money(z.revenue_etb||0)} ETB</small></div><button type="button" disabled={busy} onClick={()=>edit(z)}>Edit</button><button type="button" disabled={busy} onClick={()=>void toggle(z)}>{z.is_active?"Pause":"Activate"}</button><button type="button" disabled={busy} onClick={()=>void remove(z)}>Delete</button></article>)}</div>
  {notice&&<p className="delivery-intelligence__notice" role="status">{notice}</p>}{error&&<p className="checkout-error" role="alert">{error}</p>}
  <p className="delivery-intelligence__privacy">Heatmap cells are aggregated geographic groups and only displayed when at least two orders fall in a cell. Individual customer coordinates remain visible only to authenticated staff for order fulfilment.</p>
 </section>;
}
