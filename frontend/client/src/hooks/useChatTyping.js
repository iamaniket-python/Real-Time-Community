import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket } from '../socket/socket';

export default function useChatTyping(convId, myId) {
  const [typing, setTyping] = useState(false);
  const t = useRef({});

  useEffect(() => {
    const s = getSocket();
    if (!s || !convId) return;
    const handler = (value) => ({ conversationId, userId }) => {
      if (conversationId !== convId || userId === myId) return;
      setTyping(value);
      clearTimeout(t.current.hide);
      if (value) t.current.hide = setTimeout(() => setTyping(false), 4000);
    };
    const start = handler(true);
    const stop = handler(false);
    s.on('typing:start', start);
    s.on('typing:stop', stop);
    return () => {
      s.off('typing:start', start);
      s.off('typing:stop', stop);
      clearTimeout(t.current.hide);
    };
  }, [convId, myId]);

  const notifyTyping = useCallback(() => {
    const s = getSocket();
    if (!s || !convId) return;
    if (!t.current.sent) {
      t.current.sent = true;
      s.emit('typing:start', { conversationId: convId }, () => {});
    }
    clearTimeout(t.current.stop);
    t.current.stop = setTimeout(() => {
      t.current.sent = false;
      s.emit('typing:stop', { conversationId: convId }, () => {});
    }, 1500);
  }, [convId]);

  return { typing, notifyTyping };
}