import { useEffect } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/sonner';

// Pages
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ProviderRegister from '@/pages/ProviderRegister';
import AuthCallback from '@/pages/AuthCallback';
import Browse from '@/pages/Browse';
import ProviderDetail from '@/pages/ProviderDetail';
import ClientDashboard from '@/pages/ClientDashboard';
import ProviderDashboard from '@/pages/ProviderDashboard';
import Messages from '@/pages/Messages';
import AdminPanel from '@/pages/AdminPanel';
import AdminDashboard from '@/pages/AdminDashboard';
import AdminProviderDetail from '@/pages/AdminProviderDetail';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Subscribe from '@/pages/Subscribe';
import PaymentSuccess from '@/pages/PaymentSuccess';
import ProtectedRoute from '@/components/ProtectedRoute';
import AddToHomeScreen from '@/components/AddToHomeScreen';

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
      <Route path="/register" element={<Register />} />
      <Route path="/register/provider" element={<ProviderRegister />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      
      <Route path="/browse" element={<Browse />} />
      <Route path="/providers/:id" element={<ProviderDetail />} />
      
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardRouter />
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
  
  if (user.role === 'provider') {
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
          <AddToHomeScreen />
        </BrowserRouter>
        <Toaster position="bottom-right" />
      </AuthProvider>
    </div>
  );
}

export default App;
