import { useCallback, useEffect, useState } from 'react';
import { getAuditLog } from '../../api/admin';
import PageShell from '../../components/ui/PageShell';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function AdminAudit() {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (c) => {
    setLoading(true);
    try {
      const d = await getAuditLog(c);
      const rows = Array.isArray(d) ? d : d.items || d.logs || d.entries || [];
      setItems((p) => (c ? [...p, ...rows] : rows));
      setCursor(d.nextCursor || null);
    } catch (e) {
      setError(e.message || 'Could not load the audit log.');
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <PageShell title="Audit log" subtitle="Every admin action, newest first.">
      <Card>
        {error && <p className="mb-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        {!loading && !items.length && !error && <p className="py-8 text-center text-slate-500">No entries.</p>}
        <ul className="divide-y divide-slate-100">
          {items.map((a) => {
            const extra = a.metadata || a.details || a.meta;
            return (
              <li key={a.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-800">{String(a.action || '').replace(/_/g, ' ')}</p>
                  <span className="text-xs text-slate-500">
                    {new Date(a.createdAt || a.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  By {a.actor?.name || a.actorId || a.adminId || 'unknown'}
                  {a.entityType && ` · ${a.entityType} ${a.entityId ?? ''}`}
                </p>
                {extra && (
                  <pre className="mt-1 overflow-x-auto rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                    {typeof extra === 'string' ? extra : JSON.stringify(extra)}
                  </pre>
                )}
              </li>
            );
          })}
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