const ORIGIN = new URL(import.meta.env.VITE_API_URL).origin;
const full = (u) => (u ? (u.startsWith('http') ? u : ORIGIN + u) : null);

export default function DocImage({ label, src, onExpired }) {
  const url = full(src);
  return (
    <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
      <p className="mb-2 text-sm font-semibold text-slate-700">{label}</p>
      <div className="flex h-40 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" className="block h-full w-full">
            <img src={url} onError={onExpired} alt={label} className="h-full w-full object-cover" />
          </a>
        ) : (
          <span className="text-xs text-slate-400">Not uploaded</span>
        )}
      </div>
      {url && <p className="mt-2 text-center text-xs text-slate-400">Click to open full size</p>}
    </div>
  );
}