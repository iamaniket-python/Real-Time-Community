import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import PageShell from '../../components/ui/PageShell';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { assetUrl } from './sellerShape';

const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;
const EMPTY = { name: '', description: '', price: '', stock: '' };
const rupees = (paise) => `₹${(paise / 100).toFixed(2)}`;

// returns an error text, or '' if the file is fine
const checkImage = (file) => {
  if (!OK_TYPES.includes(file.type)) return 'Only JPEG, PNG or WebP images are allowed';
  if (file.size > MAX_BYTES) return 'Image must be 5 MB or smaller';
  return '';
};

export default function SellerProducts() {
  const [verified, setVerified] = useState(null);
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [moreBusy, setMoreBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [file, setFile] = useState(null);
  const [fileKey, setFileKey] = useState(0);

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const fetchPage = useCallback(async (cursor) => {
    const qs = `limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    return api(`/sellers/me/products?${qs}`);
  }, []);

  useEffect(() => {
    Promise.all([api('/sellers/me'), fetchPage(null)])
      .then(([s, p]) => {
        setVerified(s.seller.verification === 'VERIFIED');
        setItems(p.items);
        setNextCursor(p.nextCursor);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [fetchPage]);

  const loadMore = async () => {
    setMoreBusy(true);
    try {
      const p = await fetchPage(nextCursor);
      setItems((prev) => [...prev, ...p.items]);
      setNextCursor(p.nextCursor);
    } catch (e) {
      setError(e.message);
    } finally {
      setMoreBusy(false);
    }
  };

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const clearFile = () => { setFile(null); setFileKey((k) => k + 1); };
  const resetForm = () => { setForm(EMPTY); setEditingId(null); clearFile(); };

  const pickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const bad = checkImage(f);
    if (bad) {
      setError(bad);
      clearFile();
      return;
    }
    setError('');
    setFile(f);
  };

  const sendImage = (productId, f) => {
    const fd = new FormData();
    fd.append('file', f);
    return api(`/sellers/me/products/${productId}/image`, { method: 'POST', form: fd });
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description || '',
      price: (p.pricePaise / 100).toString(),
      stock: String(p.stock),
    });
    clearFile();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setNotice('');
    const name = form.name.trim();
    const pricePaise = Math.round(Number(form.price) * 100);
    const stock = Number(form.stock);
    if (name.length < 2) return setError('Name must be at least 2 characters');
    if (!Number.isFinite(pricePaise) || pricePaise < 1) return setError('Enter a valid price (at least ₹0.01)');
    if (!Number.isInteger(stock) || stock < 0) return setError('Stock must be a whole number (0 or more)');
    const body = { name, pricePaise, stock };
    const desc = form.description.trim();
    if (editingId || desc) body.description = desc;

    setSaving(true);
    try {
      const wasEditing = !!editingId;
      const d = wasEditing
        ? await api(`/sellers/me/products/${editingId}`, { method: 'PATCH', body })
        : await api('/sellers/me/products', { method: 'POST', body });
      let product = d.product;

      // product is saved by now; an image failure must not hide that
      let imgErr = '';
      if (file) {
        try {
          product = (await sendImage(product.id, file)).product;
        } catch (err) {
          imgErr = err.message;
        }
      }

      setItems((prev) => (wasEditing
        ? prev.map((x) => (x.id === product.id ? product : x))
        : [product, ...prev]));
      if (imgErr) {
        setError(`Product save ho gaya, par image upload nahi hui: ${imgErr}. Card pe "Add image" se dobara try karo.`);
      } else {
        setNotice(wasEditing ? 'Product updated' : 'Product added');
      }
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p) => {
    setError(''); setNotice(''); setBusyId(p.id);
    try {
      const d = await api(`/sellers/me/products/${p.id}`, { method: 'PATCH', body: { isActive: !p.isActive } });
      setItems((prev) => prev.map((x) => (x.id === p.id ? d.product : x)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.name}"?`)) return;
    setError(''); setNotice(''); setBusyId(p.id);
    try {
      const r = await api(`/sellers/me/products/${p.id}`, { method: 'DELETE' });
      if (r.deleted) {
        setItems((prev) => prev.filter((x) => x.id !== p.id));
        if (editingId === p.id) resetForm();
      } else {
        setItems((prev) => prev.map((x) => (x.id === p.id ? { ...x, isActive: false } : x)));
        setNotice('Ye product purane orders mein hai, isliye delete nahi hua. Sirf hide kar diya.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  };

  const uploadImage = async (p, f) => {
    if (!f) return;
    setError(''); setNotice('');
    const bad = checkImage(f);
    if (bad) return setError(bad);
    setBusyId(p.id);
    try {
      const d = await sendImage(p.id, f);
      setItems((prev) => prev.map((x) => (x.id === p.id ? d.product : x)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  };

  const input = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';

  return (
    <PageShell title="Products" subtitle="Apni shop ke products add aur manage karo.">
      <div className="space-y-4">
        {error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}
        {notice && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>
        )}
        {verified === false && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Product add karne ke liye pehle shop verify hona zaroori hai. Profile aur documents poore karo, phir admin verify karega.
          </p>
        )}

        <Card title={editingId ? 'Edit product' : 'Add product'}>
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
            <input className={input} placeholder="Product name" maxLength={120} value={form.name} onChange={setField('name')} />
            <div className="grid grid-cols-2 gap-3">
              <input className={input} placeholder="Price (₹)" inputMode="decimal" value={form.price} onChange={setField('price')} />
              <input className={input} placeholder="Stock" inputMode="numeric" value={form.stock} onChange={setField('stock')} />
            </div>
            <textarea className={`${input} md:col-span-2`} rows={3} maxLength={2000} placeholder="Description (optional)" value={form.description} onChange={setField('description')} />

            <div className="flex items-center gap-3 md:col-span-2">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-100">
                {preview ? <img src={preview} alt="Preview" className="h-full w-full object-cover" /> : <span className="text-xs text-slate-400">No image</span>}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap gap-2">
                  <label className="cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50">
                    {file ? 'Change image' : editingId ? 'New image (optional)' : 'Choose image (optional)'}
                    <input
                      key={fileKey}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={saving}
                      onChange={pickFile}
                    />
                  </label>
                  {file && (
                    <button type="button" onClick={clearFile} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500">JPEG, PNG ya WebP, max 5 MB. Ek product ki ek image.</p>
              </div>
            </div>

            <div className="flex gap-2 md:col-span-2">
              <Button type="submit" loading={saving} disabled={!editingId && verified === false}>
                {editingId ? 'Save changes' : 'Add product'}
              </Button>
              {editingId && (
                <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>
              )}
            </div>
          </form>
        </Card>

        {loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : items.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-100">Abhi koi product nahi hai.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((p) => {
              const busy = busyId === p.id;
              const img = assetUrl(p.imageUrl);
              return (
                <div key={p.id} className="flex gap-4 rounded-3xl bg-white p-4 shadow-xl shadow-indigo-100/60 ring-1 ring-slate-100">
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-100">
                    {img ? <img src={img} alt={p.name} className="h-full w-full object-cover" /> : <span className="text-xs text-slate-400">No image</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate font-bold text-slate-800">{p.name}</h3>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${p.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {p.isActive ? 'Visible' : 'Hidden'}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-indigo-700">{rupees(p.pricePaise)}</p>
                    <p className="text-xs text-slate-500">{p.inStock ? `Stock: ${p.stock}` : 'Out of stock'}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                      <button disabled={busy} onClick={() => startEdit(p)} className="rounded-lg px-3 py-1.5 text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50 disabled:opacity-50">Edit</button>
                      <button disabled={busy} onClick={() => toggleActive(p)} className="rounded-lg px-3 py-1.5 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50">
                        {p.isActive ? 'Hide' : 'Show'}
                      </button>
                      <label className={`rounded-lg px-3 py-1.5 text-slate-600 ring-1 ring-slate-200 ${busy ? 'opacity-50' : 'cursor-pointer hover:bg-slate-50'}`}>
                        {busy ? 'Wait...' : img ? 'Change image' : 'Add image'}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          disabled={busy}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.target.value = '';
                            uploadImage(p, f);
                          }}
                        />
                      </label>
                      <button disabled={busy} onClick={() => remove(p)} className="rounded-lg px-3 py-1.5 text-red-600 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-50">Delete</button>
                    </div>
                  </div>
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