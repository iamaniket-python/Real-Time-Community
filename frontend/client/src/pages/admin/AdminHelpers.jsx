import { useCallback, useEffect, useState } from 'react';
import { listHelpers, helperAction } from '../../api/admin';
import PageShell from '../../components/ui/PageShell';
import Card from '../../components/ui/Card';
import ReasonDialog from '../../components/ReasonDialog';
import HelperRow from '../../components/admin/HelperRow';

const TABS = [
  ['PENDING', '⏳', 'Pending'],
  ['VERIFIED', '✅', 'Verified'],
  ['REJECTED', '❌', 'Rejected'],
  ['SUSPENDED', '⛔', 'Suspended'],
];
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
  const [dialog, setDialog] = useState(null);

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

  function ask(h, action, label, variant) {
    setDialog({ id: h.id, name: h.user?.name || h.name || `Helper #${h.id}`, action, label, variant });
  }

  async function confirm(reason) {
    const { id, action } = dialog;
    setDialog(null);
    setBusyId(id);
    setError('');
    try {
      await helperAction(id, action, action === 'verify' ? undefined : reason || undefined);
      await load();
    } catch (e) {
      setError(e.message || 'Action failed.');
    }
    setBusyId(null);
  }

  const danger = dialog?.variant === 'danger';
  const isVerify = dialog?.action === 'verify';
  const current = TABS.find((t) => t[0] === tab);

  return (
    <PageShell title="Helpers" subtitle="Review and manage helper applications.">
      <Card className="!p-4 sm:!p-6">
        <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
          {TABS.map(([key, icon, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                tab === key ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-200' : 'bg-slate-100 text-slate-600 hover:bg-indigo-50'
              }`}>
              <span>{icon}</span>{label}
            </button>
          ))}
        </div>
        {error && <p className="mb-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        {loading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />)}
          </div>
        )}
        {!loading && !items.length && !error && (
          <div className="py-10 text-center">
            <p className="text-4xl">{current[1]}</p>
            <p className="mt-2 text-slate-500">No {current[2].toLowerCase()} helpers right now.</p>
          </div>
        )}
        {!loading && (
          <ul className="space-y-3">
            {items.map((h) => (
              <HelperRow key={h.id} h={h} tab={tab} actions={ACTIONS[tab]} busy={busyId === h.id} onAsk={ask} />
            ))}
          </ul>
        )}
      </Card>

      <ReasonDialog
        open={!!dialog}
        tone={danger ? 'danger' : 'primary'}
        title={dialog ? `${dialog.label} ${dialog.name}?` : ''}
        message={isVerify ? 'Once verified, this helper can accept requests.' : 'This action will be recorded in the audit log.'}
        label={isVerify ? 'Note (not sent)' : 'Reason (optional)'}
        placeholder={isVerify ? 'Optional note' : 'Write a short reason...'}
        confirmText={dialog?.label || 'Confirm'}
        onConfirm={confirm}
        onCancel={() => setDialog(null)}
      />
    </PageShell>
  );
}