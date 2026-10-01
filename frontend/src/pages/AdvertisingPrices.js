import SiteHeader from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

const H2 = ({ children }) => (
  <h2 className="font-manrope font-semibold text-2xl md:text-3xl text-[#E8799B] mt-12 mb-4">{children}</h2>
);
const H4 = ({ children }) => (
  <h4 className="font-manrope font-semibold text-sm md:text-base text-[#E8799B] mt-6 mb-2">{children}</h4>
);
const P = ({ children }) => (
  <p className="text-[#B8B8BE] text-sm leading-relaxed mb-4">{children}</p>
);

export default function AdvertisingPrices() {
  return (
    <div className="min-h-screen bg-[#0A0A0C] text-[#F2F0ED]" data-testid="advertising-prices-page">
      <SiteHeader />
      <div className="max-w-3xl mx-auto px-6 pt-28 md:pt-32 pb-20">
        <h1 className="font-manrope font-semibold text-4xl md:text-5xl text-[#E8799B] mb-2">Advertising Prices</h1>
        <p className="text-[#71717A] text-xs mb-8">Elite Escorts Europe — last updated {new Date().getFullYear()}</p>

        <P>Www.eliteescortseurope.eu charges the following rates per advertisement (= 1 profile):</P>

        <H4>Independent advertisers (per profile)</H4>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm border border-[#27272A]" data-testid="price-table-independent">
            <thead>
              <tr className="bg-[#DA4167]/15 text-[#F2F0ED]">
                <th className="text-left px-4 py-2 border border-[#27272A]">7 days</th>
                <th className="text-left px-4 py-2 border border-[#27272A]">15 days</th>
                <th className="text-left px-4 py-2 border border-[#27272A]">1 month</th>
                <th className="text-left px-4 py-2 border border-[#27272A]">3 months</th>
              </tr>
            </thead>
            <tbody className="text-[#B8B8BE]">
              <tr>
                {['€ 30', '€ 50', '€ 90', '€ 240'].map((c, j) => (
                  <td key={j} className="px-4 py-2 border border-[#27272A]">{c}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <H4>Agencies (pp = per profile)</H4>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm border border-[#27272A]" data-testid="price-table-agency">
            <thead>
              <tr className="bg-[#DA4167]/15 text-[#F2F0ED]">
                <th className="text-left px-4 py-2 border border-[#27272A]">Profiles</th>
                <th className="text-left px-4 py-2 border border-[#27272A]">7 days</th>
                <th className="text-left px-4 py-2 border border-[#27272A]">15 days</th>
                <th className="text-left px-4 py-2 border border-[#27272A]">1 month</th>
                <th className="text-left px-4 py-2 border border-[#27272A]">3 months</th>
              </tr>
            </thead>
            <tbody className="text-[#B8B8BE]">
              {[
                ['3 – 6', '€ 25 /pp', '€ 52 /pp', '€ 77 /pp', '€ 205 /pp'],
                ['7 – …', '€ 20 /pp', '€ 35 /pp', '€ 60 /pp', '€ 150 /pp'],
              ].map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => <td key={j} className="px-4 py-2 border border-[#27272A]">{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <H2>Refund policy</H2>
        <P>Your satisfaction matters to us, so we offer a clear refund policy. You can request a refund within 48 hours of your purchase. Refunds are granted if you give a valid reason showing that the purchase was fraudulent or unauthorized, or if we decide at our discretion that a refund is appropriate in your case.</P>
        <P>Contact us at info@eliteescortseurope.eu to initiate a refund.</P>
      </div>
      <SiteFooter />
    </div>
  );
}
