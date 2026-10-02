import { useEffect, useRef, useState } from 'react';
import ImageLightbox from './ImageLightbox';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX = 5 * 1024 * 1024;
export const MAX_IMAGES = 4;

export default function ImagePicker({ files, onChange }) {
  const ref = useRef(null);
  const [urls, setUrls] = useState([]);
  const [view, setView] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    const u = files.map((f) => URL.createObjectURL(f));
    setUrls(u);
    return () => u.forEach((x) => URL.revokeObjectURL(x));
  }, [files]);

  const pick = (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = '';
    if (!picked.length) return;
    const room = MAX_IMAGES - files.length;
    const ok = [];
    let msg = '';
    for (const f of picked) {
      if (!TYPES.includes(f.type)) msg = 'Only JPEG, PNG or WebP images are allowed.';
      else if (f.size > MAX) msg = 'Each image must be 5 MB or smaller.';
      else if (files.some((x) => x.name === f.name && x.size === f.size)) msg = 'Some photos were already added.';
      else if (ok.length >= room) msg = `You can add up to ${MAX_IMAGES} photos.`;
      else ok.push(f);
    }
    setErr(msg);
    if (ok.length) onChange([...files, ...ok]);
  };

  const remove = (i) => { setErr(''); onChange(files.filter((_, k) => k !== i)); };

  return (
    <div>
      <input ref={ref} type="file" multiple accept={TYPES.join(',')} onChange={pick} className="hidden" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {urls.map((u, i) => (
          <div key={u} className="group relative aspect-square overflow-hidden rounded-2xl ring-1 ring-slate-200">
            <button type="button" onClick={() => setView(i)} aria-label={`View photo ${i + 1}`} className="h-full w-full">
              <img src={u} alt={`Selected ${i + 1}`} className="h-full w-full object-cover transition group-hover:scale-105" />
            </button>
            <button type="button" onClick={() => remove(i)} aria-label={`Remove photo ${i + 1}`} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/70 text-xs font-bold text-white backdrop-blur transition hover:bg-red-600">✕</button>
          </div>
        ))}
        {files.length < MAX_IMAGES && (
          <button type="button" onClick={() => ref.current?.click()} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 text-center transition hover:border-indigo-400 hover:bg-indigo-50">
            <span className="text-2xl">📷</span>
            <span className="text-sm font-semibold text-indigo-700">{files.length ? 'Add more' : 'Add photos'}</span>
            <span className="px-2 text-xs text-slate-500">JPEG, PNG, WebP · 5 MB</span>
          </button>
        )}
      </div>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      {view !== null && urls[view] && <ImageLightbox urls={urls} index={view} onChange={setView} onClose={() => setView(null)} />}
    </div>
  );
}