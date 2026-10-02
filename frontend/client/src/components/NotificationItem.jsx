import { timeAgo } from '../utils/timeAgo';

// Assumed item fields: id, type, title, body, isRead (or readAt), createdAt.
function iconFor(type) {
  const t = String(type || '').toUpperCase();
  if (t.includes('MESSAGE') || t.includes('CHAT')) return '💬';
  if (t.includes('RATING')) return '⭐';
  if (t.includes('CANCEL') || t.includes('REJECT')) return '⚠️';
  if (t.includes('ACCEPT') || t.includes('COMPLETE')) return '✅';
  if (t.includes('REQUEST') || t.includes('STATUS')) return '🆘';
  return '🔔';
}

export default function NotificationItem({ n, onOpen, onMarkRead }) {
  const read = n.isRead ?? Boolean(n.readAt);

  return (
    <li className={`flex items-start gap-4 rounded-2xl p-4 ring-1 transition ${
      read ? 'bg-white ring-slate-100' : 'bg-indigo-50/70 ring-indigo-100'
    }`}>
      <button type="button" onClick={() => onOpen(n)} className="flex min-w-0 flex-1 items-start gap-4 text-left">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${
          read ? 'bg-slate-100 grayscale' : 'bg-gradient-to-br from-indigo-600 to-violet-600 shadow-md shadow-indigo-200'
        }`}>
          {iconFor(n.type)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className={`truncate text-sm ${read ? 'font-medium text-slate-700' : 'font-bold text-slate-900'}`}>
              {n.title || 'Notification'}
            </span>
            {!read && <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-600" />}
          </span>
          {n.body && <span className="mt-0.5 line-clamp-2 block text-sm text-slate-500">{n.body}</span>}
          <span className="mt-1 block text-xs text-slate-400">{timeAgo(n.createdAt)}</span>
        </span>
      </button>
      {!read && (
        <button type="button" onClick={() => onMarkRead(n)} className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100">
          Mark read
        </button>
      )}
    </li>
  );
}