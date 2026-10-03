import { useCallback, useEffect, useState } from 'react';
import { getIncoming } from '../api/helpers';
import { getSocket } from '../socket/socket';

const EVENTS = [
  'connect',
  'request:new',
  'request:unavailable',
  'request:cancelled',
  'request:radius_expanded',
  'incoming:sync',
];

export default function useIncoming() {
  const [items, setItems] = useState([]);
  const [reason, setReason] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const d = await getIncoming();
      setItems(Array.isArray(d) ? d : d.items || d.requests || []);
      setReason(d.reason || null);
      setError('');
    } catch (e) {
      setError(e.message || 'Could not load incoming requests.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const s = getSocket();
    if (!s) return;
    EVENTS.forEach((ev) => s.on(ev, load));
    return () => EVENTS.forEach((ev) => s.off(ev, load));
  }, [load]);

  return { items, reason, loading, error, reload: load };
}