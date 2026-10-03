import { useCallback, useEffect, useState } from 'react';
import { getJobs, updateJobStatus } from '../../api/helpers';
import PageShell from '../../components/ui/PageShell';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';

const NEXT = {
  ACCEPTED: ['ARRIVING', "I'm on my way"],
  ARRIVING: ['IN_PROGRESS', 'Start job'],
  IN_PROGRESS: ['COMPLETED', 'Mark completed'],
};

export default function HelperJobs() {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async (c) => {
    setLoading(true);
    try {
      const d = await getJobs(c);
      const rows = Array.isArray(d) ? d : d.items || d.jobs || d.requests || [];
      setItems((p) => (c ? [...p, ...rows] : rows));
      setCursor(d.nextCursor || null);
    } catch (e) {
      setError(e.message || 'Could not load jobs.');
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function advance(id, status) {
    setBusyId(id);
    setError('');
    try {
      await updateJobStatus(id, status);
      await load();
    } catch (e) {
      setError(e.message || 'Could not update status.');
    }
    setBusyId(null);
  }

  return (
    <PageShell title="My jobs" subtitle="Update progress as you help.">
      <Card>
        {error && <p className="mb-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        {!loading && !items.length && !error && (
          <p className="py-8 text-center text-slate-500">No jobs yet. Accept a request from your dashboard.</p>
        )}
        <ul className="divide-y divide-slate-100">
          {items.map((j) => {
            const next = NEXT[j.status];
            return (
              <li key={j.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-800">{j.title}</p>
                  <p className="text-xs text-slate-500">{j.address}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={j.status} />
                  {next && (
                    <Button loading={busyId === j.id} onClick={() => advance(j.id, next[0])}>{next[1]}</Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {cursor && (
          <Button variant="secondary" loading={loading} onClick={() => load(cursor)} className="mt-4 w-full">Load more</Button>
        )}
        {loading && !items.length && <p className="py-8 text-center text-slate-400">Loading…</p>}
      </Card>
    </PageShell>
  );
}