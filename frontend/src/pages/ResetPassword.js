import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, EyeSlash, CheckCircle } from 'phosphor-react';
import { resetPassword } from '@/services/api';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const invalidToken = !token;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await resetPassword({ token, new_password: password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Could not reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] flex">
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
          <h1 className="text-2xl md:text-3xl font-playfair text-[#C6A87C]">High Class Companionship</h1>
        </Link>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-8">
        <div className="w-full max-w-md">
          {invalidToken ? (
            <div data-testid="reset-invalid">
              <h2 className="text-4xl font-playfair text-[#F2F0ED] mb-4">
                Invalid reset link
              </h2>
              <p className="text-[#A1A1AA] mb-10 leading-relaxed">
                This reset link is malformed or missing. Please request a new one.
              </p>
              <Link to="/forgot-password" className="btn-primary w-full text-center">
                Request new link
              </Link>
            </div>
          ) : success ? (
            <div data-testid="reset-success">
              <div className="w-14 h-14 rounded-full bg-[#C6A87C]/10 border border-[#C6A87C]/30 flex items-center justify-center mb-8">
                <CheckCircle size={28} className="text-[#C6A87C]" weight="thin" />
              </div>
              <h2 className="text-4xl font-playfair text-[#F2F0ED] mb-4">
                Password updated
              </h2>
              <p className="text-[#A1A1AA] leading-relaxed mb-10">
                Your password has been updated successfully. Redirecting you to sign in...
              </p>
              <Link to="/login" className="btn-primary w-full text-center">
                Continue to Login
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-10">
                <h2 className="text-4xl font-playfair text-[#F2F0ED] mb-3" data-testid="reset-title">
                  Create a new password
                </h2>
                <p className="text-[#A1A1AA]">
                  Choose something only you'll remember. At least 8 characters.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="input-label">New password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-premium w-full !pr-12"
                      placeholder="Enter new password"
                      required
                      minLength={8}
                      autoFocus
                      data-testid="new-password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#F2F0ED]"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="input-label">Confirm password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="input-premium w-full"
                    placeholder="Re-enter new password"
                    required
                    minLength={8}
                    data-testid="confirm-password-input"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="reset-submit-button"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
