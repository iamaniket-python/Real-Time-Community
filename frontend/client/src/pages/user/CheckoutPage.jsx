import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import PageShell from '../../components/ui/PageShell';
import Button from '../../components/ui/Button';

const rupees = (paise) => `₹${(paise / 100).toFixed(2)}`;
const SRC = 'https://checkout.razorpay.com/v1/checkout.js';

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = SRC;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function CheckoutPage() {
  const [cart, setCart] = useState(null);
  const [fulfillment, setFulfillment] = useState('PICKUP');
  const [address, setAddress] = useState('');
  const [pending, setPending] = useState(null); // order created, payment not finished
  const [paidId, setPaidId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const keyRef = useRef(crypto.randomUUID());

  useEffect(() => {
    api('/cart').then((d) => setCart(d.cart)).catch((e) => setError(e.message));
  }, []);

  const openPayment = async (p) => {
    const ok = await loadRazorpay();
    if (!ok) {
      setError('Payment window load nahi hui. Internet check karke dobara try karo.');
      return;
    }
    const rzp = new window.Razorpay({
      key: p.payment.keyId,
      amount: p.payment.amountPaise,
      currency: p.payment.currency,
      order_id: p.payment.gatewayOrderId,
      name: 'HelpNow',
      description: `Order ${p.order.id.slice(0, 8)}`,
      theme: { color: '#4f46e5' },
      handler: async (resp) => {
        setBusy(true);
        try {
          const r = await api(`/orders/${p.order.id}/verify`, {
            method: 'POST',
            body: { paymentId: resp.razorpay_payment_id, signature: resp.razorpay_signature },
          });
          if (r.paid) {
            setPaidId(p.order.id);
            setPending(null);
          } else {
            setError('Payment verify nahi hui. Agar paise kate hain to My orders check karo.');
          }
        } catch (e) {
          setError(`${e.message}. Agar paise kate hain to My orders check karo.`);
        } finally {
          setBusy(false);
        }
      },
      modal: {
        ondismiss: () =>
          setError('Payment poori nahi hui. Order 15 minute tak hold rehta hai, "Pay now" se dobara try karo.'),
      },
    });
    rzp.on('payment.failed', (r) => setError(r?.error?.description || 'Payment fail ho gayi'));
    rzp.open();
  };

  const startCheckout = async () => {
    setError('');
    const addr = address.trim();
    if (fulfillment === 'DELIVERY' && addr.length < 5) {
      return setError('Delivery ke liye address likho (kam se kam 5 characters)');
    }
    const body = { fulfillment, idempotencyKey: keyRef.current };
    if (fulfillment === 'DELIVERY') body.deliveryAddress = addr;
    setBusy(true);
    try {
      const d = await api('/orders/checkout', { method: 'POST', body });
      setPending(d);
      setBusy(false);
      await openPayment(d);
    } catch (e) {
      // a server rejection means a fresh attempt; no status = network trouble, keep the key
      if (e.status) keyRef.current = crypto.randomUUID();
      setError(e.message);
      setBusy(false);
    }
  };

  const empty = cart && cart.items.length === 0;

  if (paidId) {
    return (
      <PageShell title="Payment successful">
        <div className="rounded-3xl bg-white p-6 text-center shadow-xl shadow-indigo-100/60 ring-1 ring-slate-100">
          <p className="text-lg font-bold text-emerald-700">Order place ho gaya 🎉</p>
          <p className="mt-1 text-sm text-slate-500">Order #{paidId.slice(0, 8)}. Shop ko aapka order mil gaya hai.</p>
          <Link to="/shops" className="mt-4 inline-block text-sm font-semibold text-indigo-700">Aur shops dekho →</Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Checkout" subtitle={cart?.shop ? `Shop: ${cart.shop.name}` : ''}>
      <div className="space-y-4">
        {error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        {pending && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-amber-50 p-5 ring-1 ring-amber-200">
            <div>
              <p className="font-semibold text-amber-900">Order #{pending.order.id.slice(0, 8)} payment ka wait kar raha hai</p>
              <p className="text-sm text-amber-800">Total {rupees(pending.order.totalPaise)}</p>
            </div>
            <Button loading={busy} onClick={() => openPayment(pending)}>Pay now</Button>
          </div>
        )}

        {!cart && !error && <p className="text-sm text-slate-500">Loading...</p>}

        {empty && !pending && (
          <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-100">
            <p className="text-sm text-slate-500">Cart khaali hai.</p>
            <Link to="/shops" className="mt-2 inline-block text-sm font-semibold text-indigo-700">Nearby shops dekho →</Link>
          </div>
        )}

        {cart && !empty && !pending && (
          <>
            <div className="rounded-3xl bg-white p-5 shadow-xl shadow-indigo-100/60 ring-1 ring-slate-100">
              <ul className="space-y-1 text-sm">
                {cart.items.map((it) => (
                  <li key={it.productId} className="flex justify-between gap-2">
                    <span className="text-slate-700">{it.name} × {it.quantity}</span>
                    <span className="text-slate-600">{rupees(it.linePaise)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-lg font-extrabold text-slate-800">
                <span>Total</span><span>{rupees(cart.totalPaise)}</span>
              </p>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-xl shadow-indigo-100/60 ring-1 ring-slate-100">
              <p className="mb-2 text-sm font-semibold text-slate-700">Order kaise lena hai?</p>
              <div className="flex gap-2">
                {[['PICKUP', 'Pickup'], ['DELIVERY', 'Delivery']].map(([v, l]) => (
                  <button
                    key={v}
                    onClick={() => setFulfillment(v)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      fulfillment === v ? 'bg-indigo-600 text-white' : 'text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              {fulfillment === 'DELIVERY' && (
                <textarea
                  rows={3}
                  maxLength={300}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Delivery address"
                  className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Link to="/cart" className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">← Cart</Link>
              <Button loading={busy} disabled={!cart.canCheckout} onClick={startCheckout}>
                Pay {rupees(cart.totalPaise)}
              </Button>
            </div>
            {!cart.canCheckout && (
              <p className="text-right text-xs text-red-600">Cart mein koi item available nahi ya shop band hai. Cart page pe check karo.</p>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}