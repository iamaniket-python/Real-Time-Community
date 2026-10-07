import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import PageShell from '../../components/ui/PageShell';
import Button from '../../components/ui/Button';
import { assetUrl } from '../seller/sellerShape';

const rupees = (paise) => `₹${(paise / 100).toFixed(2)}`;

export default function CartPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    api('/cart')
      .then((d) => setCart(d.cart))
      .catch((e) => setError(e.message));
  }, []);

  const setQty = async (productId, quantity) => {
    setError('');
    setBusyId(productId);
    try {
      const d = await api('/cart/items', { method: 'PUT', body: { productId, quantity } });
      setCart(d.cart);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId('');
    }
  };

  const remove = async (productId) => {
    setError('');
    setBusyId(productId);
    try {
      const d = await api(`/cart/items/${productId}`, { method: 'DELETE' });
      setCart(d.cart);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId('');
    }
  };

  const clear = async () => {
    if (!window.confirm('Poora cart khaali karein?')) return;
    setError('');
    setClearing(true);
    try {
      const d = await api('/cart', { method: 'DELETE' });
      setCart(d.cart);
    } catch (e) {
      setError(e.message);
    } finally {
      setClearing(false);
    }
  };

  const empty = cart && cart.items.length === 0;

  return (
    <PageShell title="Your cart" subtitle={cart?.shop ? `Shop: ${cart.shop.name}` : 'Ek cart mein ek hi shop ke items ho sakte hain.'}>
      <div className="space-y-4">
        {error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        {!cart && !error && <p className="text-sm text-slate-500">Loading...</p>}

        {empty && (
          <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-100">
            <p className="text-sm text-slate-500">Cart khaali hai.</p>
            <Link to="/shops" className="mt-2 inline-block text-sm font-semibold text-indigo-700">Nearby shops dekho →</Link>
          </div>
        )}

        {cart && !empty && (
          <>
            {cart.shop && !cart.shop.isOpen && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Ye shop abhi band hai, isliye checkout nahi ho sakta.
              </p>
            )}

            <div className="space-y-3">
              {cart.items.map((it) => {
                const img = assetUrl(it.imageUrl);
                const busy = busyId === it.productId;
                return (
                  <div key={it.productId} className="flex gap-4 rounded-3xl bg-white p-4 shadow-xl shadow-indigo-100/60 ring-1 ring-slate-100">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-100">
                      {img ? <img src={img} alt={it.name} className="h-full w-full object-cover" /> : <span className="text-xs text-slate-400">No image</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-bold text-slate-800">{it.name}</h3>
                      <p className="text-sm text-slate-600">{rupees(it.pricePaise)} × {it.quantity} = <span className="font-semibold text-indigo-700">{rupees(it.linePaise)}</span></p>
                      {!it.available && (
                        <p className="text-xs font-semibold text-red-600">Ye item abhi available nahi hai (stock kam ya hidden). Quantity kam karo ya hata do.</p>
                      )}
                      <div className="mt-2 flex items-center gap-2 text-sm font-semibold">
                        <button disabled={busy} onClick={() => setQty(it.productId, it.quantity - 1)} className="h-8 w-8 rounded-lg ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50">−</button>
                        <span className="w-6 text-center">{it.quantity}</span>
                        <button disabled={busy || it.quantity >= 99} onClick={() => setQty(it.productId, it.quantity + 1)} className="h-8 w-8 rounded-lg ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50">+</button>
                        <button disabled={busy} onClick={() => remove(it.productId)} className="ml-2 rounded-lg px-3 py-1.5 text-xs text-red-600 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-50">Remove</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white p-5 shadow-xl shadow-indigo-100/60 ring-1 ring-slate-100">
              <div>
                <p className="text-xs text-slate-500">Total</p>
                <p className="text-2xl font-extrabold text-slate-800">{rupees(cart.totalPaise)}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" loading={clearing} onClick={clear}>Clear cart</Button>
                <Button disabled={!cart.canCheckout} onClick={() => navigate('/checkout')}>Checkout</Button>
              </div>
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}