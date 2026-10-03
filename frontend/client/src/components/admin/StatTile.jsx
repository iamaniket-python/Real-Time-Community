import { Link } from 'react-router-dom';

export default function StatTile({ to, icon, label, value, sub, grad, loading }) {
  return (
    <Link
      to={to}
      className="group relative overflow-hidden rounded-3xl bg-white p-4 shadow-xl shadow-indigo-100/60 ring-1 ring-slate-100 transition hover:-translate-y-1 hover:ring-indigo-200 sm:p-5"
    >
      <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${grad} opacity-10 transition group-hover:opacity-20`} />
      <div className={`relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${grad} text-xl text-white shadow-lg`}>
        {icon}
      </div>
      <p className={`relative mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl ${loading ? 'animate-pulse text-slate-200' : 'text-slate-800'}`}>
        {loading ? '00' : value}
      </p>
      <p className="relative text-sm font-semibold text-slate-700">{label}</p>
      <p className="relative truncate text-xs text-slate-400">{loading ? ' ' : sub}</p>
    </Link>
  );
}