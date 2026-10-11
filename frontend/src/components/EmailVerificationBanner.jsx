import { useState } from 'react';
import '@/styles/dashboard.css';
import { toast } from 'sonner';
import { resendVerification } from '@/services/api';
import { notifyError } from '../lib/notify';

export const EmailVerificationBanner = ({ user }) => {
  const [sending, setSending] = useState(false);

  if (!user || user.email_verified !== false) return null;

  const handleResend = async () => {
    setSending(true);
    try {
      const { data } = await resendVerification();
      toast.success(data.message || 'Confirmation email sent. Please check your inbox.');
    } catch (err) {
      notifyError(err, "We couldn't resend the confirmation email.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div role="status" className="vban rej" style={{ marginBottom: 24 }} data-testid="email-verification-banner">
      <span className="i">!</span>
      <span className="tx"><b>Please confirm your e-mail address</b><span>We sent a confirmation link to {user.email}. You can’t activate a profile until it’s confirmed.</span></span>
      <button type="button" onClick={handleResend} disabled={sending} className="x-btn white sm" data-testid="resend-verification-button">{sending ? 'Sending…' : 'Resend e-mail'}</button>
    </div>
  );
};

export default EmailVerificationBanner;
