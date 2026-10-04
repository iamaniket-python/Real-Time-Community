import { Link } from 'react-router-dom';
import Button from '../ui/Button';
import StatusBadge from '../ui/StatusBadge';

export default function HelperRow({ h, tab, actions, busy, onAsk }) {
  const u = h.user || {};
  const name = u.name || h.name || `Helper #${h.id}`;
  const email = u.email || h.email;
  const initials = name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const cats = (h.categories || []).map((c) => c.name || c).filter(Boolean);

  return (
    <li className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 transition hover:ring-indigo-200">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-md shadow-indigo-200">
          {initials || '?'}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-800">{name}</p>
          {email && <p className="truncate text-xs text-slate-500">{email}</p>}
        </div>
        <StatusBadge status={h.status || h.verificationStatus || tab} />
      </div>
      {cats.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {cats.map((c) => (
            <span key={c} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100">
              {c}
            </span>
          ))}
        </div>
      )}
      <Link
        to={`/admin/helpers/${h.id}`}
        className="mt-4 block rounded-xl bg-white px-4 py-2 text-center text-sm font-semibold text-indigo-700 ring-1 ring-indigo-100 transition hover:bg-indigo-50"
      >
        View details and documents
      </Link>
      <div className="mt-2 grid auto-cols-fr grid-flow-col gap-2 sm:flex sm:justify-end">
        {actions.map(([a, label, v]) => (
          <Button key={a} variant={v} loading={busy} onClick={() => onAsk(h, a, label, v)} className="w-full sm:w-auto">
            {label}
          </Button>
        ))}
      </div>
    </li>
  );
}