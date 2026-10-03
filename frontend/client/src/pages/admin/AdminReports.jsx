import { useCallback, useEffect, useState } from 'react';
import { listReports, updateReport, blockUser } from '../../api/admin';
import PageShell from '../../components/ui/PageShell';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import ReasonDialog from '../../components/ReasonDialog';

const STEPS = [['REVIEWING', 'Review'], ['RESOLVED', 'Resolve'], ['DISMISSED', 'Dismiss']];

export default function AdminReports() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(null);

  const load = useCallback(async () => {
    try {
      const d = await listReports();
      setItems(Array.isArray(d) ? d : d.items || d.reports || []);
      setError('');
    } catch (e) {
      setError(e.message || 'Could not load reports.');
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function run(id, fn) {
    setBusyId(id);
    setError('');
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e.message || 'Action failed.');
    }
    setBusyId(null);
  }

  function askStatus(r, status, label) {
    setDialog({ kind: 'status', r, status, label });
  }

  function askBlock(r, uid) {
    setDialog({ kind: 'block', r, uid });
  }

  function confirm(note) {
    const d = dialog;
    setDialog(null);
    if (d.kind === 'block') {
      run(d.r.id, () => blockUser(d.uid));
    } else {
      run(d.r.id, () => updateReport(d.r.id, d.status, note || undefined));
    }
  }

  const isBlock = dialog?.kind === 'block';

  return (
    <PageShell title="Reports" subtitle="Handle reports from the community.">
      <Card>
        {error && <p className="mb-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        {loading && <p className="py-8 text-center text-slate-400">Loading…</p>}
        {!loading && !items.length && !error && (
          <p className="py-8 text-center text-slate-500">No reports.</p>
        )}
        <ul className="space-y-3">
          {items.map((r) => {
            const uid = r.reportedUserId ?? r.reportedUser?.id;
            return (
              <li key={r.id} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-800">{String(r.reason || '').replace(/_/g, ' ')}</p>
                  <StatusBadge status={r.status} />
                </div>
                {r.details && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{r.details}</p>}
                <p className="mt-1 text-xs text-slate-500">
                  Request #{r.requestId ?? r.request?.id ?? '?'} · {new Date(r.createdAt || r.created_at).toLocaleString()}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {STEPS.filter(([s]) => s !== r.status).map(([s, label]) => (
                    <Button key={s} variant="secondary" loading={busyId === r.id} onClick={() => askStatus(r, s, label)}>{label}</Button>
                  ))}
                  {uid && <Button variant="danger" disabled={busyId === r.id} onClick={() => askBlock(r, uid)}>Block user</Button>}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <ReasonDialog
        open={!!dialog}
        tone={isBlock ? 'danger' : 'primary'}
        hideInput={isBlock}
        title={isBlock ? 'Block this user?' : dialog ? `${dialog.label} this report?` : ''}
        message={
          isBlock
            ? 'Blocked user login nahi kar payega. Ye action audit log mein record hoga.'
            : 'Report ka status badal jaayega aur note audit log mein dikhega.'
        }
        label="Note (optional)"
        placeholder="Write a short note..."
        confirmText={isBlock ? 'Block user' : dialog?.label || 'Confirm'}
        onConfirm={confirm}
        onCancel={() => setDialog(null)}
      />
    </PageShell>
  );
}