import { useEffect, useState } from 'react';
import { getBusiness } from '../../api/helperBusiness';
import PageShell from '../../components/ui/PageShell';
import BusinessForm from '../../components/helper/BusinessForm';
import DocumentUploads from '../../components/helper/DocumentUploads';

export default function HelperProfile() {
  const [biz, setBiz] = useState(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    getBusiness()
      .then((d) => setBiz(d.business))
      .catch((e) => setError(e.message || 'Could not load your profile.'));
  }, []);

  return (
    <PageShell
      title="My profile"
      subtitle="Customers see your shop details, masked ID numbers and rating once you accept a job."
    >
      <div className="space-y-6">
        {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        {biz === undefined && !error && (
          <p className="rounded-3xl bg-white p-8 text-center text-slate-400 shadow-xl shadow-indigo-100/60">Loading…</p>
        )}
        {biz !== undefined && <BusinessForm initial={biz} onSaved={setBiz} />}
        {biz !== undefined && <DocumentUploads />}
      </div>
    </PageShell>
  );
}