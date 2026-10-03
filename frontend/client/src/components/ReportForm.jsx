import { useState } from 'react';
import { reportRequest } from '../api/feedback';
import Button from './ui/Button';

const REASONS = [
  ['HARASSMENT', 'Harassment'],
  ['FRAUD', 'Fraud'],
  ['UNSAFE_BEHAVIOR', 'Unsafe behavior'],
  ['NO_SHOW', 'Helper did not show up'],
  ['INAPPROPRIATE_CONTENT', 'Inappropriate content'],
  ['OTHER', 'Something else'],
];

export default function ReportForm({ requestId }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!reason) return setError('Choose a reason.');
    setBusy(true);
    setError('');
    try {
      await reportRequest(requestId, reason, details.trim() || undefined);
      setDone(true);
    } catch (e) {
      setError(e.message || 'Could not send the report.');
    }
    setBusy(false);
  }

  if (done)
    return <p className="text-sm text-emerald-700">Report sent. Our team will review it.</p>;
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm font-medium text-slate-500 underline hover:text-rose-600">
        Report a problem
      </button>
    );

  return (
    <div className="space-y-3 rounded-2xl bg-rose-50/60 p-4 ring-1 ring-rose-100">
      <p className="font-semibold text-slate-800">Report a problem</p>
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-indigo-400"
      >
        <option value="">Choose a reason…</option>
        {REASONS.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
      <textarea
        rows={3}
        maxLength={1000}
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        placeholder="What happened? (optional)"
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
      />
      {error && <p className="text-sm text-rose-700">{error}</p>}
      <div className="flex gap-2">
        <Button variant="danger" loading={busy} onClick={submit}>Send report</Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}