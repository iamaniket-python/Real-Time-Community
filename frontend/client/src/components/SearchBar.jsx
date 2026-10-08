import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function SearchBar({ className = '' }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const urlQ = params.get('q') || '';
  const [value, setValue] = useState(urlQ);

  useEffect(() => {
    setValue(urlQ);
  }, [urlQ]);

  const submit = (e) => {
    e.preventDefault();
    const q = value.trim();
    if (q.length < 2) return;
    const type = params.get('type') === 'shops' ? 'shops' : 'products';
    navigate(`/search?${new URLSearchParams({ q, type }).toString()}`);
  };

  return (
    <form role="search" onSubmit={submit} className={`flex items-center gap-2 ${className}`}>
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={60}
        placeholder="Product ya shop ka naam search karo"
        aria-label="Search products or shops"
        className="min-w-0 flex-1 rounded-xl bg-slate-50 px-4 py-2 text-sm text-slate-800 ring-1 ring-slate-200 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-400"
      />
      <button
        type="submit"
        className="shrink-0 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition hover:opacity-90"
      >
        Search
      </button>
    </form>
  );
}