import { Link } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';

export default function SellerDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 px-4 py-10">
      <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-xl shadow-indigo-100/60 ring-1 ring-slate-100">
        <h1 className="text-2xl font-extrabold text-slate-900">Seller dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">
          Welcome{user?.name ? `, ${user.name}` : ''}. Shop profile, documents, products and orders come next.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link to="/" className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-indigo-700 ring-1 ring-slate-200 hover:bg-indigo-50">
            Home
          </Link>
          <button onClick={logout} className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 hover:brightness-110">
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}