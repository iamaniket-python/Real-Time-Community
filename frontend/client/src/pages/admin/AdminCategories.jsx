import { useCallback, useEffect, useState } from 'react';
import { listAdminCategories, createCategory, updateCategory } from '../../api/admin';
import PageShell from '../../components/ui/PageShell';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import ReasonDialog from '../../components/ReasonDialog';

export default function AdminCategories() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(null);

  const load = useCallback(async () => {
    try {
      const d = await listAdminCategories();
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
      const d = e.details?.map((x) => x.message).join(', ');
      setError(d || e.message || 'Action failed.');
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

  function confirm(value) {
    const d = dialog;
    setDialog(null);
    if (d.kind === 'rename') {
      if (value && value !== d.c.name) run(() => updateCategory(d.c.id, { name: value }));
    } else {
      const makeActive = d.c.isActive === false;
      run(() => updateCategory(d.c.id, { isActive: makeActive }));
    }
  }

  const isRename = dialog?.kind === 'rename';
  const activating = dialog?.c?.isActive === false;

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
                <Button variant="ghost" disabled={busy} onClick={() => setDialog({ kind: 'rename', c })}>Rename</Button>
                <Button variant="secondary" disabled={busy} onClick={() => setDialog({ kind: 'toggle', c })}>
                  {c.isActive === false ? 'Activate' : 'Deactivate'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
        {!items.length && !error && <p className="py-6 text-center text-slate-500">No categories yet.</p>}
      </Card>

      <ReasonDialog
        open={!!dialog}
        key={dialog ? `${dialog.kind}-${dialog.c.id}` : 'closed'}
        tone={isRename || activating ? 'primary' : 'danger'}
        hideInput={!isRename}
        required={isRename}
        rows={1}
        initialValue={isRename ? dialog.c.name : ''}
        title={
          isRename
            ? 'Rename category'
            : dialog
              ? `${activating ? 'Activate' : 'Deactivate'} "${dialog.c.name}"?`
              : ''
        }
        message={
          isRename
            ? ''
            : activating
              ? 'Ye category dobara requests ke liye available ho jaayegi.'
              : 'Naye requests mein ye category nahi dikhegi.'
        }
        label="New name"
        placeholder="Category name"
        confirmText={isRename ? 'Save' : activating ? 'Activate' : 'Deactivate'}
        onConfirm={confirm}
        onCancel={() => setDialog(null)}
      />
    </PageShell>
  );
}