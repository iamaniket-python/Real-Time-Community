import { NavLink, Outlet } from 'react-router-dom';

const links = [
  { to: '/admin', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/admin/helpers', label: 'Helpers', icon: '🧑‍🔧' },
  { to: '/admin/reports', label: 'Reports', icon: '🚩' },
  { to: '/admin/categories', label: 'Categories', icon: '🗂️' },
  { to: '/admin/stats', label: 'Stats', icon: '📊' },
  { to: '/admin/audit', label: 'Audit log', icon: '📜' },
];

export default function AdminLayout() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row">
      <aside className="lg:w-60 lg:shrink-0">
        <nav className="flex gap-2 overflow-x-auto rounded-3xl bg-white p-3 shadow-xl shadow-indigo-100/60 ring-1 ring-slate-100 lg:sticky lg:top-20 lg:flex-col">
          <p className="hidden px-3 pt-1 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400 lg:block">
            Admin panel
          </p>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-200'
                    : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
                }`
              }
            >
              <span>{l.icon}</span>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}