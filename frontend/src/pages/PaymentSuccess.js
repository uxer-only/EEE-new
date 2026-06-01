import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, X, ArrowRight } from 'phosphor-react';
import { getSubscriptionStatus } from '@/services/api';
import SiteHeader from '@/components/SiteHeader';

const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 8;

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');
  const [state, setState] = useState({ status: 'pending', tx: null });

  useEffect(() => {
    if (!sessionId) {
      setState({ status: 'error', tx: null });
      return;
    }
    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      try {
        const { data } = await getSubscriptionStatus(sessionId);
        if (cancelled) return;
        if (data.payment_status === 'paid') {
          setState({ status: 'paid', tx: data });
          return;
        }
        if (data.status === 'expired') {
          // True terminal state: Stripe session expired and cannot be paid.
          setState({ status: 'failed', tx: data });
          return;
        }
        attempts += 1;
        if (attempts >= MAX_ATTEMPTS) {
          setState({ status: 'timeout', tx: data });
          return;
        }
        setTimeout(poll, POLL_INTERVAL_MS);
      } catch (pollErr) {
        if (!cancelled) {
          console.warn('Payment polling failed:', pollErr);
          setState({ status: 'error', tx: null });
        }
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-[#0A0A0C]">
      <SiteHeader links={[{ to: '/dashboard', label: 'Dashboard', testId: 'dashboard-link' }]} />
      <div className="pt-32 pb-20 px-6 max-w-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-premium p-10 text-center"
          data-testid="payment-status-card"
        >
          {state.status === 'pending' && (
            <>
              <div className="w-12 h-12 border-2 border-[#C6A87C] border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
              <h1 className="text-3xl text-[#F2F0ED] mb-3">Confirming payment…</h1>
              <p className="text-[#A1A1AA] text-sm">Please don't close this window.</p>
            </>
          )}

          {state.status === 'paid' && (
            <>
              <CheckCircle size={56} weight="fill" className="text-[#22C55E] mx-auto mb-6" />
              <h1 className="text-3xl text-[#F2F0ED] mb-3" data-testid="paid-title">Your profile is live</h1>
              <p className="text-[#A1A1AA] mb-8">
                Thank you. Your Featured listing
                {state.tx?.vip_plan ? ' and VIP Boost are' : ' is'} active.
              </p>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="btn-primary inline-flex items-center gap-2"
                data-testid="go-dashboard-btn"
              >
                Open dashboard <ArrowRight size={18} />
              </button>
            </>
          )}

          {(state.status === 'failed' || state.status === 'error') && (
            <>
              <X size={56} weight="bold" className="text-[#EF4444] mx-auto mb-6" />
              <h1 className="text-3xl text-[#F2F0ED] mb-3">Payment didn't complete</h1>
              <p className="text-[#A1A1AA] mb-8">No charge was made. You can try again any time.</p>
              <button
                type="button"
                onClick={() => navigate('/subscribe')}
                className="btn-primary"
                data-testid="retry-btn"
              >
                Try again
              </button>
            </>
          )}

          {state.status === 'timeout' && (
            <>
              <h1 className="text-3xl text-[#F2F0ED] mb-3">Still processing…</h1>
              <p className="text-[#A1A1AA] mb-8">
                Stripe is taking a bit longer than usual. Your dashboard will update automatically once payment is confirmed.
              </p>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="btn-primary"
                data-testid="go-dashboard-late-btn"
              >
                Go to dashboard
              </button>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
