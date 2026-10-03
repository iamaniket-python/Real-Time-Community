import { useLocation } from 'react-router-dom';

export default function PageShell({ title, subtitle, action, narrow = false, children }) {
  const { pathname } = useLocation();

  if (pathname.startsWith('/admin'))
    return (
      <div className="space-y-5">
        <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-5 text-white shadow-xl shadow-indigo-200/60 sm:p-7">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-indigo-100">{subtitle}</p>}
            </div>
            {action}
          </div>
        </header>
        {children}
      </div>
    );

  return (
    <div className="bg-slate-50">
      <header className="bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 pb-24 pt-10 text-white shadow-lg">
        <div className="mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-4 px-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1 max-w-xl text-indigo-100">{subtitle}</p>}
          </div>
          {action}
        </div>
      </header>
      <main className={`mx-auto -mt-16 px-4 pb-16 ${narrow ? 'max-w-2xl' : 'max-w-5xl'}`}>
        {children}
      </main>
    </div>
  );
}