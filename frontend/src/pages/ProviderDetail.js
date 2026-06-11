import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getProviderById } from '@/services/api';
import { toast } from 'sonner';
import {
  MapPin, CheckCircle, Star, Calendar, Clock, CaretLeft, CaretRight,
  Phone, WhatsappLogo, EnvelopeSimple, X
} from 'phosphor-react';
import { useAuth } from '@/context/AuthContext';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

export default function ProviderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [carouselApi, setCarouselApi] = useState(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const [extraRequest, setExtraRequest] = useState('');
  const [requestName, setRequestName] = useState('');
  const [requestEmail, setRequestEmail] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);

  useEffect(() => {
    fetchProvider();
  }, [id]);

  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => setActivePhotoIdx(carouselApi.selectedScrollSnap());
    carouselApi.on('select', onSelect);
    onSelect();
    return () => { carouselApi.off('select', onSelect); };
  }, [carouselApi]);

  // ESC key closes lightbox; arrow keys navigate
  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setLightboxIdx(null);
      else if (e.key === 'ArrowRight') setLightboxIdx((i) => (i + 1) % provider.photos.length);
      else if (e.key === 'ArrowLeft') setLightboxIdx((i) => (i - 1 + provider.photos.length) % provider.photos.length);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [lightboxIdx, provider]);

  const fetchProvider = async () => {
    try {
      const response = await getProviderById(id);
      setProvider(response.data);
      // Track as recently viewed (for offline fallback browsing)
      try {
        const KEY = 'lumiere-recent-providers';
        const existing = JSON.parse(localStorage.getItem(KEY) || '[]');
        const p = response.data;
        const slim = {
          provider_id: p.provider_id,
          display_name: p.display_name,
          age: p.age,
          photos: (p.photos || []).slice(0, 1),
          location: p.location,
          verified: p.verified,
          viewed_at: Date.now()
        };
        const next = [slim, ...existing.filter((x) => x.provider_id !== slim.provider_id)].slice(0, 10);
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch (_storageErr) {
        // Best-effort cache write — quota / private mode failures are intentionally swallowed.
      }
    } catch (error) {
      toast.error('Provider not found');
      navigate('/browse');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] flex items-center justify-center">
        <div className="shimmer w-16 h-16 rounded-full"></div>
      </div>
    );
  }

  if (!provider) return null;

  return (
    <div className="min-h-screen bg-[#F0EFF4] text-[#3D2645]">
      {/* Header */}
      <header className="floating-header" data-testid="header">
        <div className="section-padding py-6 flex items-center justify-between">
          <Link to="/browse" className="flex items-center gap-2 text-[#3D2645] hover:text-[#C6A87C] transition-colors">
            <CaretLeft size={20} />
            <span className="uppercase tracking-wider text-sm">Back to Browse</span>
          </Link>
          <nav className="flex items-center gap-8">
            {user && (
              <Link to="/dashboard" className="btn-ghost" data-testid="dashboard-link">
                Dashboard
              </Link>
            )}
          </nav>
        </div>
      </header>

      <div className="pt-24 md:pt-32 pb-12 md:pb-20 section-padding">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-16">
            {/* Left - Images (1/3 of width on desktop, sticky) */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              {provider.photos && provider.photos.length > 0 ? (
                <>
                  <Carousel className="w-full mb-6" setApi={setCarouselApi}>
                    <CarouselContent>
                      {provider.photos.map((photo, index) => (
                        <CarouselItem key={`${index}-${photo.slice(-40)}`}>
                          <button
                            type="button"
                            onClick={() => setLightboxIdx(index)}
                            className="block w-full aspect-[3/4] overflow-hidden cursor-zoom-in"
                            data-testid={`open-lightbox-${index}`}
                            aria-label="Open full-size photo"
                          >
                            <img
                              src={photo}
                              alt={`${provider.display_name} ${index + 1}`}
                              className="w-full h-full object-cover"
                              data-testid={`provider-photo-${index}`}
                            />
                          </button>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious className="left-4" />
                    <CarouselNext className="right-4" />
                  </Carousel>
                  
                  {/* Thumbnail Gallery */}
                  <div className="grid grid-cols-4 gap-3">
                    {provider.photos.map((photo, index) => (
                      <button
                        type="button"
                        key={`${index}-${photo.slice(-40)}`}
                        onClick={() => carouselApi && carouselApi.scrollTo(index)}
                        className={`aspect-[3/4] overflow-hidden border transition-all cursor-pointer group ${
                          activePhotoIdx === index ? 'border-[#C6A87C]' : 'border-[#27272A] hover:border-[#C6A87C]'
                        }`}
                        data-testid={`thumbnail-${index}`}
                        aria-label={`Show photo ${index + 1}`}
                      >
                        <img
                          src={photo}
                          alt={`${provider.display_name} thumbnail ${index + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="aspect-[3/4] w-full">
                  <img
                    src="https://images.unsplash.com/photo-1768609957045-591c79431f48?crop=entropy&cs=srgb&fm=jpg&q=85"
                    alt={provider.display_name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>

            {/* Right - Details (2/3 of width on desktop) */}
            <div className="lg:col-span-2">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="min-w-0 flex-1">
                  <h1 className="text-4xl md:text-5xl text-[#3D2645] mb-3" data-testid="provider-name">
 {provider.display_name}{provider.age && <span className="text-[#3D2645]">, {provider.age}</span>}
 </h1>
                  <div className="flex items-start gap-4 text-[#3D2645]">
                    <div className="flex items-start gap-2">
                      <MapPin size={20} weight="thin" className="shrink-0 mt-0.5" />
                      <span className="text-sm md:text-base">Elite escort based in {provider.location?.city || 'Brussels'}, {provider.location?.country || 'Belgium'}</span>
                    </div>
                  </div>
                </div>
                {provider.verified && (
                  <div className="verified-badge shrink-0" data-testid="verified-badge">
                    <CheckCircle size={16} weight="fill" />
                    <span className="hidden sm:inline">Verified</span>
                  </div>
                )}
              </div>

              {/* Rating */}
              {provider.avg_rating > 0 && (
                <div className="flex items-center gap-2 mb-8" data-testid="rating">
                  <Star size={20} weight="fill" className="text-[#C6A87C]" />
                  <span className="text-[#3D2645] font-medium">{provider.avg_rating}</span>
                  <span className="text-[#3D2645]">({provider.review_count} reviews)</span>
                </div>
              )}

              {/* My Essence */}
              {(provider.bio || provider.essence) && (
                <div className="mb-8 bg-white border border-[#C6A87C] rounded-lg p-6 md:p-8">
                  <h3 className="text-xl font-bold text-[#832161] mb-4">My essence...</h3>
                  <p className="text-[#000000] leading-relaxed" data-testid="provider-bio">
                    {provider.bio || provider.essence}
                  </p>
                </div>
              )}

              {/* My Appearance */}
              {(() => {
                const c = provider.characteristics || {};
                const LANG_ORDER = ['English', 'French', 'German', 'Russian'];
                const langs = Array.isArray(c.languages)
                  ? c.languages.filter((l) => LANG_ORDER.includes(l))
                  : [];
                const yesNo = (v) => {
                  if (v === 'yes') return 'Yes';
                  if (v === 'no') return 'No';
                  return '';
                };
                const rows = [
                  ['Nationality', c.nationality],
                  ['Ethnicity', c.ethnicity],
                  ['Orientation', c.orientation],
                  ['Height', c.height ? `${c.height} cm` : ''],
                  ['Weight', c.weight ? `${c.weight} kg` : ''],
                  ['Eye color', c.eye_color],
                  ['Hair color', c.hair_color],
                  ['Hair length', c.hair_length],
                  ['Breast size', c.breast_size],
                  ['Breast type', c.breast_type],
                  ['Pubic hair', c.pubic_hair],
                  ['Languages', langs.length ? langs.join(', ') : ''],
                  ['Tattoos', yesNo(c.tattoos)],
                  ['Piercings', yesNo(c.piercings)],
                  ['Smoker', yesNo(c.smoker)]
                ].filter(([, v]) => v !== '' && v !== null && v !== undefined);
                if (rows.length === 0) return null;
                return (
                  <div className="mb-8 bg-white border border-[#C6A87C] rounded-lg p-6 md:p-8">
                    <h3 className="text-xl font-bold text-[#832161] mb-6">My appearance</h3>
                    <dl
                      className="grid grid-cols-1 md:grid-cols-2 gap-x-6 md:gap-x-10 gap-y-3"
                      data-testid="provider-characteristics"
                    >
                      {rows.map(([label, value]) => (
                        <div
                          key={label}
                          className="flex flex-wrap items-baseline gap-2 text-sm md:text-base"
                          data-testid={`char-row-${label.toLowerCase().replace(/ /g, '-')}`}
                        >
                          <dt className="text-[#000000] font-semibold whitespace-nowrap">{label}:</dt>
                          <dd className="text-[#000000] break-words">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                );
              })()}

              {/* Services */}
              {(() => {
                const services = provider.services;
                let serviceList = [];
                if (Array.isArray(services)) {
                  serviceList = services.map(s => ({ name: s, type: 'inclusive', price: '' }));
                } else if (services && typeof services === 'object') {
                  serviceList = Object.entries(services)
                    .filter(([_, v]) => v && v.type)
                    .map(([name, v]) => ({ name, type: v.type, price: v.price }));
                }
                if (serviceList.length === 0) return null;
                const inclusive = serviceList.filter(s => s.type === 'inclusive');
                const extras = serviceList.filter(s => s.type === 'extra');
                return (
                  <div className="mb-8 bg-white border border-[#C6A87C] rounded-lg p-6 md:p-8">
                    <h3 className="text-xl font-bold text-[#832161] mb-6">What we can share together...</h3>
                    {inclusive.length > 0 && (
                      <div className="mb-4">
                        {extras.length > 0 && (
                          <p className="text-[10px] uppercase tracking-[0.2em] text-[#000000] mb-3">Inclusive</p>
                        )}
                        <div className="flex flex-wrap gap-3">
                          {inclusive.map((s, i) => (
                            <span
                              key={`inc-${i}`}
                              className="px-4 py-2 border border-[#3F3F46] text-[#000000] text-sm uppercase tracking-wider hover:border-[#C6A87C] hover:text-[#C6A87C] transition-colors"
                              data-testid={`service-${i}`}
                            >
                              {s.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {extras.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#000000] mb-3">Extra</p>
                        <div className="flex flex-wrap gap-3">
                          {extras.map((s, i) => (
                            <span
                              key={`ext-${i}`}
                              className="px-4 py-2 border border-[#C6A87C]/40 bg-[#C6A87C]/10 text-[#C6A87C] text-sm uppercase tracking-wider"
                              data-testid={`service-extra-${i}`}
                            >
                              {s.name}{s.price && ` · €${s.price}`}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Schedule */}
              {(() => {
                const dayOrder = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
                const labels = { monday:'Monday', tuesday:'Tuesday', wednesday:'Wednesday', thursday:'Thursday', friday:'Friday', saturday:'Saturday', sunday:'Sunday' };
                const schedule = provider.schedule && typeof provider.schedule === 'object' ? provider.schedule : null;
                const is247 = !!provider.available247;
                if (!is247 && !schedule) return null;
                const availableDays = is247
                  ? []
                  : dayOrder.filter(d => schedule[d] && schedule[d].available);
                if (!is247 && availableDays.length === 0) return null;
                return (
                  <div className="mb-8 bg-white border border-[#C6A87C] rounded-lg p-6 md:p-8">
                    <h3 className="text-xl font-bold text-[#832161] mb-6">My schedule</h3>
                    {is247 ? (
                      <div className="flex items-center justify-between py-2" data-testid="schedule-247">
                        <span className="text-[#000000] font-medium">All week</span>
                        <span className="text-[#C6A87C]">Available 24/7</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {availableDays.map((day) => {
                          const s = schedule[day];
                          return (
                            <div key={day} className="flex justify-between items-center py-2" data-testid={`schedule-${day}`}>
                              <span className="text-[#000000] font-medium">{labels[day]}</span>
                              <span className="text-[#000000]">{s.start} - {s.end}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {provider.booking_advance && (
                      <p className="mt-6 pt-4 border-t border-[#27272A] text-[#C6A87C] text-sm" data-testid="schedule-advance">
                        Booking in advance necessary
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Let's Connect */}
              <div className="mb-8 bg-white border border-[#C6A87C] rounded-lg p-6 md:p-8" data-testid="contact-section">
                <h3 className="text-xl font-bold text-[#832161] mb-6">Let&apos;s connect</h3>
                <div className="space-y-4">
                  {/* Mobile */}
                  <a 
                    href={`tel:${provider.contact?.phone || '+32 XXX XX XX XX'}`}
                    className="flex items-center gap-4 p-4 border border-[#27272A] group"
                    data-testid="contact-phone"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#C6A87C]/10 flex items-center justify-center">
                      <Phone size={20} className="text-[#C6A87C]" />
                    </div>
                    <div>
                      <p className="text-[#000000] text-sm">Mobile</p>
                      <p className="text-[#000000]">{provider.contact?.phone || '+32 XXX XX XX XX'}</p>
                    </div>
                  </a>

                  {/* WhatsApp */}
                  <a 
                    href={`https://wa.me/${(provider.contact?.whatsapp || '+32XXXXXXXXX').replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 border border-[#27272A] group"
                    data-testid="contact-whatsapp"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#25D366]/10 flex items-center justify-center">
                      <WhatsappLogo size={20} className="text-[#25D366]" />
                    </div>
                    <div>
                      <p className="text-[#000000] text-sm">WhatsApp</p>
                      <p className="text-[#000000]">{provider.contact?.whatsapp || '+32 XXX XX XX XX'}</p>
                    </div>
                  </a>

                  {/* Email */}
                  <a 
                    href={`mailto:${provider.contact?.email || provider.user?.email || 'contact@example.com'}`}
                    className="flex items-center gap-4 p-4 border border-[#27272A] group"
                    data-testid="contact-email"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#C6A87C]/10 flex items-center justify-center">
                      <EnvelopeSimple size={20} className="text-[#C6A87C]" />
                    </div>
                    <div>
                      <p className="text-[#000000] text-sm">E-mail</p>
                      <p className="text-[#000000]">{provider.contact?.email || provider.user?.email || 'contact@example.com'}</p>
                    </div>
                  </a>
                </div>
              </div>

              {/* Rates */}
              {provider.rates && Object.keys(provider.rates).length > 0 && (() => {
                const r = provider.rates;
                const isNested = r.incall || r.outcall;

                const DURATION_LABELS = {
                  '1hour':     '1 hour',
                  '2hours':    '2 hours',
                  '3hours':    '3 hours',
                  'overnight': 'Overnight'
                };
                const renderColumn = (kind, col) => {
                  const baseKeys = ['1hour', '2hours', '3hours'].filter((k) => col[k] !== undefined && col[k] !== '');
                  const extras = (Array.isArray(col.extras) ? col.extras : [])
                    .slice()
                    .sort((a, b) => (Number(a.hours) || 0) - (Number(b.hours) || 0));
                  const hasOvernight = col.overnight !== undefined && col.overnight !== '';
                  if (baseKeys.length === 0 && extras.length === 0 && !hasOvernight) return null;
                  return (
                    <div key={kind} className="space-y-3">
                      <p className="text-lg uppercase tracking-[0.3em] text-[#C6A87C] mb-2">{kind}</p>
                      {baseKeys.map((k) => (
                        <div key={k} className="flex justify-between items-center pb-3 border-b border-[#27272A]" data-testid={`rate-${kind}-${k}`}>
                          <span className="text-[#000000] text-base">{DURATION_LABELS[k]}</span>
                          <span className="text-[#C6A87C] text-base">€{col[k]}</span>
                        </div>
                      ))}
                      {extras.map((extra, i) => (
                        <div key={`x-${i}`} className="flex justify-between items-center pb-3 border-b border-[#27272A]" data-testid={`rate-${kind}-extra-${i}`}>
                          <span className="text-[#000000] text-base">{extra.hours} hours</span>
                          <span className="text-[#C6A87C] text-base">€{extra.price}</span>
                        </div>
                      ))}
                      {hasOvernight && (
                        <div className="flex justify-between items-center pb-3 border-b border-[#27272A]" data-testid={`rate-${kind}-overnight`}>
                          <span className="text-[#000000] text-base">Overnight</span>
                          <span className="text-[#C6A87C] text-base">€{col.overnight}</span>
                        </div>
                      )}
                    </div>
                  );
                };

                return (
                  <div className="mb-8 bg-white border border-[#C6A87C] rounded-lg p-6 md:p-8">
                    <h3 className="text-xl font-bold text-[#832161] mb-6">Time & investment</h3>
                    {isNested ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {renderColumn('incall', r.incall || {})}
                        {renderColumn('outcall', r.outcall || {})}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {Object.entries(r).map(([type, rate]) => (
                          <div key={type} className="flex justify-between items-center pb-4 border-b border-[#27272A] last:border-b-0 last:pb-0" data-testid={`rate-${type}`}>
                            <span className="text-[#000000] capitalize text-base">{DURATION_LABELS[type] || type}</span>
                            <span className="text-[#C6A87C] text-base">€{rate}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Extra Requests */}
              <div className="mb-8 bg-white border border-[#C6A87C] rounded-lg p-6 md:p-8">
                <h3 className="text-xl font-bold text-[#832161] mb-6">Do you have extra requests?</h3>
                <div className="space-y-4">
                  <div>
                    <label className="input-label !text-[#000000]">Your name</label>
                    <input
                      type="text"
                      value={requestName}
                      onChange={(e) => setRequestName(e.target.value)}
                      placeholder="Your name"
                      className="input-premium w-full !text-[#3D2645] !border-[#dbdadd]"
                      data-testid="extra-request-name"
                    />
                  </div>
                  <div>
                    <label className="input-label !text-[#000000]">Your e-mail address</label>
                    <input
                      type="email"
                      value={requestEmail}
                      onChange={(e) => setRequestEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="input-premium w-full !text-[#3D2645] !border-[#dbdadd]"
                      data-testid="extra-request-email"
                    />
                  </div>
                  <div>
                    <label className="input-label !text-[#000000]">Your message</label>
                    <textarea
                      value={extraRequest}
                      onChange={(e) => setExtraRequest(e.target.value.slice(0, 350))}
                      placeholder="Share your special requests or preferences..."
                      className="input-premium w-full h-32 resize-none !text-[#3D2645] !border-[#dbdadd]"
                      maxLength={350}
                      data-testid="extra-request-input"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#52525B] text-sm">{extraRequest.length}/350 characters</span>
                    <button
                      onClick={() => {
                        if (!requestName.trim()) {
                          toast.error('Please enter your name');
                          return;
                        }
                        if (!requestEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requestEmail)) {
                          toast.error('Please enter a valid email address');
                          return;
                        }
                        if (!extraRequest.trim()) {
                          toast.error('Please enter your request');
                          return;
                        }
                        setSendingRequest(true);
                        // Simulate sending request
                        setTimeout(() => {
                          toast.success('Request sent successfully!');
                          setRequestName('');
                          setRequestEmail('');
                          setExtraRequest('');
                          setSendingRequest(false);
                        }, 1000);
                      }}
                      disabled={sendingRequest || !extraRequest.trim() || !requestName.trim() || !requestEmail.trim()}
                      className="btn-primary px-8 disabled:opacity-50"
                      data-testid="send-request-button"
                    >
                      {sendingRequest ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Reviews */}
          {provider.reviews && provider.reviews.length > 0 && (
            <div className="mt-24">
              <h3 className="text-3xl text-[#000000] mb-12">Reviews</h3>
              <div className="space-y-8">
                {provider.reviews.map((review, index) => (
                  <motion.div
                    key={review.review_id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="card-premium p-6 md:p-8"
                    data-testid={`review-${index}`}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <img
                        src={review.reviewer?.picture || 'https://via.placeholder.com/50'}
                        alt={review.reviewer?.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-[#000000] font-medium">{review.reviewer?.name}</p>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={16}
                              weight={i < review.rating ? 'fill' : 'regular'}
                              className={i < review.rating ? 'text-[#C6A87C]' : 'text-[#52525B]'}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-[#000000] leading-relaxed">{review.comment}</p>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox / full-size photo viewer */}
      {lightboxIdx !== null && provider.photos && provider.photos[lightboxIdx] && (
        <div
          className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxIdx(null)}
          data-testid="lightbox-overlay"
        >
          {/* Close */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLightboxIdx(null); }}
            className="absolute top-4 right-4 md:top-6 md:right-6 w-12 h-12 rounded-full bg-black/60 text-white hover:bg-black/80 flex items-center justify-center"
            data-testid="lightbox-close"
            aria-label="Close"
          >
            <X size={24} />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-4 md:top-6 md:left-6 text-[#C6A87C] text-sm tracking-wider" data-testid="lightbox-counter">
            {lightboxIdx + 1} / {provider.photos.length}
          </div>

          {/* Prev */}
          {provider.photos.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIdx((i) => (i - 1 + provider.photos.length) % provider.photos.length);
              }}
              className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/60 text-white hover:bg-black/80 flex items-center justify-center"
              data-testid="lightbox-prev"
              aria-label="Previous photo"
            >
              <CaretLeft size={24} />
            </button>
          )}

          {/* Image */}
          <img
            src={provider.photos[lightboxIdx]}
            alt={`${provider.display_name} full size`}
            onClick={(e) => e.stopPropagation()}
            className="max-w-[92vw] max-h-[92vh] object-contain"
            data-testid="lightbox-image"
          />

          {/* Next */}
          {provider.photos.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIdx((i) => (i + 1) % provider.photos.length);
              }}
              className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/60 text-white hover:bg-black/80 flex items-center justify-center"
              data-testid="lightbox-next"
              aria-label="Next photo"
            >
              <CaretRight size={24} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
