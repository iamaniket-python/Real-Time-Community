import { useCallback, useEffect, useState } from 'react';
import { listNotifications, markRead, markAllRead } from '../api/notifications';
import { getSocket } from '../socket/socket';

const isRead = (n) => n.isRead ?? Boolean(n.readAt);
const asRead = (n) => ({ ...n, isRead: true, readAt: n.readAt || new Date().toISOString() });

export function useNotifications(unreadOnly) {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let off = false;
    setLoading(true); setError(''); setItems([]); setCursor(null);
    listNotifications(unreadOnly)
      .then((d) => { if (!off) { setItems(d.items || []); setCursor(d.nextCursor || null); } })
      .catch((e) => { if (!off) setError(e.message); })
      .finally(() => { if (!off) setLoading(false); });
    return () => { off = true; };
  }, [unreadOnly]);

  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const onNew = (p) => {
      const n = p?.notification;
      if (n) setItems((cur) => (cur.some((x) => x.id === n.id) ? cur : [n, ...cur]));
    };
    s.on('notification:new', onNew);
    return () => s.off('notification:new', onNew);
  }, []);

  const loadMore = useCallback(async () => {
    try {
      const d = await listNotifications(unreadOnly, cursor);
      setItems((cur) => [...cur, ...(d.items || []).filter((n) => !cur.some((x) => x.id === n.id))]);
      setCursor(d.nextCursor || null);
    } catch (e) { setError(e.message); }
  }, [unreadOnly, cursor]);

  const read = useCallback(async (n) => {
    if (isRead(n)) return;
    try {
      await markRead(n.id);
      setItems((cur) => (unreadOnly ? cur.filter((x) => x.id !== n.id) : cur.map((x) => (x.id === n.id ? asRead(x) : x))));
    } catch (e) { setError(e.message); }
  }, [unreadOnly]);

  const readAll = useCallback(async () => {
    try {
      await markAllRead();
      setItems((cur) => (unreadOnly ? [] : cur.map(asRead)));
    } catch (e) { setError(e.message); }
  }, [unreadOnly]);

  return { items, loading, error, hasMore: Boolean(cursor), loadMore, read, readAll };
}