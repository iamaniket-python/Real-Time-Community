import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';
import LoginPage from './pages/Authentication/Loginpage';
import RegisterPage from './pages/Authentication/RegisterPage';
import HomePage from './pages/shared/HomePage';
import NotificationsPage from './pages/shared/NotificationsPage';
import CreateRequestPage from './pages/user/CreateRequestPage';
import Probe from './pages/user/Probe';
import ProbeNotif from './pages/user/ProbeNotif';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute roles={['USER']} />}>
        <Route path="/user" element={<HomePage />} />
        <Route path="/user/new" element={<CreateRequestPage />} />
        <Route path="/user/probe" element={<Probe />} />
        <Route path="/user/probe-notif" element={<ProbeNotif />} />
      </Route>
      <Route element={<ProtectedRoute roles={['HELPER']} />}>
        <Route path="/helper" element={<HomePage />} />
      </Route>
      <Route element={<ProtectedRoute roles={['ADMIN']} />}>
        <Route path="/admin" element={<HomePage />} />
      </Route>
      <Route element={<ProtectedRoute roles={['USER', 'HELPER', 'ADMIN']} />}>
        <Route path="/notifications" element={<NotificationsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}