import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getHelperDetail } from '../../api/adminHelper';
import { openHelperChat } from '../../api/directChat';
import PageShell from '../../components/ui/PageShell';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import DocImage from '../../components/admin/DocImage';

function Row({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="break-words text-sm font-medium text-slate-800">{value || '—'}</span>
    </div>
  );
}

export default function AdminHelperDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [h, setH] = useState(null);
  const [error, setError] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const tries = useRef(0);

  const load = useCallback(async () => {
    try {
      const d = await getHelperDetail(id);
      setH(d.helper || d);
    } catch (e) {
      setError(e.status === 404 ? 'Helper not found.' : e.message || 'Could not load helper.');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // The signed image links last 5 minutes: reload once or twice if one fails
  const expired = () => {
    if (tries.current++ < 2) load();
  };

  async function startChat() {
    setChatBusy(true);
    setError('');
    try {
      const d = await openHelperChat(id);
      navigate(`/messages/${d.conversationId}`);
    } catch (e) {
      setError(e.message || 'Could not open the chat.');
      setChatBusy(false);
    }
  }

  const actions = (
    <div className="flex items-center gap-3">
      <Link to="/admin/helpers" className="text-sm font-medium text-indigo-100 hover:text-white">
        ← All helpers
      </Link>
      {h && (
        <Button variant="secondary" loading={chatBusy} onClick={startChat}>💬 Chat with helper</Button>
      )}
    </div>
  );
  const b = h?.business || {};
  const d = h?.documents || {};

  return (
    <PageShell title={h?.name || 'Helper'} subtitle={h?.email} action={actions}>
      {error && <p className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {!h && !error && <div className="h-40 animate-pulse rounded-3xl bg-slate-100" />}
      {h && (
        <div className="space-y-5">
          <Card title="Account">
            <div className="divide-y divide-slate-100">
              <Row label="Verification" value={<StatusBadge status={h.verificationStatus} />} />
              <Row label="Account status" value={h.accountStatus} />
              <Row label="Phone" value={h.phone} />
              <Row label="Rating" value={h.ratingCount ? `⭐ ${h.ratingAvg.toFixed(1)} (${h.ratingCount})` : 'No ratings yet'} />
              <Row label="Services" value={(h.categories || []).join(', ')} />
            </div>
          </Card>
          <Card title="Business details">
            {!b.name && (
              <p className="mb-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                This helper has not submitted business details yet.
              </p>
            )}
            <div className="divide-y divide-slate-100">
              <Row label="Shop name" value={b.name} />
              <Row label="Address" value={b.address} />
              <Row label="Experience" value={b.experienceYears != null ? `${b.experienceYears} years` : ''} />
              <Row label="GST number" value={b.gstNumber} />
              <Row label="Aadhaar number" value={b.aadhaarNumber} />
              <Row label="PAN number" value={b.panNumber} />
              <Row label="Submitted" value={b.submittedAt && new Date(b.submittedAt).toLocaleString()} />
            </div>
          </Card>
          <Card title="Documents">
            <div className="grid gap-4 sm:grid-cols-3">
              <DocImage label="Aadhaar card" src={d.aadhaar} onExpired={expired} />
              <DocImage label="PAN card" src={d.pan} onExpired={expired} />
              <DocImage label="Shop photo" src={d.shop} onExpired={expired} />
            </div>
          </Card>
        </div>
      )}
    </PageShell>
  );
}