import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import icon2x from 'leaflet/dist/images/marker-icon-2x.png';
import shadow from 'leaflet/dist/images/marker-shadow.png';

const pin = L.icon({ iconUrl: icon, iconRetinaUrl: icon2x, shadowUrl: shadow, iconSize: [25, 41], iconAnchor: [12, 41] });

function Clicker({ onChange }) {
  useMapEvents({ click: (e) => onChange({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

function Follow({ value }) {
  const map = useMap();
  useEffect(() => {
    if (value && !map.getBounds().contains([value.lat, value.lng])) map.flyTo([value.lat, value.lng], 15);
  }, [value, map]);
  return null;
}

export default function MapPicker({ value, onChange, center = [20.5937, 78.9629], zoom = 5 }) {
  const locate = () =>
    navigator.geolocation?.getCurrentPosition(
      (p) => onChange({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => alert('Could not get your location. Click on the map instead.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );

  return (
    <div className="space-y-2">
      <button type="button" onClick={locate} className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100">
        📍 Use my current location
      </button>
      <MapContainer center={value ? [value.lat, value.lng] : center} zoom={value ? 15 : zoom} className="h-72 w-full rounded-2xl ring-1 ring-slate-200">
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Clicker onChange={onChange} />
        <Follow value={value} />
        {value && <Marker position={[value.lat, value.lng]} icon={pin} />}
      </MapContainer>
      <p className="text-xs text-slate-500">
        {value ? `Pin: ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}` : 'Click on the map to drop a pin.'}
      </p>
    </div>
  );
}