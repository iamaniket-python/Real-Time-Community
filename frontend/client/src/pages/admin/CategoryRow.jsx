import Button from '../ui/Button';

export default function CategoryRow({ c, busy, onRename, onToggle }) {
  const off = c.isActive === false;
  return (
    <li className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 transition hover:ring-indigo-200 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-md ${
          off ? 'bg-slate-300' : 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-orange-200'
        }`}>
          {(c.name || '?').charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`truncate font-semibold ${off ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{c.name}</p>
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            off ? 'bg-slate-200 text-slate-500' : 'bg-emerald-100 text-emerald-700'
          }`}>
            {off ? 'Inactive' : 'Active'}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <Button variant="ghost" disabled={busy} onClick={() => onRename(c)} className="w-full ring-1 ring-slate-200 sm:w-auto sm:ring-0">
          Rename
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => onToggle(c)} className="w-full sm:w-auto">
          {off ? 'Activate' : 'Deactivate'}
        </Button>
      </div>
    </li>
  );
}