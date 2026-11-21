import { useEffect, useRef, useState } from "react";

type Point = [number, number];
type Zone = { id:string; name:string; polygon:Point[]; delivery_fee_etb:number; is_active:boolean; orders?:number; revenue_etb?:number };
type Cell = { latitude:number; longitude:number; orders:number; revenueEtb:number };
type RouteCell = { latitude:number; longitude:number; orders:number; distanceMeters:number; estimatedMinutes:number };
type RouteSummary = { pinnedOrders:number; ordersInsidePilot:number; sampledCells:number; routedCells:number; failedCells:number; sampledOrders:number; weightedAverageDistanceMeters:number; weightedAverageMinutes:number };
type MapApi = {
 map:(el:HTMLElement,options?:Record<string,unknown>)=>MapInstance;
 tileLayer:(url:string,options:Record<string,unknown>)=>{addTo:(map:MapInstance)=>void};
 polygon:(points:Point[],options:Record<string,unknown>)=>Layer;
 circleMarker:(point:Point,options:Record<string,unknown>)=>Layer;
};
type Layer = {addTo:(map:MapInstance)=>Layer;bindPopup:(text:string)=>Layer;remove:()=>void};
type MapInstance = {setView:(point:Point,zoom:number)=>MapInstance;on:(event:string,fn:(e:{latlng:{lat:number;lng:number}})=>void)=>MapInstance;remove:()=>void;invalidateSize:()=>void};
let leaflet:Promise<MapApi>|null=null;
const leafletApi=()=> (window as Window & {L?:MapApi}).L;
function loadMap():Promise<MapApi>{
 if(leafletApi())return Promise.resolve(leafletApi()!);
 if(!leaflet)leaflet=new Promise((resolve,reject)=>{
  const css=document.createElement("link");css.rel="stylesheet";css.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";if(!document.querySelector('link[href*="leaflet.css"]'))document.head.appendChild(css);
  const script=document.querySelector<HTMLScriptElement>('script[data-cloudl-leaflet="true"]')||document.createElement("script");
  if(!script.dataset.cloudlLeaflet){script.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";script.async=true;script.dataset.cloudlLeaflet="true";document.head.appendChild(script);}
  if(leafletApi()){resolve(leafletApi()!);return;}script.addEventListener("load",()=>leafletApi()?resolve(leafletApi()!):reject(new Error("Map unavailable")),{once:true});script.addEventListener("error",()=>reject(new Error("Map library could not load")),{once:true});
 });
 return leaflet;
}
const money=(n:number)=>Number(n||0).toLocaleString("en-US");
export default function StaffDeliveryIntelligence(){
 const mapEl=useRef<HTMLDivElement>(null);const mapRef=useRef<MapInstance|null>(null);const layers=useRef<Layer[]>([]);const geoJsonInput=useRef<HTMLInputElement>(null);
 const [zones,setZones]=useState<Zone[]>([]);const [cells,setCells]=useState<Cell[]>([]);const [days,setDays]=useState(30);
 const [name,setName]=useState("");const [fee,setFee]=useState("0");const [points,setPoints]=useState<Point[]>([]);const [editingId,setEditingId]=useState<string|null>(null);const [editingActive,setEditingActive]=useState(true);
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [notice,setNotice]=useState("");
 const [summary,setSummary]=useState({orders:0,revenue_etb:0,pinned_orders:0});
 const [routeCells,setRouteCells]=useState<RouteCell[]>([]);
 const [routeSummary,setRouteSummary]=useState<RouteSummary|null>(null);
 const [routeBusy,setRouteBusy]=useState(false);
 async function refresh(){
  const [z,a]=await Promise.all([fetch("/api/admin/delivery-zones",{credentials:"same-origin",cache:"no-store"}),fetch("/api/admin/delivery-zones?view=analytics&days="+days,{credentials:"same-origin",cache:"no-store"})]);
  const zd=await z.json();const ad=await a.json();if(!z.ok)throw new Error(zd.error||"Could not load zones.");if(!a.ok)throw new Error(ad.error||"Could not load analytics.");
  setZones(zd.zones||[]);setCells(ad.cells||[]);setSummary(ad.summary||{orders:0,revenue_etb:0,pinned_orders:0});
 }
 useEffect(()=>{let live=true;setRouteCells([]);setRouteSummary(null);refresh().catch(e=>{if(live)setError(e instanceof Error?e.message:"Could not load delivery intelligence.");});return()=>{live=false;};},[days]);
 useEffect(()=>{
  let active=true;let map:MapInstance|null=null;
  loadMap().then(L=>{if(!active||!mapEl.current)return;map=L.map(mapEl.current).setView([9.0324,38.7745],13);L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);mapRef.current=map;
   map.on("click",e=>setPoints(p=>p.length<100?[...p,[e.latlng.lat,e.latlng.lng]]:p));window.setTimeout(()=>map?.invalidateSize(),0);
  }).catch(e=>{if(active)setError(e instanceof Error?e.message:"Map unavailable.");});
  return()=>{active=false;map?.remove();mapRef.current=null;};
 },[]);
 useEffect(()=>{
  const L=leafletApi(),map=mapRef.current;if(!L||!map)return;layers.current.forEach(x=>x.remove());layers.current=[];
  zones.forEach(z=>{const l=L.polygon(z.polygon,{color:z.is_active?"#a45d3c":"#999",weight:2,fillOpacity:.12}).addTo(map).bindPopup(z.name+" · "+money(z.delivery_fee_etb)+" ETB");layers.current.push(l);});
  cells.forEach(c=>{const l=L.circleMarker([c.latitude,c.longitude],{radius:Math.min(22,6+c.orders*1.4),color:"#9b432e",fillColor:"#c66d45",fillOpacity:.42,weight:1}).addTo(map).bindPopup(c.orders+" orders · "+money(c.revenueEtb)+" ETB");layers.current.push(l);});
  routeCells.forEach(cell=>{
   const color=cell.distanceMeters<=3000?"#287b57":cell.distanceMeters<=6000?"#c17b32":"#b34436";
   const l=L.circleMarker([cell.latitude,cell.longitude],{radius:Math.min(18,7+cell.orders),color,fillColor:color,fillOpacity:.68,weight:2}).addTo(map)
    .bindPopup(cell.orders+" orders · "+(cell.distanceMeters/1000).toFixed(1)+" km road distance · "+cell.estimatedMinutes+" min baseline");
   layers.current.push(l);
  });
  if(points.length>=2){const l=L.polygon(points,{color:"#236b91",dashArray:"5 5",fillOpacity:.08}).addTo(map);layers.current.push(l);}
 },[zones,cells,routeCells,points]);
 async function analyzeRouteCoverage(){
  setRouteBusy(true);setError("");setNotice("");
  try{
   const response=await fetch("/api/admin/delivery-route-analytics?days="+days,{credentials:"same-origin",cache:"no-store"});
   const data=await response.json() as {cells?:RouteCell[];summary?:RouteSummary;disclaimer?:string;error?:string};
   if(!response.ok)throw new Error(data.error||"Route coverage analysis failed.");
   setRouteCells(data.cells||[]);setRouteSummary(data.summary||null);
   setNotice(data.summary?.routedCells ? "Route coverage sample calculated. Coloured map markers show road distance from Cloud L to each busy customer cluster." : "No routeable clusters with at least two pinned orders were found in this period and pilot area.");
  }catch(e){setError(e instanceof Error?e.message:"Route coverage analysis failed.");}
  finally{setRouteBusy(false);}
 }
 async function exportGeoJson(){
  setBusy(true);setError("");setNotice("");
  try{const response=await fetch("/api/admin/delivery-zones?format=geojson",{credentials:"same-origin",cache:"no-store"});if(!response.ok){const data=await response.json();throw new Error(data.error||"Could not export territories.");}const data=await response.json();const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/geo+json"});const url=URL.createObjectURL(blob);const anchor=document.createElement("a");anchor.href=url;anchor.download="cloudl-delivery-territories.geojson";document.body.appendChild(anchor);anchor.click();anchor.remove();URL.revokeObjectURL(url);setNotice("GeoJSON export downloaded. Open it in RustGIS to inspect or edit the territory boundaries.");}
  catch(e){setError(e instanceof Error?e.message:"Could not export GeoJSON.");}finally{setBusy(false);}
 }
 async function importGeoJson(file?:File){
  if(!file)return;
  setBusy(true);setError("");setNotice("");
  try{if(file.size>2_000_000)throw new Error("GeoJSON file must be smaller than 2 MB.");const geojson=JSON.parse(await file.text()) as unknown;if(!geojson||typeof geojson!=="object"||(geojson as {type?:unknown}).type!=="FeatureCollection")throw new Error("Select a GeoJSON FeatureCollection exported from RustGIS.");const response=await fetch("/api/admin/delivery-zones",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"import_geojson",geojson})});const data=await response.json() as {imported?:number;error?:string};if(!response.ok)throw new Error(data.error||"Could not import GeoJSON.");setNotice(`${data.imported||0} territories imported. Review each boundary and fee before activating it for customer orders.`);await refresh();}
  catch(e){setError(e instanceof Error?e.message:"Could not import GeoJSON.");}finally{setBusy(false);if(geoJsonInput.current)geoJsonInput.current.value="";}
 }
 async function save(){
  setBusy(true);setError("");setNotice("");
  try{const response=await fetch("/api/admin/delivery-zones",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"save",id:editingId||undefined,name,deliveryFeeEtb:Number(fee),polygon:points,isActive:editingId?editingActive:true})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Zone could not be saved.");setName("");setFee("0");setPoints([]);setEditingId(null);setEditingActive(true);setNotice("Delivery territory saved. Pinned customer orders inside this active zone will receive its fee.");await refresh();}
  catch(e){setError(e instanceof Error?e.message:"Could not save zone.");}finally{setBusy(false);}
 }
 function edit(zone:Zone){setEditingId(zone.id);setEditingActive(zone.is_active);setName(zone.name);setFee(String(zone.delivery_fee_etb));setPoints(zone.polygon);setNotice("Editing "+zone.name+". Adjust the boundary by clearing and redrawing it, or change its name and fee.");mapRef.current?.setView(zone.polygon[0],15);}
 async function toggle(zone:Zone){
  setBusy(true);try{const response=await fetch("/api/admin/delivery-zones",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"save",id:zone.id,name:zone.name,deliveryFeeEtb:Number(zone.delivery_fee_etb),polygon:zone.polygon,isActive:!zone.is_active})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Zone could not be updated.");await refresh();}catch(e){setError(e instanceof Error?e.message:"Could not update zone.");}finally{setBusy(false);}
 }
 async function remove(zone:Zone){
  if(!window.confirm("Delete "+zone.name+"? Existing orders keep their saved fee, but future orders cannot match this territory."))return;
  setBusy(true);try{const response=await fetch("/api/admin/delivery-zones",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"delete",id:zone.id})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Zone could not be deleted.");await refresh();}catch(e){setError(e instanceof Error?e.message:"Could not delete zone.");}finally{setBusy(false);}
 }
 return <section className="delivery-intelligence">
  <div className="delivery-intelligence__intro"><div><h2>Delivery territories & demand</h2><p>Draw zones around Cloud L's service areas. New customer pins inside active zones are matched automatically.</p></div><select aria-label="Analytics period" value={days} onChange={e=>setDays(Number(e.currentTarget.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select></div>
  <div className="delivery-intelligence__gis-tools">
   <div><strong>RustGIS data exchange</strong><p>Export your current territories to edit in RustGIS, then import a validated GeoJSON FeatureCollection. Imports create new territories; they never overwrite existing zones.</p></div>
   <div className="delivery-intelligence__actions"><button type="button" disabled={busy} onClick={()=>void exportGeoJson()}>Export GeoJSON</button><button type="button" disabled={busy} onClick={()=>geoJsonInput.current?.click()}>Import from RustGIS</button><input ref={geoJsonInput} type="file" accept=".geojson,.json,application/geo+json,application/json" hidden onChange={event=>void importGeoJson(event.currentTarget.files?.[0])}/></div>
  </div>
  <div className="delivery-intelligence__stats"><article><small>Delivery orders</small><strong>{money(summary.orders)}</strong></article><article><small>Delivery revenue</small><strong>{money(summary.revenue_etb)} ETB</strong></article><article><small>Orders with pins</small><strong>{money(summary.pinned_orders)}</strong></article></div>
  <div className="delivery-intelligence__gis-tools">
   <div><strong>Road-distance territory analysis</strong><p>Calculate road distance from Cloud L to the busiest customer clusters in the selected period. Results are aggregated and advisory; they do not change delivery fees or territories.</p></div>
   <div className="delivery-intelligence__actions"><button type="button" disabled={routeBusy||busy} onClick={()=>void analyzeRouteCoverage()}>{routeBusy?"Calculating routes…":"Run route coverage analysis"}</button></div>
  </div>
  {routeSummary&&<div className="delivery-intelligence__stats">
   <article><small>Orders represented</small><strong>{money(routeSummary.sampledOrders)}</strong></article>
   <article><small>Weighted average road distance</small><strong>{(routeSummary.weightedAverageDistanceMeters/1000).toFixed(1)} km</strong></article>
   <article><small>Weighted baseline drive time</small><strong>{routeSummary.weightedAverageMinutes} min</strong></article>
  </div>}
  {routeSummary&&<div className="delivery-intelligence__route-results">
   <div><strong>Busy customer clusters</strong><small>{routeSummary.routedCells} of {routeSummary.sampledCells} sampled clusters routed · maximum {12} clusters</small></div>
   {routeCells.length>0&&<ol>{routeCells.slice().sort((a,b)=>b.orders-a.orders).map((cell,index)=><li key={cell.latitude.toFixed(4)+"-"+cell.longitude.toFixed(4)}><span>Cluster {index+1} · {cell.orders} orders</span><strong>{(cell.distanceMeters/1000).toFixed(1)} km · {cell.estimatedMinutes} min</strong></li>)}</ol>}
   <p>Clusters are approximately 1.1 km grid cells. Road distance is calculated to each cell's centre. The sample prioritizes the busiest clusters and is not a complete route for every order.</p>
  </div>}
  <div className="delivery-intelligence__map" ref={mapEl} aria-label="Map for drawing delivery territories and viewing aggregated order heatmap"/>
  <div className="delivery-intelligence__legend"><span><i className="zone-dot"/>Territories</span><span><i className="heat-dot"/>Aggregated order density</span><span><i className="draw-dot"/>New territory draft</span>{routeCells.length>0&&<span>Road distance: green ≤3 km · amber 3–6 km · red &gt;6 km</span>}</div>
  <div className="delivery-intelligence__editor"><h3>{editingId?"Edit delivery territory":"Create a delivery territory"}</h3><p>Click at least three points on the map to outline the delivery boundary. The polygon closes automatically.</p>
   <div className="delivery-intelligence__fields"><label>Territory name<input value={name} maxLength={80} onChange={e=>setName(e.currentTarget.value)} placeholder="e.g. Kebena Zone"/></label><label>Delivery fee (ETB)<input type="number" min="0" max="10000" step="1" value={fee} onChange={e=>setFee(e.currentTarget.value)}/></label></div>
   <div className="delivery-intelligence__actions"><button type="button" onClick={()=>setPoints(p=>p.slice(0,-1))} disabled={!points.length}>Undo point</button><button type="button" onClick={()=>setPoints([])} disabled={!points.length}>Clear drawing</button>{editingId&&<button type="button" onClick={()=>{setEditingId(null);setEditingActive(true);setName("");setFee("0");setPoints([]);}}>Cancel edit</button>}<button type="button" className="is-primary" onClick={()=>void save()} disabled={busy||name.trim().length<2||points.length<3||!Number.isInteger(Number(fee))||Number(fee)<0||Number(fee)>10000}>{editingId?"Update territory":"Save territory"}</button></div>
   <small>{points.length} boundary points selected. The first and last points are joined when saved.</small>
  </div>
  <div className="delivery-intelligence__zones"><h3>Configured territories</h3>{zones.length===0?<p>No delivery territories yet. Draw your first territory above. Until then, staff can continue manually confirming coverage and fees.</p>:zones.map(z=><article key={z.id}><div><strong>{z.name}</strong><small>{money(z.delivery_fee_etb)} ETB · {z.is_active?"Active":"Inactive"} · {z.orders||0} orders · {money(z.revenue_etb||0)} ETB</small></div><button type="button" disabled={busy} onClick={()=>edit(z)}>Edit</button><button type="button" disabled={busy} onClick={()=>void toggle(z)}>{z.is_active?"Pause":"Activate"}</button><button type="button" disabled={busy} onClick={()=>void remove(z)}>Delete</button></article>)}</div>
  {notice&&<p className="delivery-intelligence__notice" role="status">{notice}</p>}{error&&<p className="checkout-error" role="alert">{error}</p>}
  <p className="delivery-intelligence__privacy">Heatmap and route-analysis cells are aggregated geographic groups and only displayed when at least two orders fall in a cell. Route analysis samples up to 12 busiest clusters inside the Addis pilot bounds. Distances use a car profile without live traffic or motorcycle adjustment; do not treat them as courier ETAs or automatic pricing recommendations. Individual customer coordinates remain visible only to authenticated staff for order fulfilment.</p>
 </section>;
}
