export default function PageShell({ title, subtitle, action, narrow = false, children }) {
  return (
    <div className="bg-slate-50">
      <header className="bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 pb-24 pt-10 text-white shadow-lg">
        <div className="mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-4 px-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            {subtitle && (
              <p className="mt-1 max-w-xl text-indigo-100">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      </header>
      <main
        className={`mx-auto -mt-16 px-4 pb-16 ${narrow ? 'max-w-2xl' : 'max-w-5xl'}`}
      >
        {children}
      </main>
    </div>
  );
}