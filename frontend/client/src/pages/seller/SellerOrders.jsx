import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import PageShell from '../../components/ui/PageShell';
import Button from '../../components/ui/Button';

const TABS = [
  { value: '', label: 'All' },
  { value: 'PLACED', label: 'New' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'READY', label: 'Ready' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const BADGE = {
  PLACED: 'bg-amber-50 text-amber-700',
  CONFIRMED: 'bg-indigo-50 text-indigo-700',
  READY: 'bg-violet-50 text-violet-700',
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

// status -> next action the seller can take
const NEXT = {
  PLACED: { action: 'confirm', label: 'Confirm order' },
  CONFIRMED: { action: 'ready', label: 'Mark ready' },
  READY: { action: 'complete', label: 'Mark completed' },
};

const rupees = (paise) => `₹${(paise / 100).toFixed(2)}`;
const when = (t) => new Date(t).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
const label = (s) => s.charAt(0) + s.slice(1).toLowerCase().replace('_', ' ');

export default function SellerOrders() {
  const [status, setStatus] = useState('');
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [moreBusy, setMoreBusy] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [openId, setOpenId] = useState('');
  const [details, setDetails] = useState({});
  const [detailBusy, setDetailBusy] = useState('');

  const fetchPage = useCallback((st, cursor) => {
    const qs = new URLSearchParams({ limit: '20' });
    if (st) qs.set('status', st);
    if (cursor) qs.set('cursor', cursor);
    return api(`/sellers/me/orders?${qs.toString()}`);
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

  const loadDetail = async (id) => {
    setDetailBusy(id);
    try {
      const d = await api(`/sellers/me/orders/${id}`);
      setDetails((prev) => ({ ...prev, [id]: d }));
    } catch (e) {
      setError(e.message);
    } finally {
      setDetailBusy('');
    }
  };

  const toggle = (id) => {
    if (openId === id) return setOpenId('');
    setOpenId(id);
    if (!details[id]) loadDetail(id);
  };

  const move = async (o) => {
    const next = NEXT[o.status];
    if (!next) return;
    setError('');
    setBusyId(o.id);
    try {
      const r = await api(`/sellers/me/orders/${o.id}/${next.action}`, { method: 'PATCH' });
      if (status) {
        // a filtered tab: the order no longer belongs here
        setItems((prev) => prev.filter((x) => x.id !== o.id));
      } else {
        setItems((prev) => prev.map((x) => (x.id === o.id ? { ...x, status: r.status } : x)));
      }
      if (details[o.id]) loadDetail(o.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId('');
    }
  };

  return (
    <PageShell title="Orders" subtitle="Customers ke paid orders yahan aate hain.">
      <div className="space-y-4">
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
          <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-100">
            Is filter mein koi order nahi hai.
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((o) => {
              const next = NEXT[o.status];
              const d = details[o.id];
              const isOpen = openId === o.id;
              return (
                <div key={o.id} className="rounded-3xl bg-white p-4 shadow-xl shadow-indigo-100/60 ring-1 ring-slate-100">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-800">Order #{o.id.slice(0, 8)}</p>
                      <p className="text-xs text-slate-500">{when(o.created_at)}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${BADGE[o.status] || 'bg-slate-100 text-slate-500'}`}>
                      {label(o.status)}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-600">
                    {o.item_count} item{o.item_count === 1 ? '' : 's'} · {rupees(o.total_paise)} ·{' '}
                    {o.fulfillment === 'DELIVERY' ? 'Delivery' : 'Pickup'}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                    {next && (
                      <button
                        disabled={busyId === o.id}
                        onClick={() => move(o)}
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {busyId === o.id ? 'Wait...' : next.label}
                      </button>
                    )}
                    <button
                      onClick={() => toggle(o.id)}
                      className="rounded-lg px-3 py-1.5 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                    >
                      {isOpen ? 'Hide details' : 'Details'}
                    </button>
                  </div>

                  {isOpen && (
                    <div className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-4 text-sm ring-1 ring-slate-100">
                      {!d ? (
                        <p className="text-slate-500">{detailBusy === o.id ? 'Loading...' : 'Details load nahi hue.'}</p>
                      ) : (
                        <>
                          <ul className="space-y-1">
                            {d.items.map((it) => (
                              <li key={it.product_id} className="flex justify-between gap-2">
                                <span className="text-slate-700">{it.name} × {it.quantity}</span>
                                <span className="text-slate-600">{rupees(it.unit_price_paise * it.quantity)}</span>
                              </li>
                            ))}
                          </ul>
                          <p className="flex justify-between border-t border-slate-200 pt-2 font-semibold text-slate-800">
                            <span>Total</span><span>{rupees(d.total_paise)}</span>
                          </p>
                          {d.customer_phone && (
                            <p className="text-slate-600">Customer phone: <span className="font-semibold">{d.customer_phone}</span></p>
                          )}
                          {d.fulfillment === 'DELIVERY' && (
                            <p className="text-slate-600">Delivery address: <span className="font-semibold">{d.delivery_address || 'not given'}</span></p>
                          )}
                          <div>
                            <p className="mb-1 text-xs font-semibold uppercase text-slate-400">History</p>
                            <ul className="space-y-0.5 text-xs text-slate-500">
                              {d.history.map((h, i) => (
                                <li key={i}>{label(h.to_status)} · {when(h.created_at)}</li>
                              ))}
                            </ul>
                          </div>
                          {d.review && (
                            <p className="rounded-xl bg-white p-3 text-slate-600 ring-1 ring-slate-100">
                              Review: <span className="font-semibold">{d.review.rating}/5</span>
                              {d.review.comment ? ` · ${d.review.comment}` : ''}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {nextCursor && (
          <div className="text-center">
            <Button variant="secondary" loading={moreBusy} onClick={loadMore}>Load more</Button>
          </div>
        )}
      </div>
    </PageShell>
  );
}