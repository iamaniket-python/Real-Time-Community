import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { getCategories } from '../../api/categories';
import { createRequest } from '../../api/requests';
import { uploadRequestImage } from '../../api/requestImage';
import MapPicker from '../../components/MapPicker';
import PageShell from '../../components/ui/PageShell';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

const input =
  'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100';

export default function NewRequest() {
  const navigate = useNavigate();
  const idemKey = useRef(crypto.randomUUID());
  const [cats, setCats] = useState([]);
  const [f, setF] = useState({ categoryId: '', title: '', description: '', address: '' });
  const [pos, setPos] = useState(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    getCategories()
      .then((d) => setCats(Array.isArray(d) ? d : d?.categories || []))
      .catch(() => setError('Could not load categories.'));
  }, []);

  const locate = () =>
    navigator.geolocation?.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setError('Location blocked. Click the map to pick a spot.'),
    );

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!pos) return setError('Please pick a location on the map.');
    setBusy(true);
    try {
      const res = await createRequest({
        categoryId: Number(f.categoryId),
        title: f.title.trim(),
        description: f.description.trim(),
        address: f.address.trim() || undefined,
        lat: pos.lat,
        lng: pos.lng,
        idempotencyKey: idemKey.current,
      });
      const req = res.request || res;
      if (file) await uploadRequestImage(req.id, file).catch(() => {});
      navigate(`/requests/${req.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.details?.length)
        setError(err.details.map((d) => `${d.field}: ${d.message}`).join(' | '));
      else if (err instanceof ApiError && err.errorCode === 'ACTIVE_REQUEST_EXISTS')
        setError('You already have an active request. Cancel or finish it first.');
      else setError(err.message || 'Something went wrong.');
      setBusy(false);
    }
  }

  return (
    <PageShell title="Ask for help" subtitle="Tell nearby helpers what you need." narrow>
      <Card>
        <form onSubmit={submit} className="space-y-4">
          <select required className={input} value={f.categoryId} onChange={set('categoryId')}>
            <option value="">Choose a category…</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input required className={input} placeholder="Short title" value={f.title} onChange={set('title')} />
          <textarea required rows={4} className={input} placeholder="Describe what you need" value={f.description} onChange={set('description')} />
          <input className={input} placeholder="Address / landmark (optional)" value={f.address} onChange={set('address')} />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Where are you?</span>
              <Button type="button" variant="secondary" onClick={locate} className="!py-1.5">Use my location</Button>
            </div>
            <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
              <MapPicker value={pos} onChange={setPos} />
            </div>
          </div>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files[0] || null)} className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:font-semibold file:text-indigo-700" />
          {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
          <Button type="submit" loading={busy} className="w-full">Send request</Button>
        </form>
      </Card>
    </PageShell>
  );
}