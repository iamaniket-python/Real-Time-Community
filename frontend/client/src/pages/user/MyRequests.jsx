import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listRequests } from '../../api/requests';
import PageShell from '../../components/ui/PageShell';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';

export default function MyRequests() {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (c) => {
    setLoading(true);
    try {
      const d = await listRequests({ limit: 10, ...(c && { cursor: c }) });
      const rows = Array.isArray(d) ? d : d.items || d.requests || [];
      setItems((p) => (c ? [...p, ...rows] : rows));
      setCursor(d.nextCursor || null);
    } catch (e) {
      setError(e.message || 'Could not load requests.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const action = (
    <Link to="/requests/new">
      <Button variant="secondary">+ New request</Button>
    </Link>
  );

  return (
    <PageShell title="My requests" subtitle="Everything you've asked for, newest first." action={action}>
      <Card>
        {error && <p className="mb-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        {!loading && !items.length && !error && (
          <p className="py-8 text-center text-slate-500">No requests yet. Ask for help to get started.</p>
        )}
        <ul className="divide-y divide-slate-100">
          {items.map((r) => (
            <li key={r.id}>
              <Link to={`/requests/${r.id}`} className="flex items-center justify-between gap-3 rounded-xl px-2 py-4 transition hover:bg-indigo-50/50">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-800">{r.title}</p>
                  <p className="text-xs text-slate-500">{new Date(r.createdAt || r.created_at).toLocaleString()}</p>
                </div>
                <StatusBadge status={r.status} />
              </Link>
            </li>
          ))}
        </ul>
        {cursor && (
          <Button variant="secondary" loading={loading} onClick={() => load(cursor)} className="mt-4 w-full">
            Load more
          </Button>
        )}
        {loading && !items.length && <p className="py-8 text-center text-slate-400">Loading…</p>}
      </Card>
    </PageShell>
  );
}