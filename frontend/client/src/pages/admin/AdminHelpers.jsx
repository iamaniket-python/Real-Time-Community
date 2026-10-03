import { useCallback, useEffect, useState } from 'react';
import { listHelpers, helperAction } from '../../api/admin';
import PageShell from '../../components/ui/PageShell';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';

const TABS = ['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'];
const ACTIONS = {
  PENDING: [['verify', 'Verify', 'primary'], ['reject', 'Reject', 'danger']],
  VERIFIED: [['suspend', 'Suspend', 'danger']],
  REJECTED: [['verify', 'Verify', 'primary']],
  SUSPENDED: [['verify', 'Reinstate', 'primary']],
};

export default function AdminHelpers() {
  const [tab, setTab] = useState('PENDING');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const d = await listHelpers(tab);
      setItems(Array.isArray(d) ? d : d.items || d.helpers || []);
    } catch (e) {
      setError(e.message || 'Could not load helpers.');
    }
    setLoading(false);
  }, [tab]);
  useEffect(() => {
    load();
  }, [load]);

  async function act(id, action) {
    let reason;
    if (action !== 'verify') {
      reason = window.prompt('Reason (optional):');
      if (reason === null) return;
    }
    setBusyId(id);
    setError('');
    try {
      await helperAction(id, action, reason?.trim() || undefined);
      await load();
    } catch (e) {
      setError(e.message || 'Action failed.');
    }
    setBusyId(null);
  }

  return (
    <PageShell title="Helpers" subtitle="Review and manage helper applications.">
      <Card>
        <div className="mb-4 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                tab === t ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-indigo-50'
              }`}>
              {t.charAt(0) + t.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        {error && <p className="mb-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        {loading && <p className="py-8 text-center text-slate-400">Loading…</p>}
        {!loading && !items.length && !error && (
          <p className="py-8 text-center text-slate-500">No {tab.toLowerCase()} helpers.</p>
        )}
        <ul className="divide-y divide-slate-100">
          {items.map((h) => {
            const u = h.user || {};
            return (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-800">{u.name || h.name || `Helper #${h.id}`}</p>
                  <p className="text-xs text-slate-500">{u.email || h.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={h.status || tab} />
                  {ACTIONS[tab].map(([a, label, v]) => (
                    <Button key={a} variant={v} loading={busyId === h.id} onClick={() => act(h.id, a)}>{label}</Button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </PageShell>
  );
}