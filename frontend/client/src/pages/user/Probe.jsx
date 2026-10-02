import { useEffect, useState } from 'react';
import { api } from '../../api/client';

export default function Probe() {
  const [out, setOut] = useState('Loading...');

  useEffect(() => {
    api('/requests?limit=5')
      .then((d) => setOut(JSON.stringify(d, null, 2)))
      .catch((e) => setOut(`ERROR ${e.status || ''}: ${e.message}`));
  }, []);

  return (
    <main className="p-6">
      <h1 className="mb-3 text-xl font-bold">GET /requests (raw)</h1>
      <pre className="overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-green-300">{out}</pre>
    </main>
  );
}