import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { notifyError, notifyProblem } from '../lib/notify';
import { Eye, EyeSlash } from 'phosphor-react';
import SiteHeader from '@/components/SiteHeader';

export default function ProviderRegister() {
  const [formData, setFormData] = useState({
    accountType: 'independent',
    email: '',
    password: '',
    agreeTerms: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.agreeTerms) {
      notifyProblem('You need to accept the terms first.', 'Tick the terms and conditions box to continue.');
      return;
    }

    if (formData.password.length < 8) {
      notifyProblem('Your password is too short.', 'Use at least 8 characters, mixing letters and numbers.');
      return;
    }

    setLoading(true);

    try {
      const derivedName = formData.email.split('@')[0];
      localStorage.setItem('pending_account_type', formData.accountType);
      await register(formData.email, formData.password, derivedName, 'provider', formData.accountType);
      toast.success('Welcome to Elite Escorts Europe! Please complete your profile');
      navigate('/dashboard');
    } catch (error) {
      notifyError(error, "We couldn't create your account.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = () => {
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] flex">
      <SiteHeader />
      {/* Left side - Benefits */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[#0A0A0C] to-[#141416] items-center justify-center p-16 pt-32">
        <div className="max-w-lg">
          <h2 className="text-5xl text-[#F2F0ED] mb-6 leading-tight">
 Join Our Exclusive Network
 </h2>
          
          <p className="text-xl text-[#A1A1AA] leading-relaxed">
            Connect with discerning clients in a premium, secure environment designed for independent professionals.
          </p>

          <div className="mt-16 pt-8 border-t border-[#27272A]">
            <p className="text-[#52525B] text-sm">
              All profiles are manually verified to ensure quality and authenticity
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 pt-28 md:pt-32">
        <div className="w-full max-w-md">
          <div className="mb-12">
            <h2 className="text-4xl text-[#F2F0ED] mb-3" data-testid="register-title">
 Create Your Account
 </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="input-label">I am an</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, accountType: 'independent' })}
                  className={`py-3 px-6 border transition-all ${
                    formData.accountType === 'independent'
                      ? 'border-[#A3243B] text-[#A3243B]'
                      : 'border-[#3F3F46] text-[#A1A1AA] hover:border-[#A3243B]'
                  }`}
                  data-testid="account-type-independent"
                >
                  <span className="uppercase tracking-wider text-sm font-medium">Independent</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, accountType: 'agency' })}
                  className={`py-3 px-6 border transition-all ${
                    formData.accountType === 'agency'
                      ? 'border-[#A3243B] text-[#A3243B]'
                      : 'border-[#3F3F46] text-[#A1A1AA] hover:border-[#A3243B]'
                  }`}
                  data-testid="account-type-agency"
                >
                  <span className="uppercase tracking-wider text-sm font-medium">Agency</span>
                </button>
              </div>
            </div>

            <div>
              <label className="input-label">Email address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input-premium w-full"
                placeholder="Enter your email"
                required
                data-testid="email-input"
              />
            </div>

            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input-premium w-full pr-12"
                  placeholder="Create a strong password"
                  required
                  minLength={8}
                  data-testid="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#A3243B] transition-colors"
                  data-testid="toggle-password-button"
                >
                  {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="input-helper">Minimum 8 characters</p>
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="agreeTerms"
                checked={formData.agreeTerms}
                onChange={(e) => setFormData({ ...formData, agreeTerms: e.target.checked })}
                className="mt-1 w-4 h-4 border-[#3F3F46] bg-transparent"
                data-testid="terms-checkbox"
              />
              <label htmlFor="agreeTerms" className="text-[#A1A1AA] text-sm leading-relaxed">
                I agree to the{' '}
                <a href="#" className="text-[#A3243B] hover:opacity-80 transition-opacity">
                  Terms & Conditions
                </a>
                {' '}and{' '}
                <a href="#" className="text-[#A3243B] hover:opacity-80 transition-opacity">
                  Privacy Policy
                </a>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50"
              data-testid="register-button"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#27272A]"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-[#0A0A0C] text-[#52525B] uppercase tracking-wider">
                  Or continue with
                </span>
              </div>
            </div>

            <button
              onClick={handleGoogleRegister}
              className="btn-secondary w-full mt-8 flex items-center justify-center gap-3"
              data-testid="google-register-button"
            >
              <img src="/google-logo.png" alt="Google" className="w-5 h-5" />
              Continue with Google
            </button>
          </div>

          <p className="text-center text-[#A1A1AA] mt-8">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-[#A3243B] hover:opacity-80 transition-opacity"
              data-testid="login-link"
            >
              Sign in here
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}
