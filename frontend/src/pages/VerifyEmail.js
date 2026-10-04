import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { verifyEmail } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import SiteHeader from '@/components/SiteHeader';
import { CheckCircle, XCircle, CircleNotch } from 'phosphor-react';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const { checkAuth } = useAuth();
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [message, setMessage] = useState('');
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return; // guard against React 18 StrictMode double-invoke consuming the one-time token
    ranRef.current = true;
    const token = params.get('token');
    if (!token) {
      setStatus('error');
      setMessage('This confirmation link is missing its token. Please use the link from your email.');
      return;
    }
    (async () => {
      try {
        const { data } = await verifyEmail(token);
        setStatus('success');
        setMessage(data.message || 'Your email has been confirmed.');
        checkAuth();
      } catch (err) {
        setStatus('error');
        setMessage(err?.response?.data?.detail || "We couldn't confirm your email. The link may have expired.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-[#F2F0ED]" data-testid="verify-email-page">
      <SiteHeader />
      <div className="max-w-md mx-auto px-6 pt-40 pb-20 text-center">
        {status === 'verifying' && (
          <div data-testid="verify-status-verifying">
            <CircleNotch size={48} className="mx-auto text-[#7A2357] animate-spin" />
            <h1 className="font-playfair text-3xl text-[#7A2357] mt-6 mb-2">Confirming your email…</h1>
            <p className="text-[#A1A1AA] text-sm">Just a moment.</p>
          </div>
        )}
        {status === 'success' && (
          <div data-testid="verify-status-success">
            <CheckCircle size={56} weight="fill" className="mx-auto text-[#4ade80]" />
            <h1 className="font-playfair text-3xl text-[#7A2357] mt-6 mb-2">Email confirmed</h1>
            <p className="text-[#A1A1AA] text-sm mb-8">{message}</p>
            <Link to="/dashboard" className="btn-primary inline-block px-8" data-testid="verify-go-dashboard">
              Go to my dashboard
            </Link>
          </div>
        )}
        {status === 'error' && (
          <div data-testid="verify-status-error">
            <XCircle size={56} weight="fill" className="mx-auto text-[#A3243B]" />
            <h1 className="font-playfair text-3xl text-[#7A2357] mt-6 mb-2">Confirmation failed</h1>
            <p className="text-[#A1A1AA] text-sm mb-8">{message}</p>
            <Link to="/dashboard" className="btn-primary inline-block px-8" data-testid="verify-go-dashboard">
              Go to my dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
