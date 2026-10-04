import { useState } from 'react';
import { saveBusiness } from '../../api/helperBusiness';
import Card from '../ui/Card';
import Button from '../ui/Button';

const cls =
  'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100';

function Field({ label, hint, ...p }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input required className={cls} {...p} />
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export default function BusinessForm({ initial, onSaved }) {
  const b = initial || {};
  const [f, setF] = useState({
    businessName: b.businessName || '',
    businessAddress: b.businessAddress || '',
    experienceYears: b.experienceYears ?? '',
    gstNumber: b.gstNumber || '',
    aadhaarNumber: '',
    panNumber: '',
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const d = await saveBusiness({
        businessName: f.businessName.trim(),
        businessAddress: f.businessAddress.trim(),
        experienceYears: Number(f.experienceYears),
        gstNumber: f.gstNumber.trim(),
        aadhaarNumber: f.aadhaarNumber.trim(),
        panNumber: f.panNumber.trim(),
      });
      onSaved?.(d.business);
      setMsg({ ok: true, text: 'Saved.' });
    } catch (err) {
      const text = err.details?.length
        ? err.details.map((x) => `${x.field}: ${x.message}`).join(' | ')
        : err.message || 'Could not save.';
      setMsg({ ok: false, text });
    }
    setBusy(false);
  }

  return (
    <Card title="Business details">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Shop / business name" value={f.businessName} onChange={set('businessName')} />
        <Field label="Shop address" value={f.businessAddress} onChange={set('businessAddress')} />
        <Field label="Years of experience" type="number" min="0" max="60" value={f.experienceYears} onChange={set('experienceYears')} />
        <Field label="GST number" value={f.gstNumber} onChange={set('gstNumber')} placeholder="22AAAAA0000A1Z5" />
        <Field label="Aadhaar number" inputMode="numeric" value={f.aadhaarNumber} onChange={set('aadhaarNumber')}
          placeholder="12 digits" hint={b.aadhaarMasked ? `Saved: ${b.aadhaarMasked}. Enter again to save changes.` : ''} />
        <Field label="PAN number" value={f.panNumber} onChange={set('panNumber')}
          placeholder="ABCDE1234F" hint={b.panMasked ? `Saved: ${b.panMasked}. Enter again to save changes.` : ''} />
        {msg && (
          <p className={`rounded-xl px-4 py-3 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            {msg.text}
          </p>
        )}
        <Button type="submit" loading={busy} className="w-full">Save business details</Button>
      </form>
    </Card>
  );
}