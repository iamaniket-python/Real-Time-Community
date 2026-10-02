const perks = ['⚡ Real-time helper matching', '✅ Admin-verified helpers', '💬 Live chat & tracking'];

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <main className="grid min-h-screen bg-slate-50 lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-12 text-white lg:flex">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-indigo-300/20 blur-3xl" />
        <div className="relative flex items-center gap-3 text-xl font-bold">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/20 backdrop-blur">🤝</span>
          Community Help
        </div>
        <div className="relative space-y-6">
          <h2 className="text-4xl font-extrabold leading-tight">Help is just a tap away.</h2>
          <p className="max-w-md text-indigo-100">Ask your neighbourhood for a hand, or become the helper someone needs today.</p>
          <ul className="space-y-3">
            {perks.map((p) => (
              <li key={p} className="w-fit rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">{p}</li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-indigo-200">© Community Help Platform</p>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl shadow-indigo-100 ring-1 ring-slate-100 sm:p-10">
          <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
          <p className="mb-8 mt-2 text-slate-500">{subtitle}</p>
          {children}
        </div>
      </section>
    </main>
  );
}