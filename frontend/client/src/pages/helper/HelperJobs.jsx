import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
const CHAT_OPEN = ['ACCEPTED', 'ARRIVING', 'IN_PROGRESS'];

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
      <Card className="!p-4 sm:!p-6">
        {error && <p className="mb-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        {!loading && !items.length && !error && (
          <p className="py-8 text-center text-slate-500">No jobs yet. Accept a request from your dashboard.</p>
        )}
        <ul className="space-y-3">
          {items.map((j) => {
            const next = NEXT[j.status];
            return (
              <li key={j.id} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-800">{j.title}</p>
                    <p className="truncate text-xs text-slate-500">{j.address}</p>
                  </div>
                  <StatusBadge status={j.status} />
                </div>
                {(CHAT_OPEN.includes(j.status) || next) && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {CHAT_OPEN.includes(j.status) && (
                      <Link to={`/chat/${j.id}`}>
                        <Button variant="secondary" className="w-full">💬 Chat</Button>
                      </Link>
                    )}
                    {next && (
                      <Button loading={busyId === j.id} onClick={() => advance(j.id, next[0])} className="w-full">
                        {next[1]}
                      </Button>
                    )}
                  </div>
                )}
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