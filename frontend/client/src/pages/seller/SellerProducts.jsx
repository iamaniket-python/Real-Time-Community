import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import PageShell from '../../components/ui/PageShell';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import ProductForm from '../../components/ProductForm';
import { assetUrl } from './sellerShape';
import { formatPaise } from '../../utils/money';

const PAGE = 20;
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

export default function SellerProducts() {
  const [verified, setVerified] = useState(null);
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [editing, setEditing] = useState(null); // null | 'new' | a product id
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    Promise.all([api('/sellers/me'), api(`/sellers/me/products?limit=${PAGE}`)])
      .then(([s, p]) => {
        setVerified(s.seller.verification === 'VERIFIED');
        setItems(p.items);
        setNextCursor(p.nextCursor);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const replace = (p) => setItems((list) => list.map((x) => (x.id === p.id ? p : x)));

  const saved = (product) => {
    if (editing === 'new') setItems((list) => [product, ...list]);
    else replace(product);
    setEditing(null);
  };

  const run = async (id, fn) => {
    setError('');
    setNotice('');
    setBusyId(id);
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId('');
    }
  };

  const loadMore = async () => {
    setError('');
    setMore(true);
    try {
      const d = await api(`/sellers/me/products?limit=${PAGE}&cursor=${encodeURIComponent(nextCursor)}`);
      setItems((list) => [...list, ...d.items]);
      setNextCursor(d.nextCursor);
    } catch (e) {
      setError(e.message);
    } finally {
      setMore(false);
    }
  };

  const toggle = (p) =>
    run(p.id, async () => {
      const d = await api(`/sellers/me/products/${p.id}`, { method: 'PATCH', body: { isActive: !p.isActive } });
      replace(d.product);
    });

  const remove = (p) => {
    if (!window.confirm(`Delete "${p.name}"?`)) return;
    run(p.id, async () => {
      const d = await api(`/sellers/me/products/${p.id}`, { method: 'DELETE' });
      if (d.hidden) {
        replace({ ...p, isActive: false });
        setNotice('This product is part of past orders, so it was hidden instead of deleted.');
      } else {
        setItems((list) => list.filter((x) => x.id !== p.id));
      }
    });
  };

  const upload = (p, file) => {
    if (!file) return;
    if (!OK_TYPES.includes(file.type)) {
      setError('Only JPEG, PNG or WebP images are allowed');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Image must be 5 MB or smaller');
      return;
    }
    run(p.id, async () => {
      const form = new FormData();
      form.append('file', file);
      const d = await api(`/sellers/me/products/${p.id}/image`, { method: 'POST', form });
      replace(d.product);
    });
  };

  return (
    <PageShell
      title="Products"
      subtitle="What your shop sells."
      action={
        <Button
          variant="secondary"
          disabled={!verified || editing !== null}
          onClick={() => {
            setNotice('');
            setEditing('new');
          }}
        >
          Add product
        </Button>
      }
    >
      <div className="space-y-4">
        {verified === false && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Your shop must be verified by an admin before you can add products.
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}
        {notice && (
          <p className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">{notice}</p>
        )}

        {editing === 'new' && (
          <Card title="New product">
            <ProductForm onDone={saved} onCancel={() => setEditing(null)} />
          </Card>
        )}

        {loading && <Card><p className="text-sm text-slate-500">Loading...</p></Card>}
        {!loading && items.length === 0 && editing !== 'new' && (
          <Card><p className="text-sm text-slate-500">No products yet.</p></Card>
        )}

        {items.map((p) => (
          <Card key={p.id}>
            {editing === p.id ? (
              <ProductForm product={p} onDone={saved} onCancel={() => setEditing(null)} />
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-100">
                  {p.imageUrl ? (
                    <img src={assetUrl(p.imageUrl)} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-xs text-slate-400">No image</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-semibold text-slate-900">{p.name}</h3>
                    {!p.isActive && (
                      <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">Hidden</span>
                    )}
                    {!p.inStock && (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Out of stock</span>
                    )}
                  </div>
                  <p className="mt-1 text-lg font-bold text-indigo-700">{formatPaise(p.pricePaise)}</p>
                  <p className="text-sm text-slate-500">Stock: {p.stock}</p>
                  {p.description && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{p.description}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button variant="secondary" disabled={busyId === p.id || editing !== null} onClick={() => setEditing(p.id)}>
                      Edit
                    </Button>
                    <Button variant="ghost" loading={busyId === p.id} onClick={() => toggle(p)}>
                      {p.isActive ? 'Hide' : 'Show'}
                    </Button>
                    <Button variant="danger" disabled={busyId === p.id} onClick={() => remove(p)}>
                      Delete
                    </Button>
                    <label
                      className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                        busyId === p.id
                          ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                          : 'cursor-pointer bg-white text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50'
                      }`}
                    >
                      {p.imageUrl ? 'Change image' : 'Add image'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        disabled={busyId === p.id}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = '';
                          upload(p, f);
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </Card>
        ))}

        {nextCursor && (
          <div className="text-center">
            <Button variant="secondary" loading={more} onClick={loadMore}>Load more</Button>
          </div>
        )}
      </div>
    </PageShell>
  );
}