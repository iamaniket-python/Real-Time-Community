import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import PageShell from '../../components/ui/PageShell';
import Button from '../../components/ui/Button';

const TABS = [
  { value: '', label: 'All' },
  { value: 'PENDING_PAYMENT', label: 'Unpaid' },
  { value: 'PLACED', label: 'Placed' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'READY', label: 'Ready' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'EXPIRED', label: 'Expired' },
];

const BADGE = {
  PENDING_PAYMENT: 'bg-amber-50 text-amber-700',
  PLACED: 'bg-amber-50 text-amber-700',
  CONFIRMED: 'bg-indigo-50 text-indigo-700',
  READY: 'bg-violet-50 text-violet-700',
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
  EXPIRED: 'bg-slate-100 text-slate-500',
};

const rupees = (paise) => `₹${(paise / 100).toFixed(2)}`;
const when = (t) => new Date(t).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
const label = (s) => s.charAt(0) + s.slice(1).toLowerCase().replaceAll('_', ' ');
const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

export default function MyOrdersPage() {
  const [status, setStatus] = useState('');
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [moreBusy, setMoreBusy] = useState(false);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState('');
  const [details, setDetails] = useState({});
  const [detailBusy, setDetailBusy] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);

  const fetchPage = useCallback((st, cursor) => {
    const qs = new URLSearchParams({ limit: '20' });
    if (st) qs.set('status', st);
    if (cursor) qs.set('cursor', cursor);
    return api(`/orders?${qs.toString()}`);
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
      const d = await api(`/orders/${id}`);
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
    setRating(5);
    setComment('');
    if (!details[id]) loadDetail(id);
    return undefined;
  };

  const submitReview = async (id) => {
    setError('');
    setReviewBusy(true);
    try {
      const body = { rating };
      const c = comment.trim();
      if (c) body.comment = c;
      const r = await api(`/orders/${id}/review`, { method: 'POST', body });
      setDetails((prev) => ({ ...prev, [id]: { ...prev[id], review: r } }));
    } catch (e) {
      setError(e.message);
    } finally {
      setReviewBusy(false);
    }
  };

  return (
    <PageShell title="My orders" subtitle="Aapke saare orders aur unki status.">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setStatus(t.value)}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
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
          <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-100">
            <p className="text-sm text-slate-500">Koi order nahi mila.</p>
            <Link to="/shops" className="mt-2 inline-block text-sm font-semibold text-indigo-700">Nearby shops dekho →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((o) => {
              const d = details[o.id];
              const isOpen = openId === o.id;
              return (
                <div key={o.id} className="rounded-3xl bg-white p-4 shadow-xl shadow-indigo-100/60 ring-1 ring-slate-100">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-800">{o.shop_name}</p>
                      <p className="text-xs text-slate-500">#{o.id.slice(0, 8)} · {when(o.created_at)}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${BADGE[o.status] || 'bg-slate-100 text-slate-500'}`}>
                      {label(o.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {o.item_count} item{o.item_count === 1 ? '' : 's'} · {rupees(o.total_paise)} ·{' '}
                    {o.fulfillment === 'DELIVERY' ? 'Delivery' : 'Pickup'}
                  </p>
                  <button
                    onClick={() => toggle(o.id)}
                    className="mt-3 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                  >
                    {isOpen ? 'Hide details' : 'Details'}
                  </button>

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
                          <p className="text-slate-600">Shop address: <span className="font-semibold">{d.shop_address}</span></p>
                          {d.fulfillment === 'DELIVERY' && (
                            <p className="text-slate-600">Delivery address: <span className="font-semibold">{d.delivery_address}</span></p>
                          )}
                          {d.status === 'PENDING_PAYMENT' && d.expires_at && (
                            <p className="text-amber-700">Payment pending. Order {when(d.expires_at)} tak hold hai.</p>
                          )}
                          <div>
                            <p className="mb-1 text-xs font-semibold uppercase text-slate-400">History</p>
                            <ul className="space-y-0.5 text-xs text-slate-500">
                              {d.history.map((h, i) => (
                                <li key={i}>{label(h.to_status)} · {when(h.created_at)}</li>
                              ))}
                            </ul>
                          </div>

                          {d.review ? (
                            <p className="rounded-xl bg-white p-3 text-slate-600 ring-1 ring-slate-100">
                              <span className="text-amber-500">{stars(d.review.rating)}</span>
                              {d.review.comment ? ` · ${d.review.comment}` : ''}
                            </p>
                          ) : d.status === 'COMPLETED' ? (
                            <div className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-slate-100">
                              <p className="font-semibold text-slate-700">Shop ko review do</p>
                              <div className="flex gap-1 text-2xl">
                                {[1, 2, 3, 4, 5].map((n) => (
                                  <button
                                    key={n}
                                    onClick={() => setRating(n)}
                                    aria-label={`${n} star`}
                                    className={n <= rating ? 'text-amber-500' : 'text-slate-300'}
                                  >
                                    ★
                                  </button>
                                ))}
                              </div>
                              <textarea
                                rows={2}
                                maxLength={1000}
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Comment (optional)"
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                              />
                              <Button loading={reviewBusy} onClick={() => submitReview(o.id)}>Submit review</Button>
                            </div>
                          ) : null}
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