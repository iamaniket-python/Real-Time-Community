import { useState } from 'react';
import { rateRequest } from '../api/feedback';
import Button from './ui/Button';

export default function RatingForm({ requestId }) {
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!score) return setError('Pick a star rating first.');
    setBusy(true);
    setError('');
    try {
      await rateRequest(requestId, score, comment.trim() || undefined);
      setDone(true);
    } catch (e) {
      setError(e.message || 'Could not save your rating.');
    }
    setBusy(false);
  }

  if (done)
    return (
      <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
        Thanks for rating your helper!
      </p>
    );

  return (
    <div className="space-y-3 rounded-2xl bg-amber-50/60 p-4 ring-1 ring-amber-100">
      <p className="font-semibold text-slate-800">How was your helper?</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setScore(n)}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            className={`text-3xl transition ${n <= score ? 'text-amber-400' : 'text-slate-300 hover:text-amber-300'}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        rows={2}
        maxLength={500}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Add a comment (optional)"
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
      />
      {error && <p className="text-sm text-rose-700">{error}</p>}
      <Button loading={busy} onClick={submit}>Submit rating</Button>
    </div>
  );
}