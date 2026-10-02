import { Link } from 'react-router-dom';

const base = 'relative block rounded-3xl bg-white p-6 shadow-xl shadow-indigo-100/60 ring-1 ring-slate-100';

export default function ActionCard({ icon, title, text, to }) {
  const body = (
    <>
      <span className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${to ? 'bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-200' : 'bg-slate-100 grayscale'}`}>
        {icon}
      </span>
      <h2 className="mt-4 text-lg font-bold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{text}</p>
      {to ? (
        <span className="mt-4 inline-block text-sm font-semibold text-indigo-600">Open →</span>
      ) : (
        <span className="absolute right-5 top-5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">Soon</span>
      )}
    </>
  );
  if (!to) return <div className={`${base} opacity-70`}>{body}</div>;
  return <Link to={to} className={`${base} transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-200`}>{body}</Link>;
}