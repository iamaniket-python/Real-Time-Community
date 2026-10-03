import { Link } from 'react-router-dom';

export default function QuickAction({ to, icon, title, text, grad }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-3xl bg-white p-4 shadow-lg shadow-indigo-100/50 ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-xl hover:ring-indigo-200"
    >
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${grad} text-2xl text-white shadow-md`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-slate-800">{title}</h3>
        <p className="truncate text-sm text-slate-500">{text}</p>
      </div>
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition group-hover:bg-indigo-600 group-hover:text-white">
        →
      </span>
    </Link>
  );
}