import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import PageShell from '../../components/ui/PageShell';
import Button from '../../components/ui/Button';
import { assetUrl } from '../seller/sellerShape';

const rupees = (paise) => `₹${(paise / 100).toFixed(2)}`;
const day = (t) => new Date(t).toLocaleDateString('en-IN', { dateStyle: 'medium' });
const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

export default function ShopPage() {
  const { id } = useParams();
  const [shop, setShop] = useState(null);
  const [photo, setPhoto] = useState(0);
  const [products, setProducts] = useState([]);
  const [pCursor, setPCursor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [rCursor, setRCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pBusy, setPBusy] = useState(false);
  const [rBusy, setRBusy] = useState(false);
  const [error, setError] = useState('');

  const page = useCallback((kind, cursor) => {
    const qs = new URLSearchParams({ limit: '20' });
    if (cursor) qs.set('cursor', cursor);
    return api(`/shops/${id}/${kind}?${qs.toString()}`);
  }, [id]);

  useEffect(() => {
    let stale = false;
    setLoading(true);
    setError('');
    Promise.all([api(`/shops/${id}`), page('products', null), page('reviews', null)])
      .then(([s, p, r]) => {
        if (stale) return;
        setShop(s.shop);
        setProducts(p.items);
        setPCursor(p.nextCursor);
        setReviews(r.items);
        setRCursor(r.nextCursor);
      })
      .catch((e) => !stale && setError(e.message))
      .finally(() => !stale && setLoading(false));
    return () => { stale = true; };
  }, [id, page]);

  const more = async (kind) => {
    const isP = kind === 'products';
    (isP ? setPBusy : setRBusy)(true);
    try {
      const d = await page(kind, isP ? pCursor : rCursor);
      if (isP) { setProducts((v) => [...v, ...d.items]); setPCursor(d.nextCursor); }
      else { setReviews((v) => [...v, ...d.items]); setRCursor(d.nextCursor); }
    } catch (e) {
      setError(e.message);
    } finally {
      (isP ? setPBusy : setRBusy)(false);
    }
  };

  if (loading) return <PageShell title="Shop"><p className="text-sm text-slate-500">Loading...</p></PageShell>;
  if (!shop) {
    return (
      <PageShell title="Shop">
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || 'Shop nahi mili'}
        </p>
        <Link to="/shops" className="mt-3 inline-block text-sm font-semibold text-indigo-700">← Nearby shops</Link>
      </PageShell>
    );
  }

  const big = assetUrl(shop.gallery[photo]?.url);

  return (
    <PageShell title={shop.shopName} subtitle={shop.address}>
      <div className="space-y-5">
        <Link to="/shops" className="text-sm font-semibold text-indigo-700">← Nearby shops</Link>

        {error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        <div className="overflow-hidden rounded-3xl bg-white shadow-xl shadow-indigo-100/60 ring-1 ring-slate-100">
          <div className="flex h-56 items-center justify-center bg-linear-to-br from-indigo-50 to-violet-50">
            {big ? <img src={big} alt={shop.shopName} className="h-full w-full object-cover" /> : <span className="text-sm text-slate-400">No photo</span>}
          </div>
          {shop.gallery.length > 1 && (
            <div className="flex gap-2 overflow-x-auto p-3">
              {shop.gallery.map((g, i) => (
                <button key={g.id} onClick={() => setPhoto(i)} className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl ring-2 ${i === photo ? 'ring-indigo-500' : 'ring-transparent'}`}>
                  <img src={assetUrl(g.url)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          <div className="space-y-2 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Verified</span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${shop.isOpen ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                {shop.isOpen ? 'Open now' : 'Closed'}
              </span>
              <span className="text-sm text-slate-600">
                {shop.ratingCount > 0 ? `★ ${shop.ratingAvg.toFixed(1)} (${shop.ratingCount} reviews)` : 'No reviews yet'}
              </span>
            </div>
            {shop.description && <p className="text-sm text-slate-600">{shop.description}</p>}
          </div>
        </div>

        <section>
          <h2 className="mb-3 text-lg font-bold text-slate-800">Products</h2>
          {products.length === 0 ? (
            <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-100">Abhi koi product nahi hai.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {products.map((p) => {
                const img = assetUrl(p.imageUrl);
                return (
                  <div key={p.id} className="flex gap-4 rounded-3xl bg-white p-4 shadow-xl shadow-indigo-100/60 ring-1 ring-slate-100">
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-100">
                      {img ? <img src={img} alt={p.name} className="h-full w-full object-cover" /> : <span className="text-xs text-slate-400">No image</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-bold text-slate-800">{p.name}</h3>
                      <p className="text-sm font-semibold text-indigo-700">{rupees(p.pricePaise)}</p>
                      <p className={`text-xs ${p.inStock ? 'text-slate-500' : 'text-red-500'}`}>{p.inStock ? `In stock: ${p.stock}` : 'Out of stock'}</p>
                      {p.description && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{p.description}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {pCursor && (
            <div className="mt-3 text-center"><Button variant="secondary" loading={pBusy} onClick={() => more('products')}>Load more products</Button></div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold text-slate-800">Reviews</h2>
          {reviews.length === 0 ? (
            <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-100">Abhi koi review nahi hai.</p>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-500">{stars(r.rating)}</span>
                    <span className="text-xs text-slate-400">{day(r.created_at)}</span>
                  </div>
                  {r.comment && <p className="mt-1 text-sm text-slate-600">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
          {rCursor && (
            <div className="mt-3 text-center"><Button variant="secondary" loading={rBusy} onClick={() => more('reviews')}>Load more reviews</Button></div>
          )}
        </section>
      </div>
    </PageShell>
  );
}