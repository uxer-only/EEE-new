import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Eye, EyeSlash, CheckCircle } from 'phosphor-react';

export default function ProviderRegister() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.agreeTerms) {
      toast.error('Please agree to the terms and conditions');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      await register(formData.email, formData.password, formData.name, 'provider');
      toast.success('Welcome to Only Elite Escorts! Please complete your profile');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = () => {
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const benefits = [
    'Reach verified, high-end clientele',
    'Secure payment processing',
    'Professional profile showcase',
    'Verified provider badge',
    'Private messaging system',
    'Flexible scheduling tools'
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0C] flex">
      {/* Left side - Benefits */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[#0A0A0C] to-[#141416] items-center justify-center p-16">
        <div className="max-w-lg">
          <Link to="/" className="mb-12 inline-block">
            <h1 className="text-3xl md:text-4xl font-playfair font-bold text-[#DA4167]">Only Elite Escorts</h1>
          </Link>
          
          <h2 className="text-5xl text-[#F2F0ED] mb-6 leading-tight">
 Join Our Exclusive Network
 </h2>
          
          <p className="text-xl text-[#A1A1AA] mb-12 leading-relaxed">
            Connect with discerning clients in a premium, secure environment designed for independent professionals.
          </p>

          <div className="space-y-6">
            {benefits.map((benefit, index) => (
              <div key={benefit} className="flex items-start gap-4" data-testid={`benefit-${index}`}>
                <CheckCircle size={24} weight="fill" className="text-[#C6A87C] flex-shrink-0 mt-1" />
                <p className="text-[#A1A1AA] text-lg">{benefit}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 pt-8 border-t border-[#27272A]">
            <p className="text-[#52525B] text-sm">
              All profiles are manually verified to ensure quality and authenticity
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link to="/" className="lg:hidden mb-8 inline-block">
            <h1 className="text-2xl md:text-3xl font-playfair font-bold text-[#DA4167]">Only Elite Escorts</h1>
          </Link>

          <div className="mb-12">
            <h2 className="text-4xl text-[#F2F0ED] mb-3" data-testid="register-title">
 Create Your Account
 </h2>
            <p className="text-[#A1A1AA]">
              Begin your journey as a verified provider
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="input-label">Full name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-premium w-full"
                placeholder="Enter your professional name"
                required
                data-testid="name-input"
              />
              <p className="input-helper">This will be displayed on your profile</p>
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
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#C6A87C] transition-colors"
                  data-testid="toggle-password-button"
                >
                  {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="input-helper">Minimum 8 characters</p>
            </div>

            <div>
              <label className="input-label">Confirm password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="input-premium w-full pr-12"
                  placeholder="Re-enter your password"
                  required
                  data-testid="confirm-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#C6A87C] transition-colors"
                  data-testid="toggle-confirm-password-button"
                >
                  {showConfirmPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                </button>
              </div>
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
                <a href="#" className="text-[#C6A87C] hover:text-[#D4B88C] transition-colors">
                  Terms & Conditions
                </a>
                {' '}and{' '}
                <a href="#" className="text-[#C6A87C] hover:text-[#D4B88C] transition-colors">
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
              {loading ? 'Creating Account...' : 'Create Provider Account'}
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
              className="text-[#C6A87C] hover:text-[#D4B88C] transition-colors"
              data-testid="login-link"
            >
              Sign in here
            </Link>
          </p>

          <p className="text-center text-[#52525B] text-xs mt-8">
            Looking to book instead?{' '}
            <Link
              to="/register"
              className="text-[#C6A87C] hover:text-[#D4B88C] transition-colors"
            >
              Register as a client
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
