import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle, Warning, ArrowRight, Star } from 'phosphor-react';
import { getProviders } from '@/services/api';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import SiteHeader from '@/components/SiteHeader';

export default function Landing() {
  const navigate = useNavigate();
  const [showAgeModal, setShowAgeModal] = useState(false);
  const [providers, setProviders] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(true);

  useEffect(() => {
    // Check if user has already confirmed age
    const ageConfirmed = localStorage.getItem('ageConfirmed');
    if (!ageConfirmed) {
      setShowAgeModal(true);
    }
    
    // Fetch latest providers
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const response = await getProviders({ limit: 18 });
      setProviders(response.data.slice(0, 18));
    } catch (_err) {
      // Landing page failure to load providers is non-blocking — UI shows empty grid.
    } finally {
      setLoadingProviders(false);
    }
  };

  const handleAgeConfirm = () => {
    localStorage.setItem('ageConfirmed', 'true');
    setShowAgeModal(false);
  };

  const handleLeaveWebsite = () => {
    window.location.href = 'https://google.com';
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C]">
      {/* Age Verification Modal */}
      <Dialog open={showAgeModal} onOpenChange={() => {}}>
        <DialogContent className="bg-[#141416] border-[#27272A] text-[#F2F0ED] max-w-md p-0 overflow-hidden" hideClose>
          <div className="p-6 md:p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#C6A87C]/10 flex items-center justify-center">
              <Warning size={32} className="text-[#C6A87C]" weight="fill" />
            </div>
            <h2 className="text-2xl text-[#F2F0ED] mb-4">
 Age Verification Required
 </h2>
            <p className="text-[#A1A1AA] mb-8 text-sm leading-relaxed">
              This website contains adult content and is intended for individuals 18 years of age or older. By entering, you confirm that you are of legal age in your jurisdiction.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleAgeConfirm}
                className="btn-primary w-full"
                data-testid="age-confirm-button"
              >
                I am 18 or older
              </button>
              <button
                onClick={handleLeaveWebsite}
                className="btn-secondary w-full"
                data-testid="leave-website-button"
              >
                Leave Website
              </button>
            </div>
            <div className="mt-6 pt-6 border-t border-[#27272A] flex justify-center gap-6 text-xs text-[#52525B]">
              <Link to="/privacy" className="hover:text-[#DA4167] transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="hover:text-[#DA4167] transition-colors">
                Terms & Conditions
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Floating Header */}
      <SiteHeader
        links={[
          { to: '/browse', label: 'Browse', testId: 'browse-link' },
          { to: '/login', label: 'Login', testId: 'login-link' },
          { to: '/register', label: 'Join', variant: 'primary', testId: 'join-button' }
        ]}
      />

      {/* Hero Section with Overlapping Profiles */}
      <section className="relative" data-testid="hero-section">
        {/* Hero Background - extends behind profiles */}
        <div className="absolute inset-0 z-0 h-[100vh] overflow-hidden">
          <picture>
            <source
              media="(max-width: 767px)"
              type="image/webp"
              srcSet="/hero-bg-mobile.webp"
            />
            <source
              media="(max-width: 767px)"
              srcSet="/hero-bg-mobile.jpg"
            />
            <source type="image/webp" srcSet="/hero-bg.webp" />
            <img
              src="/hero-bg.jpg"
              alt=""
              fetchPriority="high"
              className="w-full h-full object-cover"
              data-testid="hero-bg-image"
            />
          </picture>
          <div className="hero-gradient absolute inset-0"></div>
        </div>

        {/* Hero Text Content */}
        <div className="section-padding relative z-10 pt-32 md:pt-40 pb-12 md:pb-16 w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-5xl mx-auto text-center"
          >
            <h2
              className="text-4xl sm:text-5xl lg:text-6xl font-playfair text-[#F2F0ED] mb-6 leading-[1.3]"
              data-testid="hero-title"
            >
              <span className="block whitespace-nowrap">Bringing your secret wish</span>
              <span className="block whitespace-nowrap">closer to you</span>
            </h2>
            <p
              className="text-base md:text-xl text-[#A1A1AA] max-w-xl mx-auto"
              data-testid="hero-subtitle"
            >
              Discreet. Curated. Exceptional. Connect with verified independent professionals in a safe, premium environment.
            </p>
          </motion.div>
        </div>

        {/* Latest Profiles - Overlapping onto hero */}
        <div className="section-padding relative z-10 pb-12" data-testid="latest-profiles-section">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8 md:mb-12">
              <span className="label-premium">Discover</span>
              <h3 className="text-3xl md:text-4xl lg:text-5xl text-[#F2F0ED] mt-4">
 Latest Profiles
 </h3>
            </div>

            {loadingProviders ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[...Array(18)].map((_, index) => (
                  <div key={index} className="aspect-[3/4] shimmer rounded-sm"></div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {providers.map((provider, index) => (
                  <motion.div
                    key={provider.provider_id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.03 }}
                  >
                    <Link
                      to={`/providers/${provider.provider_id}`}
                      className="block group"
                      data-testid={`profile-card-${index}`}
                    >
                      <div className="relative aspect-[3/4] overflow-hidden bg-[#141416] border border-[#27272A] transition-all duration-300">
                        <img
                          src={provider.photos?.[0] || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'}
                          alt={provider.display_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-black/40 backdrop-blur-sm">
                          <p className="text-[#F2F0ED] font-medium text-sm truncate">
                            {provider.display_name}
                          </p>
                          <p className="text-[#A1A1AA] text-xs truncate">
                            {provider.age && <span>{provider.age}</span>}
                            {provider.age && provider.location?.country && <span> · </span>}
                            {provider.location?.country}
                          </p>
                        </div>
                        {provider.verified && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle size={16} weight="fill" className="text-[#22C55E]" />
                          </div>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}

            {/* CTAs moved below profiles */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-16">
              <Link
                to="/browse"
                className="group relative inline-flex items-center justify-center gap-3 h-[56px] min-w-[240px] px-8 bg-[#DA4167] text-[#FFFFFF] uppercase tracking-[0.2em] text-sm font-semibold overflow-hidden transition-all duration-300 hover:bg-[#c33658] hover:shadow-[0_10px_30px_-8px_rgba(218,65,103,0.55)]"
                data-testid="cta-browse-button"
              >
                <span className="relative z-10">Explore Profiles</span>
                <ArrowRight
                  size={18}
                  weight="bold"
                  className="relative z-10 transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>

              <Link
                to="/register/provider"
                className="group inline-flex items-center justify-center gap-3 h-[56px] min-w-[240px] px-8 bg-transparent border border-[#FFFFFF]/70 text-[#FFFFFF] uppercase tracking-[0.2em] text-sm font-semibold backdrop-blur-sm transition-all duration-300 hover:border-[#FFFFFF] hover:bg-[#FFFFFF]/10"
                data-testid="cta-register-button"
              >
                <Star
                  size={18}
                  weight="fill"
                  className="text-[#DA4167] transition-transform duration-300 group-hover:rotate-90"
                />
                <span>Advertise here</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="section-padding py-12 border-t border-[#27272A]" data-testid="footer">
        <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-4">
          <p className="text-[#52525B] text-sm text-center sm:text-left">
            © 2026 Only Elite Escorts. All rights reserved.
          </p>
          <div className="flex gap-6 sm:gap-8 text-[#52525B] text-sm">
            <button className="hover:text-[#DA4167] transition-colors">Privacy</button>
            <button className="hover:text-[#DA4167] transition-colors">Terms</button>
            <button className="hover:text-[#DA4167] transition-colors">Contact</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
