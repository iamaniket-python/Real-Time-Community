import { useCallback, useEffect, useState } from 'react';
import { getCategories } from '../../api/categories';
import { createCategory, updateCategory } from '../../api/admin';
import PageShell from '../../components/ui/PageShell';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function AdminCategories() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const d = await getCategories();
      setItems(Array.isArray(d) ? d : d?.categories || []);
    } catch (e) {
      setError(e.message || 'Could not load categories.');
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function run(fn) {
    setBusy(true);
    setError('');
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e.message || 'Action failed.');
    }
    setBusy(false);
  }

  function add(e) {
    e.preventDefault();
    if (!name.trim()) return;
    run(async () => {
      await createCategory(name.trim());
      setName('');
    });
  }

  function rename(c) {
    const n = window.prompt('New name:', c.name);
    if (n && n.trim() && n.trim() !== c.name) run(() => updateCategory(c.id, { name: n.trim() }));
  }

  return (
    <PageShell title="Categories" subtitle="Manage the kinds of help people can request.">
      <Card>
        <form onSubmit={add} className="mb-5 flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
          <Button type="submit" loading={busy}>Add</Button>
        </form>
        {error && <p className="mb-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        <ul className="divide-y divide-slate-100">
          {items.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 py-3">
              <span className={c.isActive === false ? 'text-slate-400 line-through' : 'font-medium text-slate-800'}>
                {c.name}
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" disabled={busy} onClick={() => rename(c)}>Rename</Button>
                <Button variant="secondary" disabled={busy}
                  onClick={() => run(() => updateCategory(c.id, { isActive: c.isActive === false }))}>
                  {c.isActive === false ? 'Activate' : 'Deactivate'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
        {!items.length && !error && <p className="py-6 text-center text-slate-500">No categories yet.</p>}
      </Card>
    </PageShell>
  );
}