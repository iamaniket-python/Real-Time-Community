import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getJobs, updateJobStatus } from '../api/helpers';
import { getSocket } from '../socket/socket';
import StatusBadge from './ui/StatusBadge';
import Button from './ui/Button';

const ACTIVE = ['ACCEPTED', 'ARRIVING', 'IN_PROGRESS'];
const NEXT = {
  ACCEPTED: ['ARRIVING', "I'm on my way"],
  ARRIVING: ['IN_PROGRESS', 'Start job'],
  IN_PROGRESS: ['COMPLETED', 'Mark completed'],
};
const EVENTS = ['request:accepted', 'request:status_changed', 'request:cancelled'];

export default function ActiveJobCard() {
  const [job, setJob] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const d = await getJobs();
      const rows = Array.isArray(d) ? d : d.items || d.jobs || d.requests || [];
      setJob(rows.find((j) => ACTIVE.includes(j.status)) || null);
    } catch {
      /* the jobs page shows errors */
    }
  }, []);

  useEffect(() => {
    load();
    const s = getSocket();
    if (!s) return;
    EVENTS.forEach((ev) => s.on(ev, load));
    return () => EVENTS.forEach((ev) => s.off(ev, load));
  }, [load]);

  async function advance(status) {
    setBusy(true);
    setError('');
    try {
      await updateJobStatus(job.id, status);
      await load();
    } catch (e) {
      setError(e.message || 'Could not update status.');
    }
    setBusy(false);
  }

  if (!job) return null;
  const next = NEXT[job.status];

  return (
    <section className="rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white shadow-xl shadow-indigo-200 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-200">Your active job</p>
          <h2 className="mt-1 truncate text-xl font-bold">{job.title}</h2>
          {job.address && <p className="truncate text-sm text-indigo-100">{job.address}</p>}
        </div>
        <StatusBadge status={job.status} />
      </div>
      {error && <p className="mt-3 rounded-xl bg-white/90 px-3 py-2 text-sm text-rose-700">{error}</p>}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Link to={`/chat/${job.id}`}>
          <Button variant="secondary" className="w-full">💬 Chat with user</Button>
        </Link>
        {next && (
          <Button loading={busy} onClick={() => advance(next[0])}
            className="w-full !bg-white/20 !from-transparent !to-transparent !shadow-none hover:!bg-white/30">
            {next[1]}
          </Button>
        )}
      </div>
    </section>
  );
}