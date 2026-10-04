import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { cancelRequest, getRequest } from '../../api/requests';
import useRequestLive from '../../hooks/useRequestLive';
import PageShell from '../../components/ui/PageShell';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import RequestImage from '../../components/RequestImage';
import RatingForm from '../../components/RatingForm';
import ReportForm from '../../components/ReportForm';
import HelperTracker from '../../components/HelperTracker';
import AssignedHelper from '../../components/AssignedHelper';

const CANCELLABLE = ['PENDING', 'SEARCHING', 'ACCEPTED', 'ARRIVING'];
const CHAT_OPEN = ['ACCEPTED', 'ARRIVING', 'IN_PROGRESS'];
const REPORTABLE = ['ACCEPTED', 'ARRIVING', 'IN_PROGRESS', 'COMPLETED'];
const HELPER_SHOWN = ['ACCEPTED', 'ARRIVING', 'IN_PROGRESS', 'COMPLETED'];

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

  const helperPos = useRequestLive(id, load);

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
      <div className="space-y-5">
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
              {CHAT_OPEN.includes(req.status) && <HelperTracker request={req} helperPos={helperPos} />}
              {CHAT_OPEN.includes(req.status) && (
                <Link to={`/chat/${req.id}`} className="block">
                  <Button className="w-full">💬 Open chat with your helper</Button>
                </Link>
              )}
              {req.status === 'COMPLETED' && <RatingForm requestId={req.id} />}
              {CANCELLABLE.includes(req.status) && (
                <Button variant="danger" loading={busy} onClick={cancel} className="w-full">
                  Cancel request
                </Button>
              )}
              {REPORTABLE.includes(req.status) && <ReportForm requestId={req.id} />}
            </div>
          )}
        </Card>
        {req && HELPER_SHOWN.includes(req.status) && (
          <AssignedHelper requestId={req.id} status={req.status} />
        )}
      </div>
    </PageShell>
  );
}