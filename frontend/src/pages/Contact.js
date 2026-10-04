import SiteHeader from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Envelope, Clock, ShieldCheck } from 'phosphor-react';

const Card = ({ icon: Icon, title, children, testId }) => (
  <div className="bg-white/[0.03] border border-[#27272A] rounded-[8px] p-6" data-testid={testId}>
    <div className="flex items-center gap-3 mb-3">
      <span className="flex items-center justify-center w-10 h-10 rounded-[8px] bg-[#A3243B]/10 text-[#A3243B]">
        <Icon size={20} weight="fill" />
      </span>
      <h3 className="font-manrope font-semibold text-lg text-[#F2F0ED]">{title}</h3>
    </div>
    <div className="text-[#B8B8BE] text-sm leading-relaxed">{children}</div>
  </div>
);

export default function Contact() {
  return (
    <div className="min-h-screen bg-[#0A0A0C] text-[#F2F0ED]" data-testid="contact-page">
      <SiteHeader />
      <div className="max-w-3xl mx-auto px-6 pt-28 md:pt-32 pb-20">
        <h1 className="font-manrope font-semibold text-4xl md:text-5xl text-[#E8799B] mb-2">Contact Us</h1>
        <p className="text-[#71717A] text-xs mb-8">Elite Escorts Europe</p>

        <p className="text-[#B8B8BE] text-sm leading-relaxed mb-10">
          Have a question about advertising, your profile, a report, or anything else?
          We're here to help. Reach out and our team will get back to you as soon as possible.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Card icon={Envelope} title="Email" testId="contact-email-card">
            For all enquiries, email us at{' '}
            <a
              href="mailto:info@eliteescortseurope.eu"
              className="text-[#A3243B] hover:underline break-all"
              data-testid="contact-email-link"
            >
              info@eliteescortseurope.eu
            </a>
          </Card>
          <Card icon={Clock} title="Response time" testId="contact-hours-card">
            We typically respond within 24–48 hours, Monday to Friday.
          </Card>
          <Card icon={ShieldCheck} title="Privacy & discretion" testId="contact-privacy-card">
            Your messages are treated with the utmost confidentiality. We never share your
            details with third parties.
          </Card>
          <Card icon={Envelope} title="Reports & safety" testId="contact-reports-card">
            To report a fake profile or a safety concern, include the profile link in your
            email so we can act quickly.
          </Card>
        </div>

        <div className="mt-12 text-center">
          <a
            href="mailto:info@eliteescortseurope.eu"
            className="btn-primary inline-flex"
            data-testid="contact-send-email-button"
          >
            Send us an email
          </a>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
