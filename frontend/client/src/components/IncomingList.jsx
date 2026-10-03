import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useIncoming from '../hooks/useIncoming';
import { acceptRequest, rejectRequest } from '../api/helpers';
import Card from './ui/Card';
import Button from './ui/Button';

const WHY = {
  NOT_VERIFIED: 'Waiting for admin verification.',
  OFFLINE: 'Go online to receive requests.',
  BUSY: 'Finish your current job first.',
  NO_LOCATION: 'Share your location to see requests.',
  NO_CATEGORIES: 'Pick at least one category below.',
};

export default function IncomingList() {
  const navigate = useNavigate();
  const { items, reason, loading, error, reload } = useIncoming();
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState('');

  async function act(id, kind) {
    setBusyId(id);
    setMsg('');
    try {
      if (kind === 'accept') {
        await acceptRequest(id);
        return navigate('/helper/jobs');
      }
      await rejectRequest(id);
    } catch (e) {
      setMsg(
        e.errorCode === 'REQUEST_NOT_AVAILABLE'
          ? 'Someone else got there first.'
          : e.message || 'Action failed.',
      );
    }
    setBusyId(null);
    reload();
  }

  return (
    <Card title="Incoming requests">
      {(error || msg) && (
        <p className="mb-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error || msg}</p>
      )}
      {reason && (
        <p className="mb-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{WHY[reason] || reason}</p>
      )}
      {loading && <p className="py-4 text-center text-slate-400">Loading…</p>}
      {!loading && !items.length && !reason && (
        <p className="py-4 text-center text-slate-500">No requests nearby right now.</p>
      )}
      <ul className="space-y-3">
        {items.map((it) => {
          const r = it.request || it;
          const blocked = it.reason || reason;
          return (
            <li key={r.id} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <p className="font-semibold text-slate-800">{r.title}</p>
              <p className="mt-1 line-clamp-2 text-sm text-slate-600">{r.description}</p>
              <p className="mt-1 text-xs text-slate-500">
                {[r.address, r.distanceKm != null && `${Number(r.distanceKm).toFixed(1)} km away`]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <div className="mt-3 flex gap-2">
                <Button loading={busyId === r.id} disabled={!!blocked} onClick={() => act(r.id, 'accept')}>Accept</Button>
                <Button variant="ghost" disabled={busyId === r.id} onClick={() => act(r.id, 'reject')}>Reject</Button>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}