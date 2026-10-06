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
  REJECTED: 'Verification was rejected. Please review your shop details and documents, then save or upload again to resubmit.',
  SUSPENDED: 'Your shop is suspended and is not visible to customers.',
};

function Item({ done, text, to, optional }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="text-slate-700">
        {done ? '✅' : '⬜'} {text}
        {optional && <span className="text-slate-400"> (optional)</span>}
      </span>
      <Link to={to} className="shrink-0 font-semibold text-indigo-600 hover:underline">
        {done ? 'Edit' : 'Complete'}
      </Link>
    </li>
  );
}

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
                <Item done={seller.profileComplete} text="Shop profile, location and identity numbers" to="/seller/profile" />
                <Item done={seller.documentsComplete} text="GST, PAN and Aadhaar document images" to="/seller/documents" />
                <Item done={seller.galleryCount > 0} text={`Shop photos (${seller.galleryCount}/10)`} to="/seller/documents" optional />
                <li className="text-slate-400">⬜ Products (coming soon)</li>
              </ul>
            </Card>
          </>
        )}
      </div>
    </PageShell>
  );
}