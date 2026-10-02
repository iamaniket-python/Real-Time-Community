export default function CategoryChips({ cats, value, onChange }) {
  if (!cats.length) return <p className="text-sm text-slate-400">Loading categories...</p>;
  return (
    <div className="flex flex-wrap gap-2.5">
      {cats.map((c) => {
        const on = String(c.id) === String(value);
        return (
          <button
            type="button"
            key={c.id}
            aria-pressed={on}
            onClick={() => onChange(String(c.id))}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              on
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200'
                : 'bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'
            }`}
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
}