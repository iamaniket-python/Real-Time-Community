import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import { roleHome } from './rolehome';

export default function ProtectedRoute({ roles, loginPath = '/login' }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p className="p-6">Loading...</p>;
  if (!user) return <Navigate to={loginPath} replace state={{ from: location }} />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={roleHome(user.role)} replace />;
  }
  return <Outlet />;
}