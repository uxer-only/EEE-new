import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Eye, EyeSlash } from 'phosphor-react';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await register(formData.email, formData.password, formData.name, 'provider');
      toast.success('Account created successfully');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const handleGoogleRegister = () => {
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] flex">
      {/* Left side - Image */}
      <div
        className="hidden lg:block lg:w-1/2 relative"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1758551038941-a67e29026bff?crop=entropy&cs=srgb&fm=jpg&q=85)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0C]/80 to-transparent"></div>
        <Link to="/" className="absolute top-8 left-8 z-10">
          <h1 className="text-2xl md:text-3xl font-playfair font-bold text-[#DA4167]">Only Elite Escorts</h1>
        </Link>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-12">
            <h2 className="text-4xl text-[#F2F0ED] mb-3" data-testid="register-title">
              Join Only Elite Escorts
            </h2>
            <p className="text-[#A1A1AA]">
              Create your account to get started
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Sign up with Google */}
            <div>
              <label className="input-label">Sign up with</label>
              <button
                type="button"
                onClick={handleGoogleRegister}
                className="btn-secondary w-full flex items-center justify-center gap-3"
                data-testid="google-register-button"
              >
                <img src="/google-logo.png" alt="Google" className="w-5 h-5" />
                Continue with Google
              </button>
            </div>

            {/* Divider */}
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

            {/* Full Name */}
            <div>
              <label className="input-label">Full name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-premium w-full"
                placeholder="Enter your full name"
                required
                data-testid="name-input"
              />
            </div>

            {/* Email Address */}
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

            {/* Password */}
            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input-premium w-full pr-12"
                  placeholder="Create a password"
                  required
                  minLength={6}
                  data-testid="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#DA4167] transition-colors"
                  data-testid="toggle-password-button"
                >
                  {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="input-helper">Minimum 6 characters</p>
            </div>

            {/* Create Account Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50"
              data-testid="register-button"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Already have an account */}
          <p className="text-center text-[#A1A1AA] mt-8">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-[#DA4167] hover:opacity-80 transition-opacity"
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
