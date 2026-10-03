import { useEffect, useState } from 'react';
import { getStats, getActiveRequests } from '../../api/admin';
import PageShell from '../../components/ui/PageShell';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';

const flat = (o, p = '') =>
  Object.entries(o || {}).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? flat(v, `${p}${k} `)
      : [[`${p}${k}`, Array.isArray(v) ? v.length : v]],
  );
const label = (k) => k.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_.]/g, ' ');

export default function AdminStats() {
  const [stats, setStats] = useState([]);
  const [active, setActive] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getStats()
      .then((d) => setStats(flat(d.stats || d)))
      .catch((e) => setError(e.message || 'Could not load stats.'));
    getActiveRequests()
      .then((d) => setActive(Array.isArray(d) ? d : d.items || d.requests || []))
      .catch((e) => setError(e.message || 'Could not load active requests.'));
  }, []);

  return (
    <PageShell title="Stats" subtitle="Platform activity at a glance.">
      <div className="space-y-6">
        {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(([k, v]) => (
            <Card key={k}>
              <p className="text-3xl font-bold text-indigo-600">{String(v)}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{label(k)}</p>
            </Card>
          ))}
        </div>
        <Card title="Active requests">
          {!active.length && <p className="py-4 text-center text-slate-500">Nothing active right now.</p>}
          <ul className="divide-y divide-slate-100">
            {active.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-800">{r.title}</p>
                  <p className="text-xs text-slate-500">{r.address}</p>
                </div>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </PageShell>
  );
}