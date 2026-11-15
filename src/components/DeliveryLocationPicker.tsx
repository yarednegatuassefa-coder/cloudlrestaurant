import { useEffect, useRef, useState } from "react";

type Coordinates = { latitude: number; longitude: number };
type Props = { value: Coordinates | null; onChange: (value: Coordinates | null) => void };

type LeafletPoint = { lat: number; lng: number };
type LeafletMap = {
  setView: (point: [number, number], zoom: number) => LeafletMap;
  on: (event: string, callback: (event: { latlng: LeafletPoint }) => void) => LeafletMap;
  remove: () => void;
  invalidateSize: () => void;
};
type LeafletMarker = {
  addTo: (map: LeafletMap) => LeafletMarker;
  setLatLng: (point: [number, number]) => LeafletMarker;
  getLatLng: () => LeafletPoint;
  on: (event: string, callback: () => void) => LeafletMarker;
};
type LeafletStatic = {
  map: (element: HTMLElement, options?: Record<string, unknown>) => LeafletMap;
  tileLayer: (url: string, options: Record<string, unknown>) => { addTo: (map: LeafletMap) => void };
  marker: (point: [number, number], options: Record<string, unknown>) => LeafletMarker;
};

declare global { interface Window { L?: LeafletStatic } }

let leafletPromise: Promise<LeafletStatic> | null = null;
function loadLeaflet(): Promise<LeafletStatic> {
  if (window.L) return Promise.resolve(window.L);
  if (!leafletPromise) {
    leafletPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-cloudl-leaflet="true"]');
      const finish = () => window.L ? resolve(window.L) : reject(new Error("The map library could not be loaded."));
      if (existing) { existing.addEventListener("load", finish, { once: true }); existing.addEventListener("error", () => reject(new Error("The map library could not be loaded.")), { once: true }); return; }
      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(stylesheet);
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.dataset.cloudlLeaflet = "true";
      script.onload = finish;
      script.onerror = () => reject(new Error("The map library could not be loaded."));
      document.head.appendChild(script);
    });
  }
  return leafletPromise;
}

const DEFAULT_CENTER: [number, number] = [9.04, 38.76];

export default function DeliveryLocationPicker({ value, onChange }: Props) {
  const elementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const onChangeRef = useRef(onChange);
  const [mapError, setMapError] = useState("");

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    let active = true;
    let map: LeafletMap | null = null;
    loadLeaflet().then((L) => {
      if (!active || !elementRef.current) return;
      map = L.map(elementRef.current, { scrollWheelZoom: false }).setView(value ? [value.latitude, value.longitude] : DEFAULT_CENTER, value ? 16 : 14);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      mapRef.current = map;
      const placeMarker = (point: [number, number]) => {
        if (!markerRef.current) {
          markerRef.current = L.marker(point, { draggable: true }).addTo(map!);
          markerRef.current.on("dragend", () => {
            const selected = markerRef.current?.getLatLng();
            if (selected) onChangeRef.current({ latitude: Number(selected.lat.toFixed(6)), longitude: Number(selected.lng.toFixed(6)) });
          });
        } else markerRef.current.setLatLng(point);
        onChangeRef.current({ latitude: Number(point[0].toFixed(6)), longitude: Number(point[1].toFixed(6)) });
      };
      if (value) placeMarker([value.latitude, value.longitude]);
      map.on("click", (event) => placeMarker([event.latlng.lat, event.latlng.lng]));
      window.setTimeout(() => map?.invalidateSize(), 0);
    }).catch((error: unknown) => {
      if (active) setMapError(error instanceof Error ? error.message : "Map unavailable. You can continue with the written address.");
    });
    return () => { active = false; map?.remove(); mapRef.current = null; markerRef.current = null; };
  }, []);

  function useCurrentLocation() {
    if (!navigator.geolocation) { setMapError("Location is not supported by this browser. You can select a point on the map or enter your address."); return; }
    setMapError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point: [number, number] = [position.coords.latitude, position.coords.longitude];
        mapRef.current?.setView(point, 17);
        if (window.L && mapRef.current) {
          if (!markerRef.current) markerRef.current = window.L.marker(point, { draggable: true }).addTo(mapRef.current);
          else markerRef.current.setLatLng(point);
          markerRef.current.on("dragend", () => {
            const selected = markerRef.current?.getLatLng();
            if (selected) onChange({ latitude: Number(selected.lat.toFixed(6)), longitude: Number(selected.lng.toFixed(6)) });
          });
        }
        onChange({ latitude: Number(point[0].toFixed(6)), longitude: Number(point[1].toFixed(6)) });
      },
      () => setMapError("We couldn't access your location. Select a point on the map or enter your address manually."),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  return <section className="delivery-location-picker" aria-label="Choose delivery location">
    <div className="delivery-location-picker__heading">
      <div><strong>Pin your delivery location (optional)</strong><small>Tap the map to place a pin, then drag it to the exact entrance or building.</small></div>
      <button type="button" onClick={useCurrentLocation}>Use my location</button>
    </div>
    <div ref={elementRef} className="delivery-location-picker__map" role="application" aria-label="OpenStreetMap. Tap to place your delivery pin." />
    {value ? <div className="delivery-location-picker__selected"><span>Location selected</span><code>{value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}</code><button type="button" onClick={() => onChange(null)}>Remove pin</button></div> : <p className="delivery-location-picker__hint">No pin selected. Your written address and landmark will still be used.</p>}
    {mapError && <p className="delivery-location-picker__error" role="status">{mapError}</p>}
    <small className="delivery-location-picker__privacy">Map tiles are provided by OpenStreetMap. Selecting a pin saves its coordinates with your order so staff can confirm delivery coverage. Location access is only requested if you press “Use my location”.</small>
  </section>;
}
