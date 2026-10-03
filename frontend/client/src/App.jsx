import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/Authentication/Loginpage';
import RegisterPage from './pages/Authentication/RegisterPage';
import HomePage from './pages/shared/HomePage';
import NotificationsPage from './pages/shared/NotificationsPage';
import ChatPage from './pages/shared/ChatPage';
import CreateRequestPage from './pages/user/CreateRequestPage';
import MyRequests from './pages/user/MyRequests';
import RequestDetail from './pages/user/RequestDetail';
import Probe from './pages/user/Probe';
import ProbeNotif from './pages/user/ProbeNotif';
import HelperDashboard from './pages/helper/HelperDashboard';
import HelperJobs from './pages/helper/HelperJobs';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute roles={['USER']} />}>
        <Route element={<Layout />}>
          <Route path="/user" element={<HomePage />} />
          <Route path="/user/new" element={<CreateRequestPage />} />
          <Route path="/requests/new" element={<CreateRequestPage />} />
          <Route path="/requests" element={<MyRequests />} />
          <Route path="/requests/:id" element={<RequestDetail />} />
          <Route path="/user/probe" element={<Probe />} />
          <Route path="/user/probe-notif" element={<ProbeNotif />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute roles={['HELPER']} />}>
        <Route element={<Layout />}>
          <Route path="/helper" element={<HelperDashboard />} />
          <Route path="/helper/jobs" element={<HelperJobs />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute roles={['ADMIN']} />}>
        <Route element={<Layout />}>
          <Route path="/admin" element={<HomePage />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute roles={['USER', 'HELPER', 'ADMIN']} />}>
        <Route element={<Layout />}>
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/chat/:requestId" element={<ChatPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}