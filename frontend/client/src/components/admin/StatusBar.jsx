const BAR = {
  PENDING: 'bg-slate-400', SEARCHING: 'bg-amber-400', ACCEPTED: 'bg-sky-400',
  ARRIVING: 'bg-indigo-500', IN_PROGRESS: 'bg-violet-500', COMPLETED: 'bg-emerald-500',
  CANCELLED: 'bg-rose-400', REJECTED: 'bg-rose-300', EXPIRED: 'bg-slate-300',
};

export default function StatusBar({ data }) {
  const rows = Object.entries(data || {}).filter(([, n]) => n > 0);
  const total = rows.reduce((a, [, n]) => a + n, 0);
  if (!total) return null;

  return (
    <section className="rounded-3xl bg-white p-5 shadow-xl shadow-indigo-100/60 ring-1 ring-slate-100 sm:p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold text-slate-800">Requests by status</h2>
        <span className="text-sm text-slate-400">{total} total</span>
      </div>
      <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-100">
        {rows.map(([k, n]) => (
          <div key={k} title={`${k}: ${n}`} style={{ width: `${(n / total) * 100}%` }} className={BAR[k] || 'bg-slate-300'} />
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">
        {rows.map(([k, n]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${BAR[k] || 'bg-slate-300'}`} />
            {k.replace(/_/g, ' ').toLowerCase()} <b className="text-slate-800">{n}</b>
          </span>
        ))}
      </div>
    </section>
  );
}