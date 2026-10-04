import { useState } from 'react';
import { WarningCircle } from 'phosphor-react';
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
    <div
      className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-[#A3243B]/40 bg-[#A3243B]/10 px-4 py-3 mb-6"
      data-testid="email-verification-banner"
    >
      <div className="flex items-start gap-2 flex-1">
        <WarningCircle size={20} weight="fill" className="text-[#A3243B] mt-0.5 shrink-0" />
        <p className="text-sm text-[#3D2645]">
          <span className="font-semibold">Please confirm your email address.</span>{' '}
          We sent a confirmation link to <span className="font-medium">{user.email}</span>. You can't publish or activate a profile until it's confirmed.
        </p>
      </div>
      <button
        onClick={handleResend}
        disabled={sending}
        className="btn-secondary text-sm px-4 py-2 whitespace-nowrap disabled:opacity-50 self-start sm:self-auto !text-[#7A2357] !border-[#7A2357]"
        data-testid="resend-verification-button"
      >
        {sending ? 'Sending…' : 'Resend email'}
      </button>
    </div>
  );
};

export default EmailVerificationBanner;
