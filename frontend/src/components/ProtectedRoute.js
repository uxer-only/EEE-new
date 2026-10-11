import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, loading, checkAuth } = useAuth();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(
    location.state?.user ? true : null
  );

  useEffect(() => {
    // Skip the auth check if user data was passed in the navigation state
    if (location.state?.user) return;

    const verifyAuth = async () => {
      try {
        await checkAuth();
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
      }
    };

    verifyAuth();
  }, [location.state, checkAuth]);

  if (loading || isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] flex items-center justify-center">
        <div className="shimmer w-12 h-12 rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
