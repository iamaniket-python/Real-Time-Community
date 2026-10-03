import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { getStats } from '../../api/admin';

const ACTIVE = ['PENDING', 'SEARCHING', 'ACCEPTED', 'ARRIVING', 'IN_PROGRESS'];
const sum = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);

const tones = {
  indigo: 'bg-indigo-50 text-indigo-600',
  amber: 'bg-amber-50 text-amber-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  rose: 'bg-rose-50 text-rose-600',
};

const shortcuts = [
  { to: '/admin/helpers', icon: '🧑‍🔧', title: 'Helpers', text: 'Verify, reject ya suspend karo.', tone: 'indigo' },
  { to: '/admin/reports', icon: '🚩', title: 'Reports', text: 'Reviewing se Resolved tak.', tone: 'rose' },
  { to: '/admin/categories', icon: '🗂️', title: 'Categories', text: 'Add, rename ya deactivate karo.', tone: 'amber' },
  { to: '/admin/stats', icon: '📊', title: 'Stats', text: 'Platform ke numbers ek nazar mein.', tone: 'emerald' },
  { to: '/admin/audit', icon: '📜', title: 'Audit log', text: 'Admin actions ki poori history.', tone: 'indigo' },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    getStats()
      .then((d) => alive && setStats(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const s = stats || {};
  const pending = s.helpersByVerification?.PENDING ?? 0;
  const first = (user?.name || 'Admin').split(' ')[0];
  const loading = !stats && !failed;

  const tiles = [
    { to: '/admin/helpers', icon: '🧑‍🔧', label: 'Pending helpers', value: pending, sub: 'verification baaki', tone: 'amber' },
    {
      to: '/admin/stats', icon: '📋', label: 'Active requests',
      value: ACTIVE.reduce((a, k) => a + (s.requestsByStatus?.[k] || 0), 0),
      sub: 'abhi chal rahi hain', tone: 'indigo',
    },
    {
      to: '/admin/reports', icon: '🚩', label: 'Reports', value: sum(s.reportsByStatus),
      sub: `${s.reportsByStatus?.REVIEWING || 0} under review`, tone: 'rose',
    },
    {
      to: '/admin/stats', icon: '👥', label: 'Total users', value: sum(s.usersByRole),
      sub: `${s.usersByRole?.HELPER || 0} helpers`, tone: 'emerald',
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 p-5 text-white shadow-xl shadow-indigo-200 sm:p-7">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 left-1/3 h-32 w-32 rounded-full bg-fuchsia-300/20 blur-2xl" />
        <p className="relative text-xs font-semibold uppercase tracking-wider text-indigo-200">Admin panel</p>
        <h1 className="relative mt-1 text-xl font-bold sm:text-3xl">Welcome back, {first} 👋</h1>
        <p className="relative mt-1 text-sm text-indigo-100">Yahan se poora platform manage karo.</p>
        {s.ratings?.count > 0 && (
          <span className="relative mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            ⭐ {s.ratings.average} average · {s.ratings.count} ratings
          </span>
        )}
      </div>

      {pending > 0 && (
        <Link
          to="/admin/helpers"
          className="flex items-center gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200 transition hover:bg-amber-100"
        >
          <span className="text-xl">⏳</span>
          <span className="min-w-0 flex-1">
            <b>{pending}</b> helper{pending > 1 ? 's' : ''} verification ka intezaar kar rahe hain.
          </span>
          <span className="font-semibold">Review →</span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link
            key={t.label}
            to={t.to}
            className="rounded-3xl bg-white p-4 shadow-xl shadow-indigo-100/60 ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:ring-indigo-200 sm:p-5"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-2xl text-xl ${tones[t.tone]}`}>
              {t.icon}
            </div>
            <p className={`mt-3 text-2xl font-bold text-slate-800 sm:text-3xl ${loading ? 'animate-pulse text-slate-300' : ''}`}>
              {stats ? t.value : '—'}
            </p>
            <p className="text-sm font-medium text-slate-700">{t.label}</p>
            <p className="truncate text-xs text-slate-400">{stats ? t.sub : ' '}</p>
          </Link>
        ))}
      </div>
      {failed && (
        <p className="rounded-xl bg-slate-50 px-4 py-2.5 text-xs text-slate-500">
          Live numbers load nahi ho paaye. Neeche ke shortcuts abhi bhi kaam karenge.
        </p>
      )}

      <div>
        <h2 className="mb-3 px-1 text-sm font-semibold uppercase tracking-wider text-slate-400">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {shortcuts.map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className="group flex items-center gap-4 rounded-3xl bg-white p-4 shadow-xl shadow-indigo-100/60 ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:ring-indigo-200 sm:p-5"
            >
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ${tones[c.tone]}`}>
                {c.icon}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-slate-800">{c.title}</h3>
                <p className="truncate text-sm text-slate-500">{c.text}</p>
              </div>
              <span className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-indigo-500">→</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}