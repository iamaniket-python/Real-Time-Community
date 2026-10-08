import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import PageShell from '../../components/ui/PageShell';
import Button from '../../components/ui/Button';
import { assetUrl } from '../seller/sellerShape';

const LIMIT = 20;

function fetchPage(q, type, cursor) {
  const qs = new URLSearchParams({ q, type, limit: String(LIMIT) });
  if (cursor) qs.set('cursor', cursor);
  return api(`/shops/search?${qs.toString()}`);
}

const rupees = (paise) =>
  `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const CARD =
  'overflow-hidden rounded-3xl bg-white shadow-xl shadow-indigo-100/60 ring-1 ring-slate-100 transition hover:-translate-y-0.5';

function Photo({ src, alt }) {
  return (
    <div className="flex h-36 items-center justify-center bg-linear-to-br from-indigo-50 to-violet-50">
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <span className="text-sm text-slate-400">No photo</span>
      )}
    </div>
  );
}

function ProductCard({ p }) {
  return (
    <Link to={`/shops/${p.shopId}`} className={CARD}>
      <Photo src={assetUrl(p.imageUrl)} alt={p.name} />
      <div className="space-y-1 p-4">
        <h3 className="truncate font-bold text-slate-800">{p.name}</h3>
        <p className="text-xs text-slate-500">{p.shopName}</p>
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-indigo-700">{rupees(p.pricePaise)}</span>
          {!p.inStock && (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
              Out of stock
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function ShopCard({ s }) {
  return (
    <Link to={`/shops/${s.id}`} className={CARD}>
      <Photo src={assetUrl(s.coverUrl)} alt={s.shopName} />
      <div className="space-y-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-bold text-slate-800">{s.shopName}</h3>
          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
            Verified
          </span>
        </div>
        <p className="text-xs text-slate-500">{s.address}</p>
        <p className="text-sm text-slate-600">
          {s.ratingCount > 0 ? `★ ${s.ratingAvg.toFixed(1)} (${s.ratingCount})` : 'No reviews yet'}
        </p>
        {s.description && <p className="line-clamp-2 text-sm text-slate-500">{s.description}</p>}
      </div>
    </Link>
  );
}

const tabClass = (active) =>
  `rounded-xl px-4 py-2 text-sm font-semibold transition ${
    active ? 'bg-indigo-600 text-white' : 'text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
  }`;

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = (params.get('q') || '').trim();
  const type = params.get('type') === 'shops' ? 'shops' : 'products';
  const valid = q.length >= 2;

  const [items, setItems] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const keyRef = useRef('');

  useEffect(() => {
    keyRef.current = `${q}|${type}`;
    setItems(null);
    setNextCursor(null);
    setError('');
    if (!valid) return undefined;
    let stale = false;
    setLoading(true);
    fetchPage(q, type)
      .then((d) => {
        if (stale) return;
        setItems(d.items);
        setNextCursor(d.nextCursor);
      })
      .catch((e) => !stale && setError(e.message))
      .finally(() => !stale && setLoading(false));
    return () => { stale = true; };
  }, [q, type, valid]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    const key = keyRef.current;
    setLoadingMore(true);
    setError('');
    try {
      const d = await fetchPage(q, type, nextCursor);
      if (keyRef.current !== key) return;
      setItems((prev) => [...(prev || []), ...d.items]);
      setNextCursor(d.nextCursor);
    } catch (e) {
      if (keyRef.current === key) setError(e.message);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <PageShell
      title="Search"
      subtitle={valid ? `"${q}" ke results` : 'Product ya shop ka naam search karo.'}
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <button onClick={() => setParams({ q, type: 'products' })} className={tabClass(type === 'products')}>
            Products
          </button>
          <button onClick={() => setParams({ q, type: 'shops' })} className={tabClass(type === 'shops')}>
            Shops
          </button>
        </div>

        {!valid && (
          <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-100">
            Kam se kam 2 letters likho aur Search dabao.
          </p>
        )}

        {error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {loading && <p className="text-sm text-slate-500">Loading...</p>}

        {valid && !loading && !error && items && items.length === 0 && (
          <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-100">
            "{q}" ke liye koi {type === 'shops' ? 'shop' : 'product'} nahi mila. Doosra naam try karo.
          </p>
        )}

        {items && items.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {type === 'shops'
              ? items.map((s) => <ShopCard key={s.id} s={s} />)
              : items.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}

        {nextCursor && (
          <div className="flex justify-center pt-2">
            <Button onClick={loadMore} loading={loadingMore}>
              Load more
            </Button>
          </div>
        )}
      </div>
    </PageShell>
  );
}