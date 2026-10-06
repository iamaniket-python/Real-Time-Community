import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import PageShell from '../../components/ui/PageShell';
import Card from '../../components/ui/Card';
import GalleryManager from '../../components/GalleryManager';
import { normalizeSeller, assetUrl } from './sellerShape';

const DOCS = [
  { type: 'gst', label: 'GST certificate' },
  { type: 'pan', label: 'PAN card' },
  { type: 'aadhaar', label: 'Aadhaar card' },
];
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

export default function SellerDocuments() {
  const [docs, setDocs] = useState(null);
  const [seller, setSeller] = useState(null);
  const [error, setError] = useState('');
  const [busyType, setBusyType] = useState('');

  useEffect(() => {
    Promise.all([api('/sellers/me/documents'), api('/sellers/me')])
      .then(([d, s]) => {
        setDocs(d.documents);
        setSeller(normalizeSeller(s.seller));
      })
      .catch((e) => setError(e.message));
  }, []);

  const upload = async (type, file) => {
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
    setBusyType(type);
    try {
      const d = await api(`/sellers/me/documents/${type}`, { method: 'POST', form });
      setDocs(d.documents);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyType('');
    }
  };

  const numbers = {
    gst: seller?.gstNumber,
    pan: seller?.panMasked,
    aadhaar: seller?.aadhaarMasked,
  };

  return (
    <PageShell title="Documents & photos" subtitle="Upload clear photos of your documents for verification, and show off your shop.">
      <div className="space-y-4">
        {error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          {DOCS.map((d) => {
            const url = assetUrl(docs?.[d.type]);
            const busy = busyType === d.type;
            return (
              <Card key={d.type} title={d.label}>
                <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-100">
                  {url ? (
                    <img src={url} alt={d.label} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-sm text-slate-400">{docs ? 'Not uploaded' : 'Loading...'}</span>
                  )}
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Saved number: {numbers[d.type] || 'not saved yet'}
                </p>
                <label
                  className={`mt-3 block rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition ${
                    busy
                      ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                      : 'cursor-pointer bg-white text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50'
                  }`}
                >
                  {busy ? 'Uploading...' : url ? 'Replace image' : 'Upload image'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={busy}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      upload(d.type, f);
                    }}
                  />
                </label>
              </Card>
            );
          })}
        </div>

        <Card title="Shop photos">
          <GalleryManager />
        </Card>
      </div>
    </PageShell>
  );
}