import { PublicPage } from '@/components/site/Shell';
import { Icon } from '@/components/icons';

export const metadata = {
  title: 'Advertisement plans and prices',
  description: 'Advertise as an independent escort or agency. Simple prices per profile for 7 days, 15 days, 1 month or 3 months, with an optional VIP upgrade.',
  alternates: { canonical: '/advertising-prices' },
};

// Prices per profile (pp). Keep in sync with PLANS / AGENCY_PLANS in backend/server.py.
const PERIODS = [['7 days', '7d'], ['15 days', '15d'], ['1 month', '1m'], ['3 months', '3m']];
const INDEPENDENT = [[30, 10], [50, 15], [90, 25], [240, 60]]; // [plan, optional VIP]
const AGENCY = [
  { label: '1–2 profiles', short: '1–2', prices: [30, 50, 90, 240] },
  { label: '3–6 profiles', short: '3–6', prices: [25, 45, 80, 220] },
  { label: '7 or more profiles', short: '7+', prices: [20, 35, 65, 180], lowest: true },
];

const Per = ({ long, short }) => (<><span className="lg">{long}</span><span className="sh">{short}</span></>);

export default function AdvertisingPricesPage() {
  return (
    <PublicPage bg="photo" mainClass="pub-prices">
      <div className="x-wrap" data-testid="advertising-prices-page">
        <section className="intro">
          <div>
            <span className="ey">Advertisement plans</span>
            <h1>Simple, transparent pricing</h1>
            <p>www.eliteescortseurope.eu charges the following rates per advertisement (1 advertisement = 1 profile). You pay once for the period you choose.</p>
            <span className="upd">Elite Escorts Europe — last updated {new Date().getFullYear()}</span>
          </div>
          <a href="/register/provider" className="x-btn primary">Start advertising</a>
        </section>

        <section aria-labelledby="ind-h" className="x-glass card">
          <div className="head">
            <div>
              <h2 id="ind-h">Independent escorts</h2>
              <p>Price per profile (pp). Choose how long your advertisement stays live.</p>
            </div>
          </div>
          <table className="pt" data-testid="price-table-independent">
            <caption>Prices for independent escorts per profile, by period</caption>
            <thead><tr>{PERIODS.map(([l, s]) => <th key={l} scope="col"><Per long={l} short={s} /></th>)}</tr></thead>
            <tbody>
              <tr>
                {INDEPENDENT.map(([price, vip], i) => (
                  <td key={PERIODS[i][0]}>
                    <span className="pr">€{price} <small>/pp</small></span>
                    <span className="vip"><Per long={`VIP +€${vip} (optional)`} short={`VIP +€${vip}`} /></span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </section>

        <section aria-labelledby="ag-h" className="x-glass card">
          <div className="head">
            <div>
              <h2 id="ag-h">Agencies</h2>
              <p>Price per profile (pp). The more profiles, the lower the price per profile.</p>
            </div>
            <span className="save">Save up to 25% per profile</span>
          </div>
          <table className="pt ag" data-testid="price-table-agency">
            <caption>Agency prices per profile, by number of profiles and period</caption>
            <thead><tr><th scope="col">Profiles</th>{PERIODS.map(([l, s]) => <th key={l} scope="col"><Per long={l} short={s} /></th>)}</tr></thead>
            <tbody>
              {AGENCY.map((t) => (
                <tr key={t.label}>
                  <th scope="row"><span className="tl"><Per long={t.label} short={t.short} />{t.lowest && <span className="low">Lowest price</span>}</span></th>
                  {t.prices.map((v, i) => <td key={PERIODS[i][0]}>€{v} <small>/pp</small></td>)}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="note"><Icon.info /><p>The number of profiles is the profiles that are live, plus the profiles you pay for at checkout.</p></div>
        </section>

        <section aria-labelledby="ref-h" className="x-glass card refund">
          <span className="ric" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7A2357" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l3 2" /></svg>
          </span>
          <div>
            <h2 id="ref-h">Refund policy</h2>
            <p>Your satisfaction matters to us, so we offer a clear refund policy. You can request a refund within 48 hours of your purchase. Refunds are granted if you give a valid reason showing that the purchase was fraudulent or unauthorized, or if we decide at our discretion that a refund is appropriate in your case.</p>
            <p>Contact us at <a href="mailto:info@eliteescortseurope.eu">info@eliteescortseurope.eu</a> to initiate a refund.</p>
          </div>
        </section>
      </div>
    </PublicPage>
  );
}
