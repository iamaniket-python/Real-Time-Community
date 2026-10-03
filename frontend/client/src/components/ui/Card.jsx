export default function Card({ title, children, className = '' }) {
  return (
    <section
      className={`rounded-3xl bg-white p-6 shadow-xl shadow-indigo-100/60 ring-1 ring-slate-100 ${className}`}
    >
      {title && (
        <h2 className="mb-4 text-lg font-semibold text-slate-800">{title}</h2>
      )}
      {children}
    </section>
  );
}