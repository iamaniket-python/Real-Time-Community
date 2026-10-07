import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { assetUrl } from '../seller/sellerShape';

const DOCS = [
  { key: 'gst', label: 'GST certificate', num: 'gstNumber' },
  { key: 'pan', label: 'PAN card', num: 'panNumber' },
  { key: 'aadhaar', label: 'Aadhaar card', num: 'aadhaarNumber' },
];

// which actions are allowed from which status (same rules as the backend)
const ACTIONS = {
  PENDING: ['verify', 'reject'],
  REJECTED: ['verify'],
  SUSPENDED: ['verify'],
  VERIFIED: ['suspend'],
};
const STYLE = {
  verify: 'bg-emerald-600 text-white hover:bg-emerald-700',
  reject: 'text-red-600 ring-1 ring-red-200 hover:bg-red-50',
  suspend: 'text-red-600 ring-1 ring-red-200 hover:bg-red-50',
};
const LABEL = { verify: 'Verify', reject: 'Reject', suspend: 'Suspend' };

export default function AdminSellerDetail() {
  const { id } = useParams();
  const [s, setS] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let stale = false;
    setS(null);
    setError('');
    api(`/admin/sellers/${id}`)
      .then((d) => !stale && setS(d))
      .catch((e) => !stale && setError(e.message));
    return () => { stale = true; };
  }, [id]);

  const act = async (action) => {
    if (action !== 'verify' && !window.confirm(`${LABEL[action]} this seller?`)) return;
    setError('');
    setNotice('');
    setBusy(action);
    try {
      const body = {};
      const r = reason.trim();
      if (r) body.reason = r;
      const out = await api(`/admin/sellers/${id}/${action}`, { method: 'POST', body });
      setS((prev) => ({ ...prev, verificationStatus: out.verificationStatus }));
      setReason('');
      setNotice(`Seller ab ${out.verificationStatus} hai.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  if (!s) {
    return (
      <div className="space-y-3">
        <Link to="/admin/sellers" className="text-sm font-semibold text-indigo-700">← Sellers</Link>
        {error ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : (
          <p className="text-sm text-slate-500">Loading...</p>
        )}
      </div>
    );
  }

  const allowed = ACTIONS[s.verificationStatus] || [];

  return (
    <div className="space-y-4">
      <Link to="/admin/sellers" className="text-sm font-semibold text-indigo-700">← Sellers</Link>

      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}
      {notice && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>
      )}

      <div className="rounded-3xl bg-white p-5 shadow-xl shadow-indigo-100/60 ring-1 ring-slate-100">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-extrabold text-slate-800">{s.shop.name || 'Shop name not set'}</h1>
            <p className="text-sm text-slate-600">{s.name} · {s.email}{s.phone ? ` · ${s.phone}` : ''}</p>
          </div>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">{s.verificationStatus}</span>
        </div>
        <dl className="mt-3 space-y-1 text-sm text-slate-600">
          <p>Address: <span className="font-semibold">{s.shop.address || '-'}</span></p>
          <p>Location: <span className="font-semibold">{s.shop.lat != null ? `${s.shop.lat}, ${s.shop.lng}` : '-'}</span></p>
          {s.shop.description && <p>Description: {s.shop.description}</p>}
          <p>Account: {s.accountStatus} · Shop {s.isOpen ? 'open' : 'closed'} · Rating {s.ratingCount > 0 ? `${s.ratingAvg.toFixed(1)} (${s.ratingCount})` : 'none'}</p>
        </dl>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {DOCS.map((d) => {
          const url = assetUrl(s.documents[d.key]);
          return (
            <div key={d.key} className="rounded-3xl bg-white p-4 shadow-xl shadow-indigo-100/60 ring-1 ring-slate-100">
              <p className="font-bold text-slate-800">{d.label}</p>
              <p className="mb-2 break-all text-sm text-slate-600">{s.shop[d.num] || 'number not saved'}</p>
              <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-100">
                {url ? (
                  <a href={url} target="_blank" rel="noreferrer" className="h-full w-full">
                    <img src={url} alt={d.label} className="h-full w-full object-cover" />
                  </a>
                ) : (
                  <span className="text-sm text-slate-400">Not uploaded</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {s.gallery.length > 0 && (
        <div className="rounded-3xl bg-white p-4 shadow-xl shadow-indigo-100/60 ring-1 ring-slate-100">
          <p className="mb-2 font-bold text-slate-800">Shop photos</p>
          <div className="flex gap-2 overflow-x-auto">
            {s.gallery.map((g) => (
              <img key={g.id} src={assetUrl(g.url)} alt="" className="h-24 w-24 shrink-0 rounded-xl object-cover ring-1 ring-slate-100" />
            ))}
          </div>
        </div>
      )}

      {allowed.length > 0 && (
        <div className="space-y-3 rounded-3xl bg-white p-5 shadow-xl shadow-indigo-100/60 ring-1 ring-slate-100">
          <textarea
            rows={2}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional, audit log mein save hota hai)"
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
          <div className="flex flex-wrap gap-2">
            {allowed.map((a) => (
              <button
                key={a}
                disabled={!!busy}
                onClick={() => act(a)}
                className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${STYLE[a]}`}
              >
                {busy === a ? 'Wait...' : LABEL[a]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}