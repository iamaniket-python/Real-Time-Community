import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import { roleHome } from './rolehome';

export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();

  if (loading) return <p className="p-6">Loading...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={roleHome(user.role)} replace />;
  }
  return <Outlet />;
}