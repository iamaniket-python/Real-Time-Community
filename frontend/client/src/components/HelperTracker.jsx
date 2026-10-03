import { useEffect, useMemo } from 'react';
import { CircleMarker, MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function Fit({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [40, 40], maxZoom: 16 });
    else if (points.length === 1) map.setView(points[0], 15);
  }, [map, points]);
  return null;
}

export default function HelperTracker({ request, helperPos }) {
  const uLat = Number(request.lat ?? request.latitude);
  const uLng = Number(request.lng ?? request.longitude);
  const hLat = helperPos?.lat;
  const hLng = helperPos?.lng;
  const hasUser = Number.isFinite(uLat) && Number.isFinite(uLng);
  const hasHelper = Number.isFinite(hLat) && Number.isFinite(hLng);

  const points = useMemo(() => {
    const p = [];
    if (hasUser) p.push([uLat, uLng]);
    if (hasHelper) p.push([hLat, hLng]);
    return p;
  }, [hasUser, hasHelper, uLat, uLng, hLat, hLng]);

  if (!points.length)
    return <p className="text-sm text-slate-400">Waiting for your helper's location…</p>;

  return (
    <div className="space-y-2">
      <div className="h-64 overflow-hidden rounded-2xl ring-1 ring-slate-200">
        <MapContainer center={points[0]} zoom={15} className="h-full w-full">
          <TileLayer
            attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Fit points={points} />
          {hasUser && (
            <CircleMarker center={[uLat, uLng]} radius={9} pathOptions={{ color: '#4f46e5', fillOpacity: 0.9 }} />
          )}
          {hasHelper && (
            <CircleMarker center={[hLat, hLng]} radius={9} pathOptions={{ color: '#e11d48', fillOpacity: 0.9 }} />
          )}
        </MapContainer>
      </div>
      <p className="text-xs text-slate-500">
        <span className="text-indigo-600">●</span> You &nbsp;
        <span className="text-rose-600">●</span> Helper
        {helperPos?.distanceKm != null && ` · ${Number(helperPos.distanceKm).toFixed(1)} km away`}
      </p>
    </div>
  );
}