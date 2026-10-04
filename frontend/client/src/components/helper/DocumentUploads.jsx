import { useCallback, useEffect, useRef, useState } from 'react';
import { getDocuments, uploadDocument } from '../../api/helperBusiness';
import Card from '../ui/Card';

const ORIGIN = new URL(import.meta.env.VITE_API_URL).origin;
const ITEMS = [['aadhaar', 'Aadhaar card'], ['pan', 'PAN card'], ['shop', 'Shop photo']];
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const full = (u) => (u ? (u.startsWith('http') ? u : ORIGIN + u) : null);

export default function DocumentUploads({ onChange }) {
  const [docs, setDocs] = useState({});
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const tries = useRef(0);

  const load = useCallback(async () => {
    try {
      const d = await getDocuments();
      setDocs(d.documents || {});
      onChange?.(d.documents || {});
    } catch (e) {
      setError(e.message || 'Could not load documents.');
    }
  }, [onChange]);

  useEffect(() => {
    load();
  }, [load]);

  async function pick(type, e) {
    const file = e.target.files[0];
    e.target.value = '';
    setError('');
    if (!file) return;
    if (!TYPES.includes(file.type)) return setError('Only JPEG, PNG or WebP images.');
    if (file.size > 5 * 1024 * 1024) return setError('Image must be 5 MB or smaller.');
    setBusy(type);
    try {
      const d = await uploadDocument(type, file);
      tries.current = 0;
      setDocs(d.documents || {});
      onChange?.(d.documents || {});
    } catch (err) {
      setError(err.message || 'Upload failed.');
    }
    setBusy('');
  }

  // The signed link lasts 5 minutes: on a load error, fetch fresh links once or twice
  const refresh = () => {
    if (tries.current++ < 2) load();
  };

  return (
    <Card title="Documents">
      {error && <p className="mb-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        {ITEMS.map(([type, label]) => (
          <div key={type} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
            <p className="mb-2 text-sm font-semibold text-slate-700">{label}</p>
            <div className="flex h-32 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
              {docs[type] ? (
                <img src={full(docs[type])} onError={refresh} alt={label} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs text-slate-400">Not uploaded</span>
              )}
            </div>
            <label className="mt-3 block cursor-pointer rounded-xl bg-indigo-50 px-3 py-2 text-center text-sm font-semibold text-indigo-700 hover:bg-indigo-100">
              {busy === type ? 'Uploading…' : docs[type] ? 'Replace' : 'Upload'}
              <input type="file" accept={TYPES.join(',')} className="hidden" disabled={!!busy} onChange={(e) => pick(type, e)} />
            </label>
          </div>
        ))}
      </div>
    </Card>
  );
}