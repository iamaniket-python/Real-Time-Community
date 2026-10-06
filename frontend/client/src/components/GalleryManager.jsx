import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { assetUrl } from '../pages/seller/sellerShape';

const MAX = 10;
const MAX_BYTES = 5 * 1024 * 1024;
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function GalleryManager() {
  const [images, setImages] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/sellers/me/gallery')
      .then((d) => setImages(d.images))
      .catch((e) => setError(e.message));
  }, []);

  const add = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    if (!OK_TYPES.includes(file.type)) {
      setError('Only JPEG, PNG or WebP images are allowed');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Image must be 5 MB or smaller');
      return;
    }
    const form = new FormData();
    form.append('file', file);
    setBusy(true);
    try {
      const d = await api('/sellers/me/gallery', { method: 'POST', form });
      setImages(d.images);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Remove this photo?')) return;
    setError('');
    setBusy(true);
    try {
      const d = await api(`/sellers/me/gallery/${id}`, { method: 'DELETE' });
      setImages(d.images);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const count = images?.length ?? 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">{count} of {MAX} photos</p>
        <label
          className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
            busy || count >= MAX
              ? 'cursor-not-allowed bg-slate-100 text-slate-400'
              : 'cursor-pointer bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200 hover:brightness-110'
          }`}
        >
          {busy ? 'Please wait...' : 'Add photo'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={busy || count >= MAX}
            onChange={add}
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {images === null && !error && <p className="mt-4 text-sm text-slate-500">Loading...</p>}
      {images && count === 0 && (
        <p className="mt-4 text-sm text-slate-400">No photos yet. Add photos of your shop and products.</p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {images?.map((img) => (
          <div key={img.id} className="group relative aspect-square overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-100">
            <img src={assetUrl(img.url)} alt="Shop" className="h-full w-full object-cover" />
            <button
              type="button"
              disabled={busy}
              onClick={() => remove(img.id)}
              className="absolute right-2 top-2 rounded-lg bg-rose-600 px-2 py-1 text-xs font-semibold text-white shadow hover:bg-rose-500 disabled:opacity-60"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}