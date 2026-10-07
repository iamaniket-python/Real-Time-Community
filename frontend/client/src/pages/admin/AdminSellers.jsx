import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import Button from '../../components/ui/Button';

const TABS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'SUSPENDED', label: 'Suspended' },
];

const when = (t) => (t ? new Date(t).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'not submitted');

export default function AdminSellers() {
  const [status, setStatus] = useState('PENDING');
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [moreBusy, setMoreBusy] = useState(false);
  const [error, setError] = useState('');

  const fetchPage = useCallback((st, cursor) => {
    const qs = new URLSearchParams({ status: st, limit: '20' });
    if (cursor) qs.set('cursor', cursor);
    return api(`/admin/sellers?${qs.toString()}`);
  }, []);

  useEffect(() => {
    let stale = false;
    setLoading(true);
    setError('');
    fetchPage(status, null)
      .then((p) => {
        if (stale) return;
        setItems(p.items);
        setNextCursor(p.nextCursor);
      })
      .catch((e) => !stale && setError(e.message))
      .finally(() => !stale && setLoading(false));
    return () => { stale = true; };
  }, [status, fetchPage]);

  const loadMore = async () => {
    setMoreBusy(true);
    try {
      const p = await fetchPage(status, nextCursor);
      setItems((prev) => [...prev, ...p.items]);
      setNextCursor(p.nextCursor);
    } catch (e) {
      setError(e.message);
    } finally {
      setMoreBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800">Sellers</h1>
        <p className="text-sm text-slate-500">Shops verify, reject ya suspend karo. Sabse purani request pehle aati hai.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setStatus(t.value)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              status === t.value
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : items.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-100">Is status mein koi seller nahi hai.</p>
      ) : (
        <div className="space-y-3">
          {items.map((s) => (
            <Link
              key={s.id}
              to={`/admin/sellers/${s.id}`}
              className="block rounded-3xl bg-white p-4 shadow-xl shadow-indigo-100/60 ring-1 ring-slate-100 transition hover:-translate-y-0.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-slate-800">{s.shopName || 'Shop name not set'}</p>
                {s.accountStatus && s.accountStatus !== 'ACTIVE' && (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">Account {s.accountStatus}</span>
                )}
              </div>
              <p className="text-sm text-slate-600">{s.name} · {s.email}</p>
              {s.address && <p className="text-xs text-slate-500">{s.address}</p>}
              <p className="mt-1 text-xs text-slate-400">Submitted: {when(s.submittedAt)}</p>
            </Link>
          ))}
        </div>
      )}

      {nextCursor && (
        <div className="text-center">
          <Button variant="secondary" loading={moreBusy} onClick={loadMore}>Load more</Button>
        </div>
      )}
    </div>
  );
}