import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { getStats } from '../../api/admin';
import StatTile from '../../components/admin/StatTile';
import QuickAction from '../../components/admin/QuickAction';

const ACTIVE = ['PENDING', 'SEARCHING', 'ACCEPTED', 'ARRIVING', 'IN_PROGRESS'];
const sum = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);
const BAR = {
  PENDING: 'bg-slate-400', SEARCHING: 'bg-amber-400', ACCEPTED: 'bg-sky-400',
  ARRIVING: 'bg-indigo-500', IN_PROGRESS: 'bg-violet-500', COMPLETED: 'bg-emerald-500',
  CANCELLED: 'bg-rose-400', REJECTED: 'bg-rose-300', EXPIRED: 'bg-slate-300',
};
const ACTIONS = [
  { to: '/admin/helpers', icon: '🧑‍🔧', title: 'Helpers', text: 'Verify, reject or suspend', grad: 'from-indigo-500 to-violet-600' },
  { to: '/admin/reports', icon: '🚩', title: 'Reports', text: 'From reviewing to resolved', grad: 'from-rose-500 to-pink-600' },
  { to: '/admin/categories', icon: '🗂️', title: 'Categories', text: 'Add, rename or deactivate', grad: 'from-amber-400 to-orange-500' },
  { to: '/admin/stats', icon: '📊', title: 'Stats', text: 'Platform numbers at a glance', grad: 'from-emerald-500 to-teal-600' },
  { to: '/admin/audit', icon: '📜', title: 'Audit log', text: 'Full history of admin actions', grad: 'from-fuchsia-500 to-purple-600' },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    getStats().then((d) => alive && setStats(d.stats || d)).catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const s = stats || {};
  const loading = !stats && !failed;
  const pending = s.helpersByVerification?.PENDING ?? 0;
  const first = (user?.name || 'Admin').split(' ')[0];
  const h = new Date().getHours();
  const hello = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const date = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  const byStatus = Object.entries(s.requestsByStatus || {}).filter(([, n]) => n > 0);
  const total = sum(s.requestsByStatus);

  const tiles = [
    { to: '/admin/helpers', icon: '🧑‍🔧', label: 'Pending helpers', value: pending, sub: 'waiting for verification', grad: 'from-amber-400 to-orange-500' },
    { to: '/admin/stats', icon: '📋', label: 'Active requests', value: ACTIVE.reduce((a, k) => a + (s.requestsByStatus?.[k] || 0), 0), sub: 'in progress right now', grad: 'from-indigo-500 to-violet-600' },
    { to: '/admin/reports', icon: '🚩', label: 'Reports', value: sum(s.reportsByStatus), sub: `${s.reportsByStatus?.REVIEWING || 0} under review`, grad: 'from-rose-500 to-pink-600' },
    { to: '/admin/stats', icon: '👥', label: 'Total users', value: sum(s.usersByRole), sub: `${s.usersByRole?.HELPER || 0} helpers`, grad: 'from-emerald-500 to-teal-600' },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:space-y-6 sm:py-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white shadow-2xl shadow-indigo-300/50 sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-fuchsia-300/30 blur-3xl" />
        <p className="relative text-xs font-semibold uppercase tracking-widest text-indigo-200">Admin panel · {date}</p>
        <h1 className="relative mt-2 text-2xl font-extrabold tracking-tight sm:text-4xl">{hello}, {first} 👋</h1>
        <p className="relative mt-1 text-sm text-indigo-100">Everything about the platform, in one place.</p>
        {s.ratings?.count > 0 && (
          <span className="relative mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/20 backdrop-blur">
            ⭐ {s.ratings.average} average · {s.ratings.count} ratings
          </span>
        )}
      </div>

      {pending > 0 && (
        <Link to="/admin/helpers" className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200 transition hover:shadow-lg">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-xl text-white">⏳</span>
          <span className="min-w-0 flex-1"><b>{pending}</b> helper{pending > 1 ? 's are' : ' is'} waiting for verification.</span>
          <span className="font-semibold">Review →</span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {tiles.map((t) => <StatTile key={t.label} {...t} loading={loading} />)}
      </div>
      {failed && (
        <p className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs text-slate-500">
          Live numbers could not load. The shortcuts below still work.
        </p>
      )}

      {total > 0 && (
        <section className="rounded-3xl bg-white p-5 shadow-xl shadow-indigo-100/60 ring-1 ring-slate-100 sm:p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold text-slate-800">Requests by status</h2>
            <span className="text-sm text-slate-400">{total} total</span>
          </div>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-100">
            {byStatus.map(([k, n]) => (
              <div key={k} title={`${k}: ${n}`} style={{ width: `${(n / total) * 100}%` }} className={BAR[k] || 'bg-slate-300'} />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">
            {byStatus.map(([k, n]) => (
              <span key={k} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${BAR[k] || 'bg-slate-300'}`} />
                {k.replace(/_/g, ' ').toLowerCase()} <b className="text-slate-800">{n}</b>
              </span>
            ))}
          </div>
        </section>
      )}

      <div>
        <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-widest text-slate-400">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {ACTIONS.map((a) => <QuickAction key={a.to} {...a} />)}
        </div>
      </div>
    </div>
  );
}