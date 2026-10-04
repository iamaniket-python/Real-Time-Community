import { useCallback, useEffect, useRef, useState } from 'react';
import { getAssignedHelper } from '../api/requestHelper';
import Card from './ui/Card';

const ORIGIN = new URL(import.meta.env.VITE_API_URL).origin;
const full = (u) => (u ? (u.startsWith('http') ? u : ORIGIN + u) : null);

function Row({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:justify-between">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="break-words text-sm font-medium text-slate-800">{value}</span>
    </div>
  );
}

export default function AssignedHelper({ requestId, status }) {
  const [h, setH] = useState(null);
  const [error, setError] = useState('');
  const tries = useRef(0);

  const load = useCallback(async () => {
    try {
      const d = await getAssignedHelper(requestId);
      setH(d.helper || d);
      setError('');
    } catch (e) {
      setError(e.status === 404 ? '' : e.message || 'Could not load helper details.');
    }
  }, [requestId]);

  // Reload when the request status changes (for example ACCEPTED -> ARRIVING)
  useEffect(() => {
    load();
  }, [load, status]);

  // The shop photo link lasts 5 minutes: fetch a fresh one once or twice on failure
  const expired = () => {
    if (tries.current++ < 2) load();
  };

  if (error) return <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>;
  if (!h) return null;

  const b = h.business || {};
  const photo = full(b.shopImage);
  const initials = (h.name || '?').split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <Card title="Your helper" className="!p-4 sm:!p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-base font-bold text-white shadow-md shadow-indigo-200">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-800">{h.name}</p>
          <p className="text-sm text-slate-500">
            {h.ratingCount ? `⭐ ${Number(h.ratingAvg).toFixed(1)} · ${h.ratingCount} ratings` : 'No ratings yet'}
          </p>
        </div>
        {h.phone && (
          <a href={`tel:${h.phone}`} className="shrink-0 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-100">
            📞 Call
          </a>
        )}
      </div>

      {photo && (
        <a href={photo} target="_blank" rel="noreferrer" className="mt-4 block overflow-hidden rounded-2xl ring-1 ring-slate-200">
          <img src={photo} onError={expired} alt="Shop" className="h-44 w-full object-cover" />
        </a>
      )}

      <div className="mt-3 divide-y divide-slate-100">
        <Row label="Phone" value={h.phone} />
        <Row label="Shop" value={b.name} />
        <Row label="Address" value={b.address} />
        <Row label="Experience" value={b.experienceYears != null ? `${b.experienceYears} years` : ''} />
        <Row label="GST number" value={b.gstNumber} />
        <Row label="Aadhaar" value={b.aadhaarMasked} />
        <Row label="PAN" value={b.panMasked} />
        <Row label="Services" value={(h.categories || []).join(', ')} />
      </div>
      <p className="mt-3 text-xs text-slate-400">
        ID numbers are partly hidden to protect your helper's privacy. Admins have verified the full documents.
      </p>
    </Card>
  );
}