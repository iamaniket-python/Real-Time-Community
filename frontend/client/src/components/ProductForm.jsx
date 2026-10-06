import { useState } from 'react';
import { api } from '../api/client';
import Button from './ui/Button';
import { paiseToRupees, rupeesToPaise } from '../utils/money';

const input =
  'mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100';

// product = null creates a new product, otherwise edits it. onDone gets the saved product.
export default function ProductForm({ product, onDone, onCancel }) {
  const [form, setForm] = useState({
    name: product?.name ?? '',
    description: product?.description ?? '',
    price: product ? paiseToRupees(product.pricePaise) : '',
    stock: product ? String(product.stock) : '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    const pricePaise = rupeesToPaise(form.price);
    if (pricePaise === null || pricePaise < 1 || pricePaise > 100_000_000) {
      setError('Enter a price from 0.01 to 10,00,000 rupees (up to 2 decimals)');
      return;
    }
    if (!/^\d+$/.test(form.stock.trim()) || Number(form.stock) > 1_000_000) {
      setError('Stock must be a whole number from 0 to 1,000,000');
      return;
    }

    const body = { name: form.name.trim(), pricePaise, stock: Number(form.stock) };
    const description = form.description.trim();
    if (product) body.description = description; // empty text clears it
    else if (description) body.description = description;

    setBusy(true);
    try {
      const d = product
        ? await api(`/sellers/me/products/${product.id}`, { method: 'PATCH', body })
        : await api('/sellers/me/products', { method: 'POST', body });
      onDone(d.product);
    } catch (err) {
      const det = err.details?.map((x) => x.message).join(', ');
      setError(det || err.message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-medium text-slate-700">Product name
        <input className={input} value={form.name} onChange={set('name')} minLength={2} maxLength={120} required />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Description <span className="font-normal text-slate-400">(optional)</span>
        <textarea className={input} rows={3} maxLength={2000} value={form.description} onChange={set('description')} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium text-slate-700">Price (₹)
          <input className={input} inputMode="decimal" placeholder="199.50" value={form.price} onChange={set('price')} required />
        </label>
        <label className="block text-sm font-medium text-slate-700">Stock
          <input className={input} inputMode="numeric" placeholder="10" value={form.stock} onChange={set('stock')} required />
        </label>
      </div>
      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}
      <div className="flex gap-3">
        <Button type="submit" loading={busy}>{product ? 'Save changes' : 'Add product'}</Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}