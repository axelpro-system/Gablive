import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import AppLayout from './components/layout/AppLayout';
import PublicLayout from './components/layout/PublicLayout';

// Lazy loaded Auth pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));

// Lazy loaded Dashboard pages
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const WebinarsListPage = lazy(() => import('./pages/dashboard/WebinarsListPage'));
const CreateWebinarPage = lazy(() => import('./pages/dashboard/CreateWebinarPage'));
const EditWebinarPage = lazy(() => import('./pages/dashboard/EditWebinarPage'));
const AdminGatewayPage = lazy(() => import('./pages/dashboard/AdminGatewayPage'));
const GlobalAnalyticsPage = lazy(() => import('./pages/dashboard/GlobalAnalyticsPage'));
const LeadsPage = lazy(() => import('./pages/dashboard/LeadsPage'));
const SettingsPage = lazy(() => import('./pages/dashboard/SettingsPage'));
const AuditLogPage = lazy(() => import('./pages/dashboard/AuditLogPage'));
const UsersPage = lazy(() => import('./pages/dashboard/UsersPage'));
const PageTemplatesEditor = lazy(() => import('./components/editor/PageTemplatesEditor'));

// Lazy loaded Public pages
const RegistrationPage = lazy(() => import('./pages/public/RegistrationPage'));
const WaitRoomPage = lazy(() => import('./pages/public/WaitRoomPage'));
const WebinarRoomPage = lazy(() => import('./pages/public/WebinarRoomPage'));
const ReplayPage = lazy(() => import('./pages/public/ReplayPage'));

function LoadingFallback() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-gray-900, #0f172a)'
    }}>
      <div className="spinner spinner-lg" />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingFallback />;
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  return children;
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingFallback />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Public webinar pages (no auth needed) */}
          <Route element={<PublicLayout />}>
            <Route path="/register/:slug" element={<RegistrationPage />} />
            <Route path="/wait/:slug" element={<WaitRoomPage />} />
            <Route path="/room/:slug" element={<WebinarRoomPage />} />
            <Route path="/replay/:slug" element={<ReplayPage />} />
          </Route>

          {/* Auth pages (redirect if logged in) */}
          <Route
            path="/auth/login"
            element={
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            }
          />
          <Route
            path="/auth/register"
            element={
              <GuestRoute>
                <RegisterPage />
              </GuestRoute>
            }
          />

          {/* Protected dashboard pages */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/webinars" element={<WebinarsListPage />} />
            <Route path="/webinars/create" element={<CreateWebinarPage />} />
            <Route path="/webinars/:id" element={<EditWebinarPage />} />
            <Route path="/analytics" element={<GlobalAnalyticsPage />} />
            <Route path="/leads" element={<LeadsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/admin" element={<AdminGatewayPage />} />
            <Route path="/audit" element={<AuditLogPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/admin/page-templates" element={<PageTemplatesEditor />} />
          </Route>

          {/* Redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
