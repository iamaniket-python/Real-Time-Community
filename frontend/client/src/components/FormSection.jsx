export default function FormSection({ step, title, hint, children }) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-xl shadow-indigo-100/60 ring-1 ring-slate-100 sm:p-8">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-sm font-bold text-white shadow-md shadow-indigo-200">
          {step}
        </span>
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          {hint && <p className="text-sm text-slate-500">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}