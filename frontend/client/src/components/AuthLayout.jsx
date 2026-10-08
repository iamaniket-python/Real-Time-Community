const perks = ['⚡ Real-time helper matching', '✅ Admin-verified helpers', '💬 Live chat & tracking'];

const THEMES = {
  classic: {
    main: 'grid min-h-screen bg-slate-50 lg:grid-cols-2',
    aside: 'relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-12 text-white lg:flex',
    blob1: 'absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl',
    blob2: 'absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-indigo-300/20 blur-3xl',
    logoBox: 'grid h-10 w-10 place-items-center rounded-xl bg-white/20 backdrop-blur',
    lead: 'max-w-md text-indigo-100',
    pill: 'w-fit rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur',
    foot: 'relative text-sm text-indigo-200',
    card: 'w-full max-w-md rounded-3xl bg-white p-8 shadow-xl shadow-indigo-100 ring-1 ring-slate-100 sm:p-10',
    h1: 'text-3xl font-bold text-slate-900',
    sub: 'mb-8 mt-2 text-slate-500',
  },
  user: {
    main: 'grid min-h-screen bg-blush lg:grid-cols-2',
    aside: 'relative hidden flex-col justify-between overflow-hidden bg-petal p-12 text-ink lg:flex',
    blob1: 'absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/50 blur-3xl',
    blob2: 'absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-rosewood/20 blur-3xl',
    logoBox: 'grid h-10 w-10 place-items-center rounded-xl bg-white/70',
    lead: 'max-w-md text-ink-soft',
    pill: 'w-fit rounded-full bg-white/70 px-4 py-2 text-sm text-ink',
    foot: 'relative text-sm text-ink-soft',
    card: 'w-full max-w-md rounded-3xl bg-white p-8 shadow-xl shadow-petal/60 ring-1 ring-petal sm:p-10',
    h1: 'text-3xl font-bold text-ink',
    sub: 'mb-8 mt-2 text-ink-soft',
  },
};

export default function AuthLayout({ title, subtitle, children, variant = 'classic' }) {
  const t = THEMES[variant] || THEMES.classic;
  return (
    <main className={t.main}>
      <section className={t.aside}>
        <div className={t.blob1} />
        <div className={t.blob2} />
        <div className="relative flex items-center gap-3 text-xl font-bold">
          <span className={t.logoBox}>🤝</span>
          Community Help
        </div>
        <div className="relative space-y-6">
          <h2 className="text-4xl font-extrabold leading-tight">Help is just a tap away.</h2>
          <p className={t.lead}>Ask your neighbourhood for a hand, or become the helper someone needs today.</p>
          <ul className="space-y-3">
            {perks.map((p) => (
              <li key={p} className={t.pill}>{p}</li>
            ))}
          </ul>
        </div>
        <p className={t.foot}>© Community Help Platform</p>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className={t.card}>
          <h1 className={t.h1}>{title}</h1>
          <p className={t.sub}>{subtitle}</p>
          {children}
        </div>
      </section>
    </main>
  );
}