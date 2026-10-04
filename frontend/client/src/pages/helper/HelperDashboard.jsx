import { useCallback, useEffect, useState } from 'react';
import { getMyHelper, setAvailability } from '../../api/helpers';
import useShareLocation from '../../hooks/useShareLocation';
import PageShell from '../../components/ui/PageShell';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import HelperCategories from '../../components/HelperCategories';
import IncomingList from '../../components/IncomingList';
import ActiveJobCard from '../../components/ActiveJobCard';
import ProfileChecklist from '../../components/helper/ProfileChecklist';
import AdminSupportCard from '../../components/helper/AdminSupportCard';

const getPos = () =>
  new Promise((res) =>
    navigator.geolocation
      ? navigator.geolocation.getCurrentPosition((p) => res(p.coords), () => res(null))
      : res(null),
  );

export default function HelperDashboard() {
  const [p, setP] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await getMyHelper();
      setP(d.profile || d.helper || d);
    } catch (e) {
      setError(e.message || 'Could not load your profile.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [load]);

  const online = !!(p?.isAvailable ?? p?.is_available);
  const status = p?.verification || p?.verificationStatus || p?.status;
  const verified = status === 'VERIFIED';
  const ready = verified && p?.businessComplete !== false && p?.documentsComplete !== false
    && (p?.categories || []).length > 0;
  useShareLocation(online);

  async function toggle() {
    setBusy(true);
    setError('');
    const pos = await getPos();
    if (!pos) {
      setError('Allow location access so we can place you on the map.');
    } else {
      try {
        await setAvailability(!online, pos.latitude, pos.longitude);
        await load();
      } catch (e) {
        setError(e.message || 'Could not change availability.');
      }
    }
    setBusy(false);
  }

  const selected = (p?.categories || []).map((c) => c.id ?? c);
  const hint = !verified
    ? 'An admin must verify you before you can go online.'
    : !ready
      ? 'Finish the checklist below to go online.'
      : online
        ? 'You are online and sharing your location.'
        : 'You are offline.';

  return (
    <PageShell title="Helper dashboard" subtitle="Go online to receive nearby requests.">
      <div className="space-y-5">
        {p && <ActiveJobCard />}
        {p && <AdminSupportCard />}
        <Card>
          {error && <p className="mb-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
          {!p && !error && <p className="py-6 text-center text-slate-400">Loading…</p>}
          {p && (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">Verification</span>
                  <StatusBadge status={status} />
                </div>
                <p className="text-sm text-slate-600">{hint}</p>
              </div>
              <Button
                variant={online ? 'danger' : 'primary'}
                loading={busy}
                disabled={!online && !ready}
                onClick={toggle}
                className="w-full sm:w-auto"
              >
                {online ? 'Go offline' : 'Go online'}
              </Button>
            </div>
          )}
        </Card>
        {p && <ProfileChecklist profile={p} verified={verified} />}
        {p && <IncomingList />}
        {p && <HelperCategories selected={selected} onSaved={load} />}
      </div>
    </PageShell>
  );
}