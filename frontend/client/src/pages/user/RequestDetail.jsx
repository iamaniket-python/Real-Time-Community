import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { cancelRequest, getRequest } from '../../api/requests';
import PageShell from '../../components/ui/PageShell';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import RequestImage from '../../components/RequestImage';

const CANCELLABLE = ['PENDING', 'SEARCHING', 'ACCEPTED', 'ARRIVING'];
const CHAT_OPEN = ['ACCEPTED', 'ARRIVING', 'IN_PROGRESS'];

export default function RequestDetail() {
  const { id } = useParams();
  const [req, setReq] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await getRequest(id);
      setReq(d.request || d);
    } catch (e) {
      setError(e.status === 404 ? 'Request not found.' : e.message);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function cancel() {
    if (!window.confirm('Cancel this request?')) return;
    setBusy(true);
    setError('');
    try {
      await cancelRequest(id);
      await load();
    } catch (e) {
      setError(e.message || 'Could not cancel.');
    }
    setBusy(false);
  }

  const back = (
    <Link to="/requests" className="text-sm font-medium text-indigo-100 hover:text-white">← All requests</Link>
  );

  return (
    <PageShell title={req?.title || 'Request'} subtitle={req?.address} action={back} narrow>
      <Card>
        {error && <p className="mb-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        {!req && !error && <p className="py-8 text-center text-slate-400">Loading…</p>}
        {req && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <StatusBadge status={req.status} />
              <span className="text-xs text-slate-500">
                {new Date(req.createdAt || req.created_at).toLocaleString()}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-slate-700">{req.description}</p>
            <RequestImage requestId={req.id} />
            {CHAT_OPEN.includes(req.status) && (
              <Link to={`/chat/${req.id}`} className="block">
                <Button className="w-full">Open chat with your helper</Button>
              </Link>
            )}
            {CANCELLABLE.includes(req.status) && (
              <Button variant="danger" loading={busy} onClick={cancel} className="w-full">
                Cancel request
              </Button>
            )}
          </div>
        )}
      </Card>
    </PageShell>
  );
}