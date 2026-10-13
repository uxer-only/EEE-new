import { PublicPage } from '@/components/site/Shell';
import CopyEmail from './CopyEmail';

export const metadata = {
  title: 'Contact',
  description: 'Questions about advertising, your profile or a report? E-mail the Elite Escorts Europe team. We reply within 24–48 hours on working days.',
  alternates: { canonical: '/contact' },
};

const EMAIL = 'info@eliteescortseurope.eu';
const ic = (d) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7A2357" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
const MAIL = <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>;
const INFO = [
  { title: 'Response time', text: 'We typically respond within 24–48 hours, Monday to Friday.', icon: ic(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>), testId: 'contact-hours-card' },
  { title: 'Privacy & discretion', text: 'Your messages are treated with the utmost confidentiality. We never share your details with third parties.', icon: ic(<><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" /><path d="m9 12 2 2 4-4" /></>), testId: 'contact-privacy-card' },
  { title: 'Reports & safety', text: 'To report a fake profile or a safety concern, include the profile link in your email so we can act quickly.', icon: ic(<path d="M5 21V4M5 4h11l-2 4 2 4H5" />), testId: 'contact-reports-card' },
];

export default function ContactPage() {
  return (
    <PublicPage bg="photo" mainClass="pub-contact">
      <div className="x-wrap" data-testid="contact-page">
        <section className="intro">
          <span className="ey">Contact</span>
          <h1>Contact us</h1>
          <p>Have a question about advertising, your profile, a report, or anything else? We&apos;re here to help. Reach out and our team will get back to you as soon as possible.</p>
        </section>
        <div className="cols">
          <section aria-labelledby="mail-h" className="x-glass card mail" data-testid="contact-email-card">
            <span className="bic">{ic(MAIL)}</span>
            <div className="txt">
              <h2 id="mail-h">Email</h2>
              <p>For all enquiries, email us at</p>
              <a href={`mailto:${EMAIL}`} className="addr" data-testid="contact-email-link">{EMAIL}</a>
            </div>
            <div className="acts">
              <a href={`mailto:${EMAIL}`} className="x-btn primary" data-testid="contact-send-email-button">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{MAIL}</svg>
                Send us an email
              </a>
              <CopyEmail email={EMAIL} />
            </div>
          </section>
          <div className="side">
            {INFO.map((c) => (
              <div key={c.title} className="x-glass card info" data-testid={c.testId}>
                <span className="sic">{c.icon}</span>
                <div><h2>{c.title}</h2><p>{c.text}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PublicPage>
  );
}
