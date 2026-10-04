import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listMyConversations } from '../../api/directChat';
import { getSocket } from '../../socket/socket';

export default function AdminSupportCard() {
  const [chat, setChat] = useState(null);

  const load = useCallback(async () => {
    try {
      const d = await listMyConversations();
      const rows = Array.isArray(d) ? d : d.items || [];
      setChat(rows.find((c) => !c.requestId) || null);
    } catch {
      /* hidden when the list cannot be loaded */
    }
  }, []);

  useEffect(() => {
    load();
    const s = getSocket();
    if (!s) return;
    s.on('message:new', load);
    s.on('message:read', load);
    return () => {
      s.off('message:new', load);
      s.off('message:read', load);
    };
  }, [load]);

  if (!chat) return null;
  const last = chat.lastMessage;

  return (
    <Link
      to={`/messages/${chat.id}`}
      className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-xl shadow-indigo-100/60 ring-1 ring-slate-100 transition hover:ring-indigo-200 sm:p-5"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-600 text-2xl text-white shadow-md">
        🛡️
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-800">Messages from admin</p>
        <p className="truncate text-sm text-slate-500">
          {last ? (last.hasAttachment && !last.body ? '📷 Image' : last.body) : 'Open the conversation'}
        </p>
      </div>
      {chat.unreadCount > 0 && (
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-500 px-1.5 text-xs font-bold text-white">
          {chat.unreadCount}
        </span>
      )}
    </Link>
  );
}