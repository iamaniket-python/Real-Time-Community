import { Link } from 'react-router-dom';
import Card from '../ui/Card';

export default function ProfileChecklist({ profile, verified }) {
  const items = [
    { ok: profile.businessComplete, label: 'Business details', to: '/helper/profile', fix: 'Fill in' },
    { ok: profile.documentsComplete, label: 'Aadhaar, PAN and shop photo', to: '/helper/profile', fix: 'Upload' },
    { ok: (profile.categories || []).length > 0, label: 'Services you offer', fix: 'Pick below' },
    { ok: verified, label: 'Admin verification', fix: 'Waiting for admin' },
  ];
  const done = items.filter((i) => i.ok).length;
  if (done === items.length) return null;

  return (
    <Card title="Get ready to go online">
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all"
          style={{ width: `${(done / items.length) * 100}%` }}
        />
      </div>
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.label} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
              i.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {i.ok ? '✓' : '!'}
            </span>
            <span className={`min-w-0 flex-1 text-sm ${i.ok ? 'text-slate-400 line-through' : 'font-medium text-slate-800'}`}>
              {i.label}
            </span>
            {!i.ok && (i.to ? (
              <Link to={i.to} className="shrink-0 text-sm font-semibold text-indigo-600 hover:text-indigo-500">
                {i.fix} →
              </Link>
            ) : (
              <span className="shrink-0 text-xs text-slate-400">{i.fix}</span>
            ))}
          </li>
        ))}
      </ul>
    </Card>
  );
}