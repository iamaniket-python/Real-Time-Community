import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import PageShell from '../../components/ui/PageShell';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import { normalizeSeller } from './sellerShape';

const NOTE = {
  PENDING: 'Your shop is waiting for verification. Complete your shop profile and documents, then an admin will review it.',
  VERIFIED: 'Your shop is verified. Customers nearby can find it while it is open.',
  REJECTED: 'Verification was rejected. Please review your shop details and documents.',
  SUSPENDED: 'Your shop is suspended and is not visible to customers.',
};

export default function SellerDashboard() {
  const [seller, setSeller] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/sellers/me')
      .then((d) => setSeller(normalizeSeller(d.seller)))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const toggleOpen = async () => {
    setError('');
    setBusy(true);
    try {
      const d = await api('/sellers/me/open', { method: 'PATCH', body: { isOpen: !seller.isOpen } });
      setSeller(normalizeSeller(d.seller));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const profileDone = !!(seller?.shopName && seller?.address && seller?.lat != null && seller?.lng != null);

  return (
    <PageShell title="Seller dashboard" subtitle="Your shop at a glance.">
      <div className="space-y-4">
        {error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {loading && <Card><p className="text-sm text-slate-500">Loading...</p></Card>}

        {seller && (
          <>
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-bold text-slate-900">
                    {seller.shopName || 'Your shop'}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Rating {seller.ratingAvg.toFixed(1)} ({seller.ratingCount} reviews)
                  </p>
                </div>
                <StatusBadge status={seller.verification} />
              </div>
              <p className="mt-4 text-sm text-slate-600">{NOTE[seller.verification] || ''}</p>
            </Card>

            <Card title="Shop status">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-600">
                  {seller.isOpen ? 'Your shop is open for orders.' : 'Your shop is closed. Customers cannot find it.'}
                </p>
                <Button variant={seller.isOpen ? 'secondary' : 'primary'} loading={busy} onClick={toggleOpen}>
                  {seller.isOpen ? 'Close shop' : 'Open shop'}
                </Button>
              </div>
            </Card>

            <Card title="Setup checklist">
              <ul className="space-y-3 text-sm">
                <li className="flex items-center justify-between gap-3">
                  <span className="text-slate-700">
                    {profileDone ? '✅' : '⬜'} Shop profile, address and location
                  </span>
                  <Link to="/seller/profile" className="font-semibold text-indigo-600 hover:underline">
                    {profileDone ? 'Edit' : 'Complete'}
                  </Link>
                </li>
                <li className="text-slate-400">⬜ Documents and gallery (next step)</li>
                <li className="text-slate-400">⬜ Products (coming soon)</li>
              </ul>
            </Card>
          </>
        )}
      </div>
    </PageShell>
  );
}