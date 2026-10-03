import { Link } from "react-router-dom";
import useUnreadCount from "../hooks/useUnreadCount";

export default function NotificationBell() {
  const unread = useUnreadCount();
  const count = typeof unread === "number" ? unread : (unread?.count ?? 0);

  return (
    <Link
      to="/notifications"
      aria-label="Notifications"
      className="relative rounded-xl p-2 text-slate-600 transition hover:bg-slate-100"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0" />
      </svg>
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white ring-2 ring-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
