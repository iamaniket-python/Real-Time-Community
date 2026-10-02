import { useAuth } from '../context/auth-context';
import NotificationBell from './NotificationBell';

const ROLE = { USER: 'Member', HELPER: 'Helper', ADMIN: 'Admin' };

export default function HomeHeader({ subtitle }) {
  const { user, logout } = useAuth();
  const initials = (user.name || '?').split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <header className="bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 px-6 pb-28 pt-6 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight">Community Help</span>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white px-2 py-1.5 text-indigo-600 shadow-lg shadow-indigo-900/20">
              <NotificationBell />
            </div>
            <button onClick={logout} className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/25">
              Logout
            </button>
          </div>
        </div>
        <div className="mt-10 flex items-center gap-5">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-2xl font-bold ring-2 ring-white/30 backdrop-blur">
            {initials}
          </span>
          <div>
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide">{ROLE[user.role] || user.role}</span>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Welcome back, {user.name}</h1>
            <p className="mt-1 text-indigo-100">{subtitle}</p>
          </div>
        </div>
      </div>
    </header>
  );
}