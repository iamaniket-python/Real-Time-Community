import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import PageShell from '../../components/ui/PageShell';
import Button from '../../components/ui/Button';
import { assetUrl } from '../seller/sellerShape';

const RADII = [1, 3, 5, 10];

export default function NearbyShops() {
  const [coords, setCoords] = useState(null);
  const [radiusKm, setRadiusKm] = useState(10);
  const [shops, setShops] = useState(null);
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const locate = () => {
    setError('');
    if (!navigator.geolocation) {
      setError('Is browser mein location support nahi hai');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setError('Location nahi mili. Browser mein location allow karo aur dobara try karo.');
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  };

  useEffect(() => {
    if (!coords) return undefined;
    let stale = false;
    setLoading(true);
    setError('');
    const qs = new URLSearchParams({
      lat: String(coords.lat),
      lng: String(coords.lng),
      radiusKm: String(radiusKm),
    });
    api(`/shops/nearby?${qs.toString()}`)
      .then((d) => !stale && setShops(d.items))
      .catch((e) => !stale && setError(e.message))
      .finally(() => !stale && setLoading(false));
    return () => { stale = true; };
  }, [coords, radiusKm]);

  return (
    <PageShell title="Nearby shops" subtitle="Aapke paas ki verified aur khuli dukaane.">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-white p-4 shadow-xl shadow-indigo-100/60 ring-1 ring-slate-100">
          <Button onClick={locate} loading={locating}>
            {coords ? 'Update my location' : 'Use my location'}
          </Button>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>Distance:</span>
            {RADII.map((r) => (
              <button
                key={r}
                onClick={() => setRadiusKm(r)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  radiusKm === r
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                {r} km
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        {!coords && !error && (
          <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-100">
            Shops dekhne ke liye "Use my location" dabao.
          </p>
        )}

        {loading && <p className="text-sm text-slate-500">Loading...</p>}

        {coords && !loading && shops && shops.length === 0 && (
          <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-100">
            {radiusKm} km ke andar koi khuli shop nahi mili. Distance badha ke dekho.
          </p>
        )}

        {!loading && shops && shops.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {shops.map((s) => {
              const cover = assetUrl(s.coverUrl);
              return (
                <Link
                  key={s.id}
                  to={`/shops/${s.id}`}
                  className="overflow-hidden rounded-3xl bg-white shadow-xl shadow-indigo-100/60 ring-1 ring-slate-100 transition hover:-translate-y-0.5"
                >
                  <div className="flex h-36 items-center justify-center bg-linear-to-br from-indigo-50 to-violet-50">
                    {cover ? (
                      <img src={cover} alt={s.shopName} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-sm text-slate-400">No photo</span>
                    )}
                  </div>
                  <div className="space-y-1 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate font-bold text-slate-800">{s.shopName}</h3>
                      <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        Verified
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{s.address}</p>
                    <p className="text-sm text-slate-600">
                      {s.distanceKm} km ·{' '}
                      {s.ratingCount > 0 ? `★ ${s.ratingAvg.toFixed(1)} (${s.ratingCount})` : 'No reviews yet'}
                    </p>
                    {s.description && (
                      <p className="line-clamp-2 text-sm text-slate-500">{s.description}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}