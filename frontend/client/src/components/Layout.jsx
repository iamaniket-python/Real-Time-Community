import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import NotificationBell from './NotificationBell';
import Button from './ui/Button';

const LINKS = {
  USER: [
    ['/requests/new', 'Ask for help'],
    ['/requests', 'My requests'],
  ],
  HELPER: [
    ['/helper', 'Dashboard'],
    ['/helper/jobs', 'My jobs'],
  ],
  ADMIN: [
    ['/admin', 'Home'],
    ['/admin/helpers', 'Helpers'],
    ['/admin/reports', 'Reports'],
    ['/admin/categories', 'Categories'],
    ['/admin/stats', 'Stats'],
    ['/admin/audit', 'Audit'],
  ],
};

const linkClass = ({ isActive }) =>
  `rounded-xl px-3 py-2 text-sm font-medium transition ${
    isActive
      ? 'bg-indigo-50 text-indigo-700'
      : 'text-slate-600 hover:bg-slate-100'
  }`;

export default function Layout() {
  const { user, logout } = useAuth();
  const links = LINKS[user?.role] || [];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <nav className="sticky top-0 z-[1000] border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
          <span className="mr-4 bg-gradient-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-lg font-extrabold text-transparent">
            HelpNow
          </span>
          <div className="flex flex-1 flex-wrap gap-1">
            {links.map(([to, label]) => (
              <NavLink key={to} to={to} end className={linkClass}>
                {label}
              </NavLink>
            ))}
          </div>
          <NotificationBell />
          <span className="hidden max-w-32 truncate text-sm text-slate-500 sm:block">
            {user?.name || user?.email}
          </span>
          <Button variant="ghost" onClick={logout} className="!px-3 !py-2">
            Log out
          </Button>
        </div>
      </nav>
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}