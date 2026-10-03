const COLORS = {
  PENDING: 'bg-slate-100 text-slate-700',
  SEARCHING: 'bg-amber-100 text-amber-700',
  ACCEPTED: 'bg-sky-100 text-sky-700',
  ARRIVING: 'bg-indigo-100 text-indigo-700',
  IN_PROGRESS: 'bg-violet-100 text-violet-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-rose-100 text-rose-700',
  REJECTED: 'bg-rose-100 text-rose-700',
  EXPIRED: 'bg-slate-200 text-slate-600',
  VERIFIED: 'bg-emerald-100 text-emerald-700',
  SUSPENDED: 'bg-rose-100 text-rose-700',
  OPEN: 'bg-amber-100 text-amber-700',
  REVIEWING: 'bg-sky-100 text-sky-700',
  RESOLVED: 'bg-emerald-100 text-emerald-700',
  DISMISSED: 'bg-slate-200 text-slate-600',
};

export default function StatusBadge({ status }) {
  const style = COLORS[status] || 'bg-slate-100 text-slate-700';
  const label = String(status || '').replace(/_/g, ' ');
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${style}`}
    >
      {label}
    </span>
  );
}