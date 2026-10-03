import { useEffect, useState } from 'react';
import { getCategories } from '../api/categories';
import { setHelperCategories } from '../api/helpers';
import Card from './ui/Card';
import Button from './ui/Button';

export default function HelperCategories({ selected, onSaved }) {
  const [all, setAll] = useState([]);
  const [ids, setIds] = useState(selected);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    getCategories()
      .then((d) => setAll(Array.isArray(d) ? d : d?.categories || []))
      .catch(() => setMsg('Could not load categories.'));
  }, []);

  const toggle = (id) =>
    setIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  async function save() {
    setBusy(true);
    setMsg('');
    try {
      await setHelperCategories(ids);
      setMsg('Saved.');
      onSaved?.();
    } catch (e) {
      setMsg(e.message || 'Could not save.');
    }
    setBusy(false);
  }

  return (
    <Card title="What can you help with?">
      <div className="flex flex-wrap gap-2">
        {all.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => toggle(c.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              ids.includes(c.id)
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow'
                : 'bg-slate-100 text-slate-600 hover:bg-indigo-50'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button loading={busy} onClick={save}>Save categories</Button>
        {msg && <span className="text-sm text-slate-500">{msg}</span>}
      </div>
    </Card>
  );
}