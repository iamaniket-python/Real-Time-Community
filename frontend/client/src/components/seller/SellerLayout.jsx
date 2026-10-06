import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/auth-context';

const link = ({ isActive }) =>
  `rounded-xl px-4 py-2 text-sm font-semibold transition ${
    isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
  }`;

export default function SellerLayout() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-3">
          <Link to="/seller" className="mr-2 text-lg font-extrabold text-indigo-700">
            HelpNow Seller
          </Link>
          <NavLink to="/seller" end className={link}>Dashboard</NavLink>
          <NavLink to="/seller/profile" className={link}>Shop profile</NavLink>
          <NavLink to="/seller/documents" className={link}>Documents & photos</NavLink>
          <NavLink to="/seller/products" className={link}>Products</NavLink>
          <button
            onClick={logout}
            className="ml-auto rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            Logout
          </button>
        </div>
      </nav>
      <Outlet />
    </div>
  );
}