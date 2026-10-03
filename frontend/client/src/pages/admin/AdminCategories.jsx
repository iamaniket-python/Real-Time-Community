import { useCallback, useEffect, useState } from 'react';
import { listAdminCategories, createCategory, updateCategory } from '../../api/admin';
import PageShell from '../../components/ui/PageShell';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import ReasonDialog from '../../components/ReasonDialog';
import CategoryRow from '../../components/admin/CategoryRow';

export default function AdminCategories() {
  const [items, setItems] = useState(null);
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
      setItems((p) => p || []);
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
  const list = items || [];
  const off = list.filter((c) => c.isActive === false).length;

  return (
    <PageShell title="Categories" subtitle="Manage the kinds of help people can request.">
      <Card className="!p-4 sm:!p-6">
        <form onSubmit={add} className="flex flex-col gap-2 sm:flex-row">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
          <Button type="submit" loading={busy} className="w-full sm:w-auto">+ Add category</Button>
        </form>
        {items && (
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">{list.length - off} active</span>
            <span className="rounded-full bg-slate-200 px-3 py-1 text-slate-600">{off} inactive</span>
          </div>
        )}
        {error && <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        <div className="mt-4">
          {!items && (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}
            </div>
          )}
          {items && !list.length && !error && (
            <div className="py-10 text-center">
              <p className="text-4xl">🗂️</p>
              <p className="mt-2 text-slate-500">No categories yet. Add the first one above.</p>
            </div>
          )}
          <ul className="space-y-3">
            {list.map((c) => (
              <CategoryRow key={c.id} c={c} busy={busy}
                onRename={(x) => setDialog({ kind: 'rename', c: x })}
                onToggle={(x) => setDialog({ kind: 'toggle', c: x })} />
            ))}
          </ul>
        </div>
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
              ? 'This category will be available for new requests again.'
              : 'This category will no longer appear in new requests.'
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