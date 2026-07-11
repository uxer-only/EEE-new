import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { CaretLeft, EnvelopeSimple } from 'phosphor-react';
import { forgotPassword } from '@/services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword({ email });
      setSent(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] flex">
      {/* Left - Image (desktop only) */}
      <div
        className="hidden lg:block lg:w-1/2 relative"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1768609957017-c7f4ad4ee9c3?crop=entropy&cs=srgb&fm=jpg&q=85)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0C]/80 to-transparent"></div>
        <Link to="/" className="absolute top-8 left-8 z-10">
          <h1 className="text-2xl md:text-3xl font-playfair font-bold text-[#DA4167]">Only Elite Escorts</h1>
        </Link>
      </div>

      {/* Right - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-8">
        <div className="w-full max-w-md">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-[#A1A1AA] hover:text-[#DA4167] transition-colors mb-10"
            data-testid="back-to-login-link"
          >
            <CaretLeft size={18} />
            <span className="uppercase tracking-wider text-xs">Back to Login</span>
          </Link>

          {!sent ? (
            <>
              <div className="mb-10">
                <h2 className="text-4xl text-[#F2F0ED] mb-3" data-testid="forgot-title">
 Forgot your password?
 </h2>
                <p className="text-[#A1A1AA]">
                  Enter the email associated with your account and we'll send you a link to reset it.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="input-label">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-premium w-full"
                    placeholder="you@example.com"
                    required
                    autoFocus
                    data-testid="forgot-email-input"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="forgot-submit-button"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>

              <p className="text-center text-[#A1A1AA] text-sm mt-8">
                Remembered it?{' '}
                <Link to="/login" className="text-[#DA4167] hover:opacity-80">
                  Sign in
                </Link>
              </p>
            </>
          ) : (
            <div data-testid="forgot-success">
              <div className="w-14 h-14 rounded-full bg-[#832161]/10 border border-[#832161]/30 flex items-center justify-center mb-8">
                <EnvelopeSimple size={26} className="text-[#832161]" weight="thin" />
              </div>
              <h2 className="text-4xl text-[#F2F0ED] mb-4">
 Check your email
 </h2>
              <p className="text-[#A1A1AA] mb-3 leading-relaxed">
                If an account exists for <span className="text-[#F2F0ED]">{email}</span>, we've sent a reset link.
              </p>
              <p className="text-[#A1A1AA] text-sm leading-relaxed mb-10">
                The link expires in 24 hours. Don't forget to check your spam folder.
              </p>
              <button
                onClick={() => { setSent(false); setEmail(''); }}
                className="btn-secondary w-full"
                data-testid="forgot-try-again-button"
              >
                Use a different email
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
