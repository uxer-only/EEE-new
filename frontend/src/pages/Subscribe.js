import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { CheckCircle, Crown, Sparkle, ArrowRight } from 'phosphor-react';
import { useAuth } from '@/context/AuthContext';
import {
  getMySubscription,
  createSubscriptionCheckout
} from '@/services/api';
import SiteHeader from '@/components/SiteHeader';

const FEATURED_OPTIONS = [
  { id: 'featured_2w', label: '2 weeks',  price: 30, perDay: '€2.14 / day' },
  { id: 'featured_4w', label: '4 weeks',  price: 55, perDay: '€1.96 / day', badge: 'Save €5' }
];

const VIP_OPTIONS = [
  { id: 'vip_2w', label: '2 weeks',  price: 15 },
  { id: 'vip_4w', label: '4 weeks',  price: 25, badge: 'Save €5' }
];

export default function Subscribe() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sub, setSub] = useState(null);

  const [featuredPlan, setFeaturedPlan] = useState('featured_4w');
  const [vipEnabled, setVipEnabled] = useState(false);
  const [vipPlan, setVipPlan] = useState('vip_4w');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'provider') {
      navigate('/dashboard');
      return;
    }
    (async () => {
      try {
        const { data } = await getMySubscription();
        setSub(data);
      } catch (e) {
        toast.error('Could not load your subscription');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, navigate]);

  const total = useMemo(() => {
    const f = FEATURED_OPTIONS.find((o) => o.id === featuredPlan)?.price || 0;
    const v = vipEnabled ? VIP_OPTIONS.find((o) => o.id === vipPlan)?.price || 0 : 0;
    return f + v;
  }, [featuredPlan, vipEnabled, vipPlan]);

  const handlePay = async () => {
    setSubmitting(true);
    try {
      const { data } = await createSubscriptionCheckout({
        featured_plan: featuredPlan,
        vip_plan: vipEnabled ? vipPlan : null,
        origin_url: window.location.origin
      });
      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.error('Could not start checkout');
        setSubmitting(false);
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Checkout failed');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C]">
      <SiteHeader />

      <div className="pt-24 md:pt-32 pb-20 px-6 max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#832161] mb-3">Final step</p>
          <h1 className="text-4xl md:text-5xl text-[#F2F0ED] mb-4">
 Activate your profile
 </h1>
          <p className="text-[#A1A1AA] max-w-xl mx-auto">
            A Featured listing makes your profile visible to clients on Browse. Add VIP Boost to
            appear at the top of every search.
          </p>
        </motion.div>

        {/* Existing subscription banner */}
        {sub?.featured_active && (
          <div
            className="mb-8 p-4 border border-[#22C55E]/40 bg-[#22C55E]/5 rounded text-center"
            data-testid="active-banner"
          >
            <p className="text-[#22C55E] text-sm">
              ✓ Your profile is active for {Math.ceil(sub.featured_days_left)} more day{Math.ceil(sub.featured_days_left) === 1 ? '' : 's'}.
              {sub.vip_active && ' VIP Boost included.'}
              {' '}You can purchase additional time below — it stacks onto your current plan.
            </p>
          </div>
        )}

        {/* Featured Listing */}
        <section className="card-premium p-6 md:p-8 mb-6" data-testid="featured-section">
          <div className="flex items-start gap-3 mb-6">
            <Sparkle size={22} weight="fill" className="text-[#832161] mt-1 flex-shrink-0" />
            <div>
              <h2 className="text-2xl text-[#F2F0ED]">Featured Listing</h2>
              <p className="text-[#A1A1AA] text-sm mt-1">
                Required to be visible on Browse. Choose a duration.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEATURED_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFeaturedPlan(opt.id)}
                className={`relative text-left p-6 border-2 transition-all ${
                  featuredPlan === opt.id
                    ? 'border-[#832161] bg-[#832161]/5'
                    : 'border-[#27272A] hover:border-[#3F3F46]'
                }`}
                data-testid={`featured-option-${opt.id}`}
              >
                {opt.badge && (
                  <span className="absolute top-3 right-3 text-[10px] uppercase tracking-wider px-2 py-1 bg-[#832161] text-[#0A0A0C] font-medium">
                    {opt.badge}
                  </span>
                )}
                <p className="text-[#A1A1AA] text-xs uppercase tracking-[0.2em] mb-2">{opt.label}</p>
                <p className="text-4xl text-[#F2F0ED] mb-1">€{opt.price}</p>
                <p className="text-[#71717A] text-xs">{opt.perDay}</p>
                {featuredPlan === opt.id && (
                  <CheckCircle size={20} weight="fill" className="absolute bottom-4 right-4 text-[#832161]" />
                )}
              </button>
            ))}
          </div>
        </section>

        {/* VIP Boost */}
        <section className="card-premium p-6 md:p-8 mb-6" data-testid="vip-section">
          <div className="flex items-start justify-between mb-6 gap-4">
            <div className="flex items-start gap-3">
              <Crown size={22} weight="fill" className="text-[#832161] mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-2xl text-[#F2F0ED]">
 VIP Boost <span className="text-sm uppercase tracking-[0.2em] text-[#71717A] ml-2">Optional</span>
 </h2>
                <p className="text-[#A1A1AA] text-sm mt-1">
                  Be displayed at the very top of Browse, above all standard listings.
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={vipEnabled}
              onClick={() => setVipEnabled(!vipEnabled)}
              className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${
                vipEnabled ? 'bg-[#832161]' : 'bg-[#27272A]'
              }`}
              data-testid="vip-toggle"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-[#F2F0ED] transition-transform ${
                  vipEnabled ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>

          {vipEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {VIP_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setVipPlan(opt.id)}
                  className={`relative text-left p-5 border-2 transition-all ${
                    vipPlan === opt.id
                      ? 'border-[#832161] bg-[#832161]/5'
                      : 'border-[#27272A] hover:border-[#3F3F46]'
                  }`}
                  data-testid={`vip-option-${opt.id}`}
                >
                  {opt.badge && (
                    <span className="absolute top-3 right-3 text-[10px] uppercase tracking-wider px-2 py-1 bg-[#832161] text-[#0A0A0C] font-medium">
                      {opt.badge}
                    </span>
                  )}
                  <p className="text-[#A1A1AA] text-xs uppercase tracking-[0.2em] mb-2">{opt.label}</p>
                  <p className="text-3xl text-[#F2F0ED]">€{opt.price}</p>
                  {vipPlan === opt.id && (
                    <CheckCircle size={18} weight="fill" className="absolute bottom-3 right-3 text-[#832161]" />
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Total + Pay */}
        <section className="card-premium p-6 md:p-8" data-testid="total-section">
          <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
            <div>
              <p className="text-[#A1A1AA] text-xs uppercase tracking-[0.2em] mb-1">Total today</p>
              <p className="text-5xl text-[#F2F0ED]" data-testid="total-amount">€{total}</p>
            </div>
            <div className="text-right">
              <p className="text-[#71717A] text-xs">One-time payment</p>
              <p className="text-[#71717A] text-xs">Secure checkout · Visa, Mastercard, Apple Pay, PayPal & more</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePay}
            disabled={submitting || loading}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
            data-testid="pay-button"
          >
            {submitting ? 'Redirecting to secure checkout…' : (
              <>
                Continue to payment <ArrowRight size={18} />
              </>
            )}
          </button>

          <p className="text-center text-[#52525B] text-xs mt-4">
            Payments are processed by Stripe. We never see your card details.
          </p>
        </section>

        <div className="text-center mt-8">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="text-[#71717A] text-xs uppercase tracking-[0.2em] hover:text-[#A1A1AA]"
            data-testid="skip-link"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
