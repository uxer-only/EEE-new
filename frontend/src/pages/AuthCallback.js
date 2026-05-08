import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { checkAuth } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      try {
        // Extract session_id from URL fragment
        const hash = location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const sessionId = params.get('session_id');

        if (!sessionId) {
          toast.error('Invalid authentication');
          navigate('/login');
          return;
        }

        // Exchange session_id for user data
        const response = await axios.post(
          `${API}/auth/session`,
          { session_id: sessionId },
          { withCredentials: true }
        );

        // Update auth context
        await checkAuth();

        // Navigate to dashboard with user data
        navigate('/dashboard', {
          replace: true,
          state: { user: response.data }
        });
      } catch (error) {
        console.error('Auth callback error:', error);
        toast.error('Authentication failed');
        navigate('/login', { replace: true });
      }
    };

    processSession();
  }, [location, navigate, checkAuth]);

  return (
    <div className="min-h-screen bg-[#0A0A0C] flex items-center justify-center">
      <div className="text-center">
        <div className="shimmer w-16 h-16 rounded-full mx-auto mb-6"></div>
        <p className="text-[#A1A1AA] uppercase tracking-widest text-sm">Authenticating...</p>
      </div>
    </div>
  );
}
