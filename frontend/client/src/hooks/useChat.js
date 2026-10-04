import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/auth-context';
import { getSocket } from '../socket/socket';
import {
  getConversation, getMessages, sendMessage, sendAttachment, markConversationRead,
} from '../api/chat';
import useChatTyping from './useChatTyping';

const rows = (d) => (Array.isArray(d) ? d : d?.items || d?.messages || []);

export default function useChat(requestId, directConvId) {
  const { user } = useAuth();
  const [convId, setConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatOpen, setChatOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { typing, notifyTyping } = useChatTyping(convId, user.id);

  const add = useCallback(
    (m) => setMessages((p) => (p.some((x) => x.id === m.id) ? p : [...p, m])),
    [],
  );

  useEffect(() => {
    let off = false;
    (async () => {
      try {
        let conv = directConvId ? { id: directConvId } : null;
        if (!conv) {
          const c = await getConversation(requestId);
          conv =
            c?.conversation || c?.conversations?.[0] || c?.items?.[0] ||
            (Array.isArray(c) ? c[0] : null) || (c?.id ? c : null);
        }
        if (!conv) throw new Error('Chat is not available for this request yet.');
        const d = await getMessages(conv.id);
        if (off) return;
        setConvId(conv.id);
        setMessages(rows(d).slice().reverse());
        if (d?.chatOpen === false) setChatOpen(false);
        markConversationRead(conv.id).catch(() => {});
      } catch (e) {
        if (!off) setError(e.message || 'Could not load chat.');
      }
      if (!off) setLoading(false);
    })();
    return () => {
      off = true;
    };
  }, [requestId, directConvId]);

  useEffect(() => {
    const s = getSocket();
    if (!s || !convId) return;
    const join = () => s.emit('conversation:join', { conversationId: convId }, () => {});
    const onMsg = ({ message: m }) => {
      if (!m || (m.conversationId && m.conversationId !== convId)) return;
      add(m);
      if (m.senderId !== user.id) markConversationRead(convId).catch(() => {});
    };
    join();
    s.on('connect', join);
    s.on('message:new', onMsg);
    return () => {
      s.emit('conversation:leave', { conversationId: convId }, () => {});
      s.off('connect', join);
      s.off('message:new', onMsg);
    };
  }, [convId, user.id, add]);

  const guard = useCallback(async (fn) => {
    setError('');
    try {
      const d = await fn();
      add(d?.message || d);
    } catch (e) {
      if (e.errorCode === 'CHAT_CLOSED') setChatOpen(false);
      else setError(e.message || 'Could not send.');
      throw e;
    }
  }, [add]);

  const send = useCallback(
    (body) => guard(() => sendMessage(convId, body, crypto.randomUUID())),
    [convId, guard],
  );
  const sendFile = useCallback(
    (file) => guard(() => sendAttachment(convId, file, '', crypto.randomUUID())),
    [convId, guard],
  );

  const refresh = useCallback(async () => {
    const fresh = rows(await getMessages(convId));
    setMessages((p) => p.map((m) => fresh.find((x) => x.id === m.id) || m));
  }, [convId]);

  return {
    ready: !!convId, messages, chatOpen, loading, error, typing,
    send, sendFile, refresh, notifyTyping, me: user.id,
  };
}