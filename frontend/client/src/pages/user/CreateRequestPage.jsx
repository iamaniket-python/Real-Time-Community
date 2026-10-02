import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MapPicker from '../../components/MapPicker';
import FormSection from '../../components/FormSection';
import CategoryChips from '../../components/CategoryChips';
import ImagePicker from '../../components/ImagePicker';
import { getCategories } from '../../api/categories';
import { createRequest } from '../../api/requests';
import { uploadRequestImages } from '../../api/requestImage';

const input = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100';
const label = 'block text-sm font-medium text-slate-700';
const count = 'mt-1 text-right text-xs text-slate-400';
const btn = 'flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 py-4 text-lg font-semibold text-white shadow-xl shadow-indigo-200 transition hover:brightness-110 disabled:opacity-60';

export default function CreateRequestPage() {
  const nav = useNavigate();
  const [cats, setCats] = useState([]);
  const [form, setForm] = useState({ categoryId: '', title: '', description: '', address: '' });
  const [pos, setPos] = useState(null);
  const [images, setImages] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(false);

  useEffect(() => {
    getCategories().then((d) => setCats(d.categories || [])).catch((e) => setError(e.message));
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (created) return;
    if (!form.categoryId) return setError('Please choose a category.');
    if (!pos) return setError('Please drop a pin on the map first.');
    setError('');
    setBusy(true);
    const payload = { ...form, categoryId: Number(form.categoryId), lat: pos.lat, lng: pos.lng };
    if (!payload.address.trim()) delete payload.address;
    let res;
    try {
      res = await createRequest(payload);
    } catch (err) {
      const d = err.details?.map((x) => `${x.field}: ${x.message}`).join(', ');
      setError(d || err.message);
      return setBusy(false);
    }
    if (images.length) {
      const { done, error: upErr } = await uploadRequestImages(res?.request?.id ?? res?.id, images);
      if (done < images.length) {
        setCreated(true);
        setBusy(false);
        return setError(`Your request was sent, but ${images.length - done} of ${images.length} photo(s) failed to upload (${upErr}).`);
      }
    }
    nav('/user');
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 via-slate-50 to-white pb-16">
      <header className="bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 px-6 pb-24 pt-8 text-white">
        <div className="mx-auto max-w-2xl">
          <Link to="/user" className="text-sm font-semibold text-indigo-100 hover:text-white">← Back</Link>
          <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Ask for help</h1>
          <p className="mt-2 text-indigo-100">Tell nearby helpers what you need. It takes under a minute.</p>
        </div>
      </header>

      <form onSubmit={submit} className="mx-auto -mt-14 max-w-2xl space-y-5 px-4">
        <FormSection step="1" title="What do you need?" hint="Pick the category that fits best.">
          <CategoryChips cats={cats} value={form.categoryId} onChange={(id) => setForm({ ...form, categoryId: id })} />
        </FormSection>

        <FormSection step="2" title="Describe it" hint="Clear details get faster responses.">
          <div className="space-y-4">
            <label className={label}>Title
              <input className={`${input} mt-1.5`} minLength={3} maxLength={150} value={form.title} onChange={set('title')} placeholder="e.g. Flat tyre on the main road" required />
              <p className={count}>{form.title.length}/150</p>
            </label>
            <label className={label}>Description
              <textarea className={`${input} mt-1.5`} rows={4} minLength={10} maxLength={2000} value={form.description} onChange={set('description')} placeholder="What happened and what kind of help would work?" required />
              <p className={count}>{form.description.length}/2000</p>
            </label>
            <label className={label}>Address <span className="font-normal text-slate-400">(optional)</span>
              <input className={`${input} mt-1.5`} value={form.address} onChange={set('address')} placeholder="Landmark or street" />
            </label>
            <div className={label}>Photos <span className="font-normal text-slate-400">(optional)</span>
              <div className="mt-1.5"><ImagePicker files={images} onChange={setImages} /></div>
            </div>
          </div>
        </FormSection>

        <FormSection step="3" title="Where are you?" hint={pos ? `Pin set at ${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}` : 'Tap the map to drop a pin.'}>
          <div className="relative z-0 overflow-hidden rounded-2xl ring-1 ring-slate-200">
            <MapPicker value={pos} onChange={setPos} />
          </div>
        </FormSection>

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        {created ? (
          <Link to="/user" className={btn}>Go to my requests</Link>
        ) : (
          <button disabled={busy} className={btn}>
            {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
            {busy ? 'Sending...' : 'Send request'}
          </button>
        )}
      </form>
    </main>
  );
}