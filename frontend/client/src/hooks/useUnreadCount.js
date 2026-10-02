import { useEffect, useState } from 'react';
import { getUnreadCount } from '../api/notifications';
import { connectSocket } from '../socket/socket';

const pick = (d) => d?.unreadCount ?? d?.count;

export default function useUnreadCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const socket = connectSocket();
    const update = (d) => {
      const n = pick(d);
      if (typeof n === 'number') setCount(n);
    };
    getUnreadCount().then(update).catch(() => {});
    socket.on('notification:new', update);
    socket.on('notification:count', update);
    return () => {
      socket.off('notification:new', update);
      socket.off('notification:count', update);
    };
  }, []);

  return count;
}