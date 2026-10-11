import { useState } from 'react';
import { Link } from 'react-router-dom';
import { createSubscriptionCheckout } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { notifyError, notifyProblem } from '@/lib/notify';
import { LightPage } from '@/components/site/Shell';
import { Card, Arrow, ArrowL } from '@/components/site/Form';
import PlanPicker, { planTotal } from '@/components/onboarding/PlanPicker';
import { fmtDate } from '@/components/advertiser/DashboardParts';

/** Extend, upgrade or renew the plan of the advertiser's profile. */
export default function ChangePlan({ adv, providerId = null, backHref = '/dashboard' }) {
  const { user } = useAuth();
  const sub = adv.sub || {};
  const [plan, setPlan] = useState('featured_1m');
  const [vip, setVip] = useState(!!sub.vip_active);
  const [autoRenew, setAutoRenew] = useState(sub.auto_renew !== false);
  const [paying, setPaying] = useState(false);
  const active = !!sub.featured_active;
  const title = active ? 'Extend or upgrade your plan' : 'Renew your plan';
  const lead = active
    ? `Your current plan runs until ${fmtDate(sub.featured_until)}. New time is added after that, so you never lose days.`
    : sub.featured_until ? `Your plan ended on ${fmtDate(sub.featured_until)}. Renew to put your profile back on Browse.` : 'Choose a plan to put your profile on Browse.';

  const pay = async () => {
    if (user && user.email_verified === false) {
      notifyProblem('Please confirm your e-mail first.', 'Check your inbox for the confirmation link, then come back to pay.');
      return;
    }
    setPaying(true);
    try {
      const { data } = await createSubscriptionCheckout({
        featured_plan: plan, vip_plan: vip ? plan.replace('featured_', 'vip_') : null, auto_renew: autoRenew,
        origin_url: window.location.origin, provider_id: providerId || undefined,
      });
      if (data?.url) window.location.href = data.url;
      else { notifyProblem("We couldn't start checkout.", 'Please try again in a moment.'); setPaying(false); }
    } catch (err) {
      notifyError(err, "We couldn't start checkout.");
      setPaying(false);
    }
  };

  return (
    <LightPage>
      <div className="adv" data-testid="change-plan">
        <header className="ob-head ed">
          <Link to={backHref} className="back"><ArrowL />Back to dashboard</Link>
          <div className="tt">
            <span className="ey">Manage profile</span>
            <h1 className="h">{title}</h1>
            <span className="sub">{lead}</span>
          </div>
        </header>
        <div className="ob-stack">
          <Card level={1} title="Choose your plan" sub="Pick how long you want to stay visible on Browse, and add VIP if you like.">
            <PlanPicker plan={plan} setPlan={setPlan} vip={vip} setVip={setVip} autoRenew={autoRenew} setAutoRenew={setAutoRenew} />
          </Card>
          <div role="group" aria-label="Pay or cancel" className="ob-nav">
            <Link to={backHref} className="x-btn back" style={{ padding: '0 22px' }}>Cancel</Link>
            <div>
              <span className="note">You are sent to our secure payment page.</span>
              <button type="button" className="x-btn primary" onClick={pay} disabled={paying} data-testid="pay-plan">{paying ? 'Opening payment…' : `Pay €${planTotal(plan, vip)} & ${active ? 'extend' : 'renew'}`}<Arrow /></button>
            </div>
          </div>
        </div>
      </div>
    </LightPage>
  );
}
