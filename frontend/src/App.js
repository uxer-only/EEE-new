import { useEffect } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/sonner';

// Pages
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import AdminLogin from '@/pages/AdminLogin';
import TermsPrivacy from '@/pages/TermsPrivacy';
import VerifyEmail from '@/pages/VerifyEmail';
import AdvertisingPrices from '@/pages/AdvertisingPrices';
import Register from '@/pages/Register';
import ProviderRegister from '@/pages/ProviderRegister';
import AuthCallback from '@/pages/AuthCallback';
import Browse from '@/pages/Browse';
import ProviderDetail from '@/pages/ProviderDetail';
import ClientDashboard from '@/pages/ClientDashboard';
import ProviderDashboard from '@/pages/ProviderDashboard';
import AgencyDashboard from '@/pages/AgencyDashboard';
import Messages from '@/pages/Messages';
import AdminPanel from '@/pages/AdminPanel';
import AdminDashboard from '@/pages/AdminDashboard';
import AdminProviderDetail from '@/pages/AdminProviderDetail';
import AdminAgencies from '@/pages/AdminAgencies';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Subscribe from '@/pages/Subscribe';
import PaymentSuccess from '@/pages/PaymentSuccess';
import ProtectedRoute from '@/components/ProtectedRoute';

function AppRouter() {
  const location = useLocation();
  
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  // Check URL fragment synchronously during render to prevent race conditions
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/terms" element={<TermsPrivacy />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/advertising-prices" element={<AdvertisingPrices />} />
      <Route path="/register" element={<Register />} />
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

      <Route
        path="/dashboard/profile/:providerId"
        element={
          <ProtectedRoute requiredRole="provider">
            <ProviderDashboard />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <Messages />
          </ProtectedRoute>
        }
      />

      <Route
        path="/subscribe"
        element={
          <ProtectedRoute requiredRole="provider">
            <Subscribe />
          </ProtectedRoute>
        }
      />

      <Route
        path="/payment-success"
        element={
          <ProtectedRoute requiredRole="provider">
            <PaymentSuccess />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/admin/providers/:providerId"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminProviderDetail />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/admin/agencies"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminAgencies />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/admin/verifications"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminPanel />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function DashboardRouter() {
  const { user } = require('@/context/AuthContext').useAuth();
  
  if (!user) return null;
  
  if (user.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }
  
  if (user.role === 'provider') {
    if (user.account_type === 'agency') {
      return <AgencyDashboard />;
    }
    return <ProviderDashboard />;
  }
  
  return <ClientDashboard />;
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
        <Toaster position="bottom-right" />
      </AuthProvider>
    </div>
  );
}

export default App;
