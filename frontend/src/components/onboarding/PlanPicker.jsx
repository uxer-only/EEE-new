import { Switch } from '@/components/site/Form';

// Mirrors the backend PLANS allowlist (backend/server.py). Prices in euro.
export const FEATURED_OPTIONS = [
  { id: 'featured_7d', label: '7 days', every: '7 days', days: 7, price: 30, vip: 'vip_7d', vipPrice: 10 },
  { id: 'featured_15d', label: '15 days', every: '15 days', days: 15, price: 50, vip: 'vip_15d', vipPrice: 15 },
  { id: 'featured_1m', label: '1 month', every: 'month', days: 30, price: 90, vip: 'vip_1m', vipPrice: 25 },
  { id: 'featured_3m', label: '3 months', every: '3 months', days: 90, price: 240, vip: 'vip_3m', vipPrice: 60 },
];
const WEEK_RATE = 30 / 7; // the 7-day plan's price per day
export const perDay = (o) => `€${(o.price / o.days).toFixed(2)} / day`;
export const saving = (o) => (o.days === 7 ? '' : `Save ${Math.round((1 - (o.price / o.days) / WEEK_RATE) * 100)}%`);
export const planTotal = (planId, vip) => {
  const o = FEATURED_OPTIONS.find((x) => x.id === planId);
  return o ? o.price + (vip ? o.vipPrice : 0) : 0;
};

const Star = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#B04585" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" /></svg>
);
const Tick = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
);

/** Featured listing durations with a per-plan VIP checkbox, plus optional auto-renew switch. */
export default function PlanPicker({ plan, setPlan, vip, setVip, autoRenew, setAutoRenew, showRenew = true, legendNote = '· required to appear on Browse' }) {
  return (
    <>
      <fieldset className="pl-fs">
        <legend><Star /><span className="t">Featured listing</span><span className="n">{legendNote}</span></legend>
        <div role="radiogroup" aria-label="Listing duration" className="pl-box">
          <div aria-hidden="true" className="pl-hd"><span className="d">Duration</span><span className="pd">Per day</span><span className="sv" /><span className="pr">Price</span></div>
          {FEATURED_OPTIONS.map((o) => {
            const sel = plan === o.id;
            const vipOn = sel && vip;
            return (
              <label key={o.id} className={`pl-row${sel ? ' on' : ''}`} data-testid={`plan-${o.id}`}>
                <input type="radio" name="plan" checked={sel} onChange={() => setPlan(o.id)} />
                <span className="d">{o.label}</span>
                <span className="pd">{perDay(o)}</span>
                <span className="sv">{saving(o) && <span className="save">{saving(o)}</span>}</span>
                <span className="pr">
                  <span className="amt">€{o.price}</span>
                  <button type="button" role="checkbox" aria-checked={vipOn} aria-label={`Add VIP for ${o.label}, +€${o.vipPrice}`}
                    className={`pl-vip${vipOn ? ' on' : ''}`}
                    onClick={(e) => { e.preventDefault(); if (sel) setVip(!vip); else { setPlan(o.id); setVip(true); } }}
                    data-testid={`vip-${o.id}`}>
                    <span className="bx">{vipOn && <Tick />}</span>VIP +€{o.vipPrice}
                  </button>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <p className="pl-help">VIP puts your profile at the very top of Browse for the period you choose.</p>
      {showRenew && (
        <div className="ra-sw">
          <div className="r">
            <span className="tx"><span id="ren-l" className="t">Auto-renew</span><span className="d">Renew automatically when your plan ends. Cancel any time from your dashboard.</span></span>
            <Switch checked={autoRenew} onChange={setAutoRenew} labelledBy="ren-l" testId="auto-renew-toggle" />
          </div>
        </div>
      )}
    </>
  );
}
