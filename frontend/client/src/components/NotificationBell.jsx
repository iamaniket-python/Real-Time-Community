import { Link } from 'react-router-dom';
import useUnreadCount from '../hooks/useUnreadCount';

export default function NotificationBell() {
  const count = useUnreadCount();
  return (
    <Link to="/notifications" aria-label="Notifications" className="relative grid h-10 w-10 place-items-center rounded-full bg-indigo-50 text-xl transition hover:bg-indigo-100">
      🔔
      {count > 0 && (
        <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-500 px-1.5 text-center text-xs font-bold leading-5 text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}