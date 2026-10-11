import { useEffect } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { trackPageView } from '@/services/api';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/sonner';

// Pages
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import AdminLogin from '@/pages/AdminLogin';
import TermsPrivacy from '@/pages/TermsPrivacy';
import VerifyEmail from '@/pages/VerifyEmail';
import AdvertisingPrices from '@/pages/AdvertisingPrices';
import Contact from '@/pages/Contact';
import ProviderRegister from '@/pages/ProviderRegister';
import Browse from '@/pages/Browse';
import ProviderDetail from '@/pages/ProviderDetail';
import ProviderDashboard from '@/pages/ProviderDashboard';
import AgencyArea from '@/pages/AgencyArea';
import Messages from '@/pages/Messages';
import AdminOverview from '@/pages/admin/AdminOverview';
import AdminIndependents from '@/pages/admin/AdminIndependents';
import AdminAdvertiser from '@/pages/admin/AdminAdvertiser';
import AdminAgencies from '@/pages/admin/AdminAgencies';
import AdminVerifications from '@/pages/admin/AdminVerifications';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import PaymentSuccess from '@/pages/PaymentSuccess';
import ProtectedRoute from '@/components/ProtectedRoute';

/** Counts one page view per page visited (the site's own counter; no cookies, admin pages are not counted). */
function PageTracker() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    if (pathname.startsWith('/admin')) return;
    trackPageView(`${pathname}${search}`);
  }, [pathname, search]);
  return null;
}

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/terms" element={<TermsPrivacy />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/advertising-prices" element={<AdvertisingPrices />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/register" element={<Navigate to="/register/provider" replace />} />
      <Route path="/register/provider" element={<ProviderRegister />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      
      <Route path="/browse" element={<Browse />} />
      <Route path="/providers/:id" element={<ProviderDetail />} />
      {/* Agencies no longer have a public page — any /agency/* URL redirects to /browse */}
      <Route path="/agency/*" element={<Navigate to="/browse" replace />} />
      
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardRouter />
          </ProtectedRoute>
        }
      />

      <Route path="/dashboard/edit/:section" element={<ProtectedRoute requiredRole="provider"><ProviderDashboard view="edit" /></ProtectedRoute>} />
      <Route path="/dashboard/plan" element={<ProtectedRoute requiredRole="provider"><ProviderDashboard view="plan" /></ProtectedRoute>} />
      <Route path="/dashboard/defaults/:section" element={<ProtectedRoute requiredRole="provider"><AgencyArea view="defaults" /></ProtectedRoute>} />
      <Route path="/dashboard/companion/new" element={<ProtectedRoute requiredRole="provider"><AgencyArea view="new" /></ProtectedRoute>} />
      <Route path="/dashboard/companion/:providerId" element={<ProtectedRoute requiredRole="provider"><AgencyArea view="companion" /></ProtectedRoute>} />
      <Route path="/dashboard/companion/:providerId/edit/:section" element={<ProtectedRoute requiredRole="provider"><AgencyArea view="companion" /></ProtectedRoute>} />
      <Route path="/dashboard/profile/:providerId" element={<LegacyProfileRedirect />} />
      
      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <Messages />
          </ProtectedRoute>
        }
      />

      <Route path="/subscribe" element={<Navigate to="/dashboard/plan" replace />} />

      <Route
        path="/payment-success"
        element={
          <ProtectedRoute requiredRole="provider">
            <PaymentSuccess />
          </ProtectedRoute>
        }
      />
      
      <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminOverview /></ProtectedRoute>} />
      <Route path="/admin/independents" element={<ProtectedRoute requiredRole="admin"><AdminIndependents /></ProtectedRoute>} />
      <Route path="/admin/providers/:providerId" element={<ProtectedRoute requiredRole="admin"><AdminAdvertiser /></ProtectedRoute>} />
      <Route path="/admin/agencies" element={<ProtectedRoute requiredRole="admin"><AdminAgencies /></ProtectedRoute>} />
      <Route path="/admin/verifications" element={<ProtectedRoute requiredRole="admin"><AdminVerifications /></ProtectedRoute>} />
    </Routes>
  );
}

/** Old agency links (/dashboard/profile/:id and /dashboard/profile/new) → the new companion pages. */
function LegacyProfileRedirect() {
  const { providerId } = useParams();
  return <Navigate to={providerId === 'new' ? '/dashboard/companion/new' : `/dashboard/companion/${providerId}`} replace />;
}

function DashboardRouter() {
  const { user } = require('@/context/AuthContext').useAuth();
  
  if (!user) return null;
  
  if (user.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }
  
  if (user.role === 'provider') {
    if (user.account_type === 'agency') {
      return <AgencyArea />;
    }
    return <ProviderDashboard />;
  }
  
  return <Navigate to="/browse" replace />;
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <PageTracker />
          <AppRouter />
        </BrowserRouter>
        <Toaster position="bottom-right" />
      </AuthProvider>
    </div>
  );
}

export default App;
