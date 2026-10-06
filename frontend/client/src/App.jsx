import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import SellerLayout from './components/seller/SellerLayout';
import LoginPage from './pages/Authentication/Loginpage';
import RegisterPage from './pages/Authentication/RegisterPage';
import LandingPage from './pages/shared/LandingPage';
import HomePage from './pages/shared/HomePage';
import NotificationsPage from './pages/shared/NotificationsPage';
import ChatPage from './pages/shared/ChatPage';
import ChatConversationPage from './pages/shared/ChatConversationPage';
import ErrorPage from './pages/shared/ErrorPage';
import CreateRequestPage from './pages/user/CreateRequestPage';
import MyRequests from './pages/user/MyRequests';
import RequestDetail from './pages/user/RequestDetail';
import Probe from './pages/user/Probe';
import ProbeNotif from './pages/user/ProbeNotif';
import HelperDashboard from './pages/helper/HelperDashboard';
import HelperJobs from './pages/helper/HelperJobs';
import HelperProfile from './pages/helper/HelperProfile';
import SellerLoginPage from './pages/seller/SellerLoginPage';
import SellerRegisterPage from './pages/seller/SellerRegisterPage';
import SellerDashboard from './pages/seller/SellerDashboard';
import SellerProfile from './pages/seller/SellerProfile';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminHelpers from './pages/admin/AdminHelpers';
import AdminHelperDetail from './pages/admin/AdminHelperDetail';
import AdminReports from './pages/admin/AdminReports';
import AdminCategories from './pages/admin/AdminCategories';
import AdminStats from './pages/admin/AdminStats';
import AdminAudit from './pages/admin/AdminAudit';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/seller/login" element={<SellerLoginPage />} />
      <Route path="/seller/register" element={<SellerRegisterPage />} />
      <Route path="/error/:code" element={<ErrorPage />} />
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
          <Route path="/helper/profile" element={<HelperProfile />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute roles={['SELLER']} loginPath="/seller/login" />}>
        <Route element={<SellerLayout />}>
          <Route path="/seller" element={<SellerDashboard />} />
          <Route path="/seller/profile" element={<SellerProfile />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute roles={['ADMIN']} />}>
        <Route element={<Layout />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/helpers" element={<AdminHelpers />} />
            <Route path="/admin/helpers/:id" element={<AdminHelperDetail />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/admin/categories" element={<AdminCategories />} />
            <Route path="/admin/stats" element={<AdminStats />} />
            <Route path="/admin/audit" element={<AdminAudit />} />
          </Route>
        </Route>
      </Route>
      <Route element={<ProtectedRoute roles={['USER', 'HELPER', 'ADMIN']} />}>
        <Route element={<Layout />}>
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/chat/:requestId" element={<ChatPage />} />
          <Route path="/messages/:conversationId" element={<ChatConversationPage />} />
        </Route>
      </Route>
      <Route path="*" element={<ErrorPage code={404} />} />
    </Routes>
  );
}