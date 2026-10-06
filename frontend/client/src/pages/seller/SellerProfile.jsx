import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import PageShell from '../../components/ui/PageShell';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { normalizeSeller } from './sellerShape';

const input =
  'mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100';

const blank = {
  shopName: '', description: '', address: '', lat: '', lng: '',
  gstNumber: '', panNumber: '', aadhaarNumber: '',
};

export default function SellerProfile() {
  const [form, setForm] = useState(blank);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    api('/sellers/me')
      .then((d) => {
        const s = normalizeSeller(d.seller);
        setForm((f) => ({
          ...f,
          shopName: s.shopName ?? '',
          description: s.description ?? '',
          address: s.address ?? '',
          lat: s.lat ?? '',
          lng: s.lng ?? '',
        }));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const set = (k) => (e) => {
    setSaved(false);
    setForm({ ...form, [k]: e.target.value });
  };

  const locate = () => {
    setError('');
    if (!navigator.geolocation) {
      setError('Location is not supported in this browser');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setForm((f) => ({
          ...f,
          lat: p.coords.latitude.toFixed(6),
          lng: p.coords.longitude.toFixed(6),
        }));
        setSaved(false);
        setLocating(false);
      },
      () => {
        setError('Could not get your location. Allow location access, or type it in manually.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    if (form.lat === '' || form.lng === '' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      setError('Please set the shop location (use the location button or type latitude and longitude).');
      return;
    }
    const body = {
      shopName: form.shopName.trim(),
      address: form.address.trim(),
      lat,
      lng,
      gstNumber: form.gstNumber.trim(),
      panNumber: form.panNumber.trim(),
      aadhaarNumber: form.aadhaarNumber.trim(),
    };
    if (form.description.trim()) body.description = form.description.trim();

    setBusy(true);
    try {
      await api('/sellers/me', { method: 'PUT', body });
      // Do not keep identity numbers in the page after saving
      setForm((f) => ({ ...f, gstNumber: '', panNumber: '', aadhaarNumber: '' }));
      setSaved(true);
    } catch (err) {
      const d = err.details?.map((x) => x.message).join(', ');
      setError(d || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell title="Shop profile" subtitle="Tell customers about your shop and where it is." narrow>
      <Card>
        {loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">Shop name
              <input className={input} value={form.shopName} onChange={set('shopName')} minLength={2} maxLength={120} required />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Description <span className="font-normal text-slate-400">(optional)</span>
              <textarea className={input} rows={3} maxLength={1000} value={form.description} onChange={set('description')} />
            </label>
            <label className="block text-sm font-medium text-slate-700">Shop address
              <textarea className={input} rows={2} minLength={5} maxLength={300} value={form.address} onChange={set('address')} required />
            </label>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-700">Shop location</span>
                <Button type="button" variant="secondary" loading={locating} onClick={locate}>
                  Use my current location
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-medium text-slate-500">Latitude
                  <input className={input} inputMode="decimal" placeholder="24.796100" value={form.lat} onChange={set('lat')} required />
                </label>
                <label className="block text-xs font-medium text-slate-500">Longitude
                  <input className={input} inputMode="decimal" placeholder="85.007800" value={form.lng} onChange={set('lng')} required />
                </label>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <p className="text-sm font-semibold text-slate-800">Identity details</p>
              <p className="mt-1 text-xs text-slate-500">
                Needed for verification. Customers only ever see them masked. Enter all three each time you save the profile.
              </p>
              <label className="mt-3 block text-sm font-medium text-slate-700">GST number
                <input className={input} autoComplete="off" maxLength={15} placeholder="22AAAAA0000A1Z5" value={form.gstNumber} onChange={set('gstNumber')} required />
              </label>
              <label className="mt-3 block text-sm font-medium text-slate-700">PAN number
                <input className={input} autoComplete="off" maxLength={10} placeholder="ABCDE1234F" value={form.panNumber} onChange={set('panNumber')} required />
              </label>
              <label className="mt-3 block text-sm font-medium text-slate-700">Aadhaar number
                <input className={input} autoComplete="off" inputMode="numeric" maxLength={14} placeholder="1234 5678 9012" value={form.aadhaarNumber} onChange={set('aadhaarNumber')} required />
              </label>
            </div>

            {error && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
            )}
            {saved && (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                Profile saved. <Link to="/seller" className="font-semibold underline">Back to dashboard</Link>
              </p>
            )}
            <Button type="submit" loading={busy} className="w-full py-3">Save profile</Button>
          </form>
        )}
      </Card>
    </PageShell>
  );
}