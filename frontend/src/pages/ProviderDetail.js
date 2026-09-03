import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getProviderById, getProviders, createEnquiry } from '@/services/api';
import { toast } from 'sonner';
import {
  MapPin, CheckCircle, Star, Calendar, Clock, CaretLeft, CaretRight,
  Phone, WhatsappLogo, TelegramLogo, ChatCircle, EnvelopeSimple, X, Users
} from 'phosphor-react';
import { useAuth } from '@/context/AuthContext';
import SiteHeader from '@/components/SiteHeader';
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
  const [showPhone, setShowPhone] = useState(false);
  const [neighbors, setNeighbors] = useState({ prev: null, next: null });
  const [extraRequest, setExtraRequest] = useState('');
  const [requestName, setRequestName] = useState('');
  const [requestEmail, setRequestEmail] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);

  useEffect(() => {
    fetchProvider();
    fetchNeighbors();
  }, [id]);

  const fetchNeighbors = async () => {
    try {
      const res = await getProviders({ limit: 200 });
      const list = Array.isArray(res.data) ? res.data : (res.data?.items || []);
      const idx = list.findIndex((p) => p.provider_id === id);
      if (idx === -1) {
        setNeighbors({ prev: null, next: null });
        return;
      }
      const prev = idx > 0 ? list[idx - 1].provider_id : null;
      const next = idx < list.length - 1 ? list[idx + 1].provider_id : null;
      setNeighbors({ prev, next });
    } catch (_err) {
      setNeighbors({ prev: null, next: null });
    }
  };

  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => setActivePhotoIdx(carouselApi.selectedScrollSnap());
    carouselApi.on('select', onSelect);
    onSelect();
    return () => { carouselApi.off('select', onSelect); };
  }, [carouselApi]);

  // Keyboard shortcuts for profile navigation (disabled while lightbox is open)
  useEffect(() => {
    if (lightboxIdx !== null) return;
    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return; // don't hijack while typing
      if (e.key === 'ArrowRight' && neighbors.next) navigate(`/providers/${neighbors.next}`);
      else if (e.key === 'ArrowLeft' && neighbors.prev) navigate(`/providers/${neighbors.prev}`);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [neighbors, lightboxIdx, navigate]);

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
      {/* Floating side navigation — vertically centered prev/next profile arrows */}
      {neighbors.prev && (
        <button
          type="button"
          onClick={() => navigate(`/providers/${neighbors.prev}`)}
          className="hidden md:flex fixed left-4 lg:left-8 top-1/2 -translate-y-1/2 z-40 w-12 h-12 rounded-full items-center justify-center bg-white/90 backdrop-blur-sm shadow-md border border-[#DA4167] text-[#DA4167] hover:bg-[#DA4167] hover:text-white transition-colors"
          data-testid="prev-profile-btn"
          aria-label="Previous profile"
          title="Previous profile (←)"
        >
          <CaretLeft size={24} />
        </button>
      )}
      {neighbors.next && (
        <button
          type="button"
          onClick={() => navigate(`/providers/${neighbors.next}`)}
          className="hidden md:flex fixed right-4 lg:right-8 top-1/2 -translate-y-1/2 z-40 w-12 h-12 rounded-full items-center justify-center bg-white/90 backdrop-blur-sm shadow-md border border-[#DA4167] text-[#DA4167] hover:bg-[#DA4167] hover:text-white transition-colors"
          data-testid="next-profile-btn"
          aria-label="Next profile"
          title="Next profile (→)"
        >
          <CaretRight size={24} />
        </button>
      )}
      {/* Header */}
      <SiteHeader />

      <div className="pt-24 md:pt-32 pb-12 md:pb-20 section-padding">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-16">
            {/* Left - Images (1/3 of width on desktop, sticky with independent scroll) */}
            <div
              className="lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-2 hide-scrollbar"
              data-testid="provider-detail-left-column"
            >
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
                          activePhotoIdx === index ? 'border-[#832161]' : 'border-[#27272A] hover:border-[#832161]'
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
                  {provider.agency?.agency_id && (
                    <Link
                      to={`/agency/${provider.agency.agency_id}`}
                      className="inline-flex items-center gap-1.5 mt-3 text-sm text-[#832161] hover:text-[#DA4167] transition-colors"
                      data-testid="provider-agency-link"
                    >
                      <Users size={15} weight="fill" />
                      Presented by {provider.agency.name || 'agency'}
                    </Link>
                  )}
                  {(provider.bio || provider.essence) && (
                    <>
                      <div className="mt-6 mb-3 border-t border-[#dbdadd]"></div>
                      <p className="text-[#000000] leading-relaxed" data-testid="provider-bio">
                        {provider.bio || provider.essence}
                      </p>
                    </>
                  )}
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
                  <Star size={20} weight="fill" className="text-[#832161]" />
                  <span className="text-[#3D2645] font-medium">{provider.avg_rating}</span>
                  <span className="text-[#3D2645]">({provider.review_count} reviews)</span>
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
                const availLabel = (() => {
                  if (provider.availability_type === 'incall') return 'Incall';
                  if (provider.availability_type === 'outcall') return 'Outcall';
                  if (provider.availability_type === 'both') return 'Incall and outcall';
                  return '';
                })();
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
                  ['Smoker', yesNo(c.smoker)],
                  ['Available for', availLabel]
                ].filter(([, v]) => v !== '' && v !== null && v !== undefined);
                if (rows.length === 0) return null;
                return (
                  <div className="mb-8 bg-white rounded-lg p-6 md:p-8">
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

              {/* Let's Connect */}
              <div className="mb-8 bg-white rounded-lg p-6 md:p-8" data-testid="contact-section">
                <h3 className="text-xl font-bold text-[#832161] mb-6">Let&apos;s connect</h3>
                {(() => {
                  const phone = provider.contact?.phone || '+32 XXX XX XX XX';
                  const maskPhone = (raw) => {
                    if (!raw) return '+32 XXX XX XX XX';
                    // Preserve country code (+xx or +xxx), mask the rest with X (keep separators)
                    const m = raw.match(/^(\+\d{1,4})\s?(.*)$/);
                    if (!m) return raw.replace(/\d/g, 'X');
                    return `${m[1]} ${m[2].replace(/\d/g, 'X')}`;
                  };
                  const c = provider.contact || {};
                  const stripDigits = (s) => (s || '').replace(/[^0-9]/g, '');
                  const channelLinks = [
                    {
                      key: 'sms', enabled: c.hasSms,
                      href: `sms:${phone}`, label: 'SMS',
                      bg: '#dbdadd', fg: '#832161',
                      icon: <ChatCircle size={20} weight="fill" />
                    },
                    {
                      key: 'whatsapp', enabled: c.hasWhatsapp,
                      href: `https://wa.me/${stripDigits(c.whatsapp || phone)}`, label: 'WhatsApp',
                      bg: '#25D366', fg: '#ffffff',
                      icon: <WhatsappLogo size={20} weight="fill" />
                    },
                    {
                      key: 'telegram', enabled: c.hasTelegram,
                      href: `https://t.me/${stripDigits(c.telegram || phone)}`, label: 'Telegram',
                      bg: '#0088cc', fg: '#ffffff',
                      icon: <TelegramLogo size={20} weight="fill" />
                    },
                    {
                      key: 'signal', enabled: c.hasSignal,
                      href: `https://signal.me/#p/${stripDigits(c.signal || phone)}`, label: 'Signal',
                      bg: '#3A76F0', fg: '#ffffff',
                      // Inline Signal logo
                      icon: (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9.84 1.123a.704.704 0 0 1 .31 1.371 9.591 9.591 0 0 0-1.275.376.704.704 0 1 1-.493-1.318 11 11 0 0 1 1.458-.43Zm4.32 0a11 11 0 0 1 1.458.43.704.704 0 1 1-.493 1.318 9.591 9.591 0 0 0-1.275-.376.704.704 0 0 1 .31-1.371Zm-9.275 3.27a.704.704 0 0 1 .128.987 9.6 9.6 0 0 0-.749 1.082.704.704 0 1 1-1.205-.728 11 11 0 0 1 .839-1.213.704.704 0 0 1 .987-.128Zm14.23 0a.704.704 0 0 1 .987.128c.302.402.59.806.84 1.213a.704.704 0 1 1-1.206.728 9.59 9.59 0 0 0-.748-1.082.704.704 0 0 1 .127-.987Zm-17.39 6.43a.704.704 0 0 1 .677.73 9.65 9.65 0 0 0 .051 1.32.704.704 0 1 1-1.4.14 11 11 0 0 1-.057-1.513.704.704 0 0 1 .729-.677Zm20.55 0a.704.704 0 0 1 .729.677 11 11 0 0 1-.057 1.513.704.704 0 1 1-1.4-.14 9.6 9.6 0 0 0 .051-1.32.704.704 0 0 1 .677-.73ZM12 4.704A7.296 7.296 0 0 0 5.685 15.66l-.66 2.21a.524.524 0 0 0 .65.651l2.21-.66A7.296 7.296 0 1 0 12 4.704Z"/>
                        </svg>
                      )
                    },
                    {
                      key: 'viber', enabled: c.hasViber,
                      href: `viber://chat?number=${encodeURIComponent(stripDigits(c.viber || phone))}`, label: 'Viber',
                      bg: '#7360F2', fg: '#ffffff',
                      icon: (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                          <path d="M11.4.005a16.74 16.74 0 0 0-3.31.34C5.71.83 4.255 2.13 3.49 4.475c-.94 2.88-1.04 6.485-.585 9.31.34 2.105 1.04 4.04 2.4 5.16 1.13.91 2.34 1.255 4.18 1.255l-.005.07v2.36s.01 1.165 1.075 1.165c.49 0 .81-.165 1.205-.49.39-.32 1.61-1.43 2.41-2.07.55 0 1.1.025 1.65.025 2.165 0 3.9-.585 5.235-1.745 1.345-1.16 2.115-2.78 2.34-4.78.245-2.13.205-4.155-.115-6.135C22.66 4.305 21.04 2.36 18.46 1.27 16.51.435 13.985.005 11.4.005Zm.875 4.395c1.94 0 3.45 1.71 3.45 1.71s.585.65.585 1.51c0 .85-.5 1.43-.5 1.43s-1.04 1.16-2.045 2.155c-.5.495-1.04 1.05-1.34 1.36-.31.31-.62.5-1.04.5-.42 0-1.04-.5-1.55-1.04-.71-.71-1.27-1.61-1.66-2.45-.495-1.04-.5-1.91-.04-2.45.46-.5 1.05-.75 1.55-.81.5-.05.92-.05.92-.05s.71.02.715.025c.05.05.95.85.95 1.06 0 .27-.55.71-.55.71s-.5.4-.5.8c0 .4.27.71.66 1.21.39.5.92.99 1.43 1.27.5.27.81.4 1.21.4.4 0 .8-.5.8-.5s.4-.6.66-.6c.21 0 1.115.92 1.115.97 0 .05-.27.45-.5.66z"/>
                        </svg>
                      )
                    },
                  ];
                  return (
                    <div className="space-y-6">
                      {/* Mobile + channel icons */}
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4" data-testid="contact-phone">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-[#832161]/10 flex items-center justify-center">
                            <Phone size={20} className="text-[#832161]" />
                          </div>
                          <div>
                            <p className="text-[#000000] text-sm">Mobile</p>
                            {showPhone ? (
                              <a href={`tel:${phone}`} className="text-[#000000] font-medium" data-testid="phone-number">{phone}</a>
                            ) : (
                              <button
                                onClick={() => setShowPhone(true)}
                                className="flex items-center gap-3"
                                data-testid="show-phone-btn"
                              >
                                <span className="text-[#000000]">{maskPhone(phone)}</span>
                                <span className="text-xs uppercase tracking-wider text-[#DA4167] border border-[#DA4167] rounded px-2 py-0.5 hover:bg-[#DA4167]/10 transition-colors">
                                  Show number
                                </span>
                              </button>
                            )}
                          </div>
                        </div>
                        {/* Access channel icons */}
                        <div className="flex items-center gap-2 flex-wrap" data-testid="contact-channels">
                          {channelLinks.filter(ch => ch.enabled).map(ch => (
                            <a
                              key={ch.key}
                              href={ch.href}
                              target={ch.key === 'sms' ? undefined : '_blank'}
                              rel="noopener noreferrer"
                              title={ch.label}
                              aria-label={ch.label}
                              data-testid={`channel-${ch.key}`}
                              className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
                              style={{ backgroundColor: ch.bg, color: ch.fg }}
                            >
                              {ch.icon}
                            </a>
                          ))}
                        </div>
                      </div>

                      {/* Email */}
                      <a
                        href={`mailto:${provider.contact?.email || provider.user?.email || 'contact@example.com'}`}
                        className="flex items-center gap-4"
                        data-testid="contact-email"
                      >
                        <div className="w-10 h-10 rounded-full bg-[#832161]/10 flex items-center justify-center">
                          <EnvelopeSimple size={20} className="text-[#832161]" />
                        </div>
                        <div>
                          <p className="text-[#000000] text-sm">E-mail</p>
                          <p className="text-[#000000]">{provider.contact?.email || provider.user?.email || 'contact@example.com'}</p>
                        </div>
                      </a>
                    </div>
                  );
                })()}
              </div>

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
                  <div className="mb-8 bg-white rounded-lg p-6 md:p-8">
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
                              className="px-4 py-2 border border-[#dbdadd] text-[#000000] text-sm uppercase tracking-wider"
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
                              className="px-4 py-2 border border-[#832161]/40 bg-[#832161]/10 text-[#832161] text-sm uppercase tracking-wider"
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
                  <div className="mb-8 bg-white rounded-lg p-6 md:p-8">
                    <h3 className="text-xl font-bold text-[#832161] mb-6">My schedule</h3>
                    {is247 ? (
                      <div className="flex items-center justify-between py-2" data-testid="schedule-247">
                        <span className="text-[#000000] font-medium">All week</span>
                        <span className="text-[#832161]">Available 24/7</span>
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
                      <p className="mt-6 pt-4 border-t border-[#27272A] text-[#832161] text-sm" data-testid="schedule-advance">
                        Booking in advance necessary
                      </p>
                    )}
                  </div>
                );
              })()}


              {/* Rates */}
              {provider.rates && Object.keys(provider.rates).length > 0 && (() => {
                const r = provider.rates;
                const isNested = r.incall || r.outcall;
                const CURRENCY_SYMBOLS = { EUR:'€', USD:'$', GBP:'£', CHF:'CHF', AUD:'A$', CAD:'C$', JPY:'¥', AED:'AED', SGD:'S$', HKD:'HK$' };
                const sym = CURRENCY_SYMBOLS[r.currency] || '€';

                const DURATION_LABELS = {
                  '1hour':     '1 hour',
                  '2hours':    '2 hours',
                  '3hours':    '3 hours',
                  'overnight': 'Overnight'
                };

                // Build per-column items with a sort key
                const itemsFor = (col) => {
                  const items = [];
                  const map = { '1hour': 1, '2hours': 2, '3hours': 3 };
                  Object.keys(map).forEach((k) => {
                    if (col[k] !== undefined && col[k] !== '') {
                      items.push({ key: `h-${map[k]}`, label: DURATION_LABELS[k], price: col[k], sort: map[k] });
                    }
                  });
                  (Array.isArray(col.extras) ? col.extras : []).forEach((ex) => {
                    const h = Number(ex.hours) || 0;
                    if (h > 0 && ex.price !== '' && ex.price !== undefined) {
                      items.push({ key: `h-${h}`, label: `${h} hours`, price: ex.price, sort: h });
                    }
                  });
                  if (col.overnight !== undefined && col.overnight !== '') {
                    items.push({ key: 'overnight', label: 'Overnight', price: col.overnight, sort: 9000 });
                  }
                  if (col.taxi !== undefined && col.taxi !== '' && col.taxi !== null) {
                    items.push({ key: 'taxi', label: 'Taxi not included', price: col.taxi, sort: 9999 });
                  }
                  return items;
                };

                const inItems = itemsFor(r.incall || {});
                const outItems = itemsFor(r.outcall || {});

                // Union of row keys across both columns → identical row layout per column
                const byKey = new Map();
                [...inItems, ...outItems].forEach((it) => {
                  if (!byKey.has(it.key)) byKey.set(it.key, { key: it.key, label: it.label, sort: it.sort });
                });
                const unifiedKeys = Array.from(byKey.values()).sort((a, b) => a.sort - b.sort);
                const inMap = Object.fromEntries(inItems.map((it) => [it.key, it.price]));
                const outMap = Object.fromEntries(outItems.map((it) => [it.key, it.price]));
                const unifiedRows = unifiedKeys.map(({ key, label }) => ({
                  key,
                  label,
                  incall:  inMap[key]  !== undefined ? inMap[key]  : null,
                  outcall: outMap[key] !== undefined ? outMap[key] : null
                }));

                const renderColumn = (kind) => (
                  <div key={kind}>
                    <p className="text-lg tracking-[0.3em] text-[#832161] mb-4 capitalize">{kind}</p>
                    {unifiedRows.map((row) => (
                      <div key={row.key} className="flex justify-between items-center py-3 border-b border-[#dbdadd] last:border-b-0" data-testid={`rate-${kind}-${row.key}`}>
                        <span className="text-[#000000] text-base">{row.label}</span>
                        <span className={`text-base ${row[kind] !== null ? 'text-[#832161]' : 'text-[#9CA3AF]'}`}>
                          {row[kind] !== null ? `${sym}${row[kind]}` : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                );

                return (
                  <div className="mb-8 bg-white rounded-lg p-6 md:p-8">
                    <h3 className="text-xl font-bold text-[#832161] mb-6">Time & investment</h3>
                    {isNested ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {renderColumn('incall')}
                        {renderColumn('outcall')}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {Object.entries(r).map(([type, rate]) => (
                          <div key={type} className="flex justify-between items-center pb-4 border-b border-[#dbdadd] last:border-b-0 last:pb-0" data-testid={`rate-${type}`}>
                            <span className="text-[#000000] capitalize text-base">{DURATION_LABELS[type] || type}</span>
                            <span className="text-[#832161] text-base">{sym}{rate}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Extra Requests */}
              <div className="mb-8 bg-white rounded-lg p-6 md:p-8">
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
                      onClick={async () => {
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
                        try {
                          await createEnquiry({
                            provider_id: provider.provider_id || provider.id,
                            name: requestName,
                            email: requestEmail,
                            message: extraRequest,
                          });
                          toast.success('Request sent successfully!');
                          setRequestName('');
                          setRequestEmail('');
                          setExtraRequest('');
                        } catch (err) {
                          toast.error('Failed to send request. Please try again.');
                        } finally {
                          setSendingRequest(false);
                        }
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
                              className={i < review.rating ? 'text-[#832161]' : 'text-[#52525B]'}
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
          <div className="absolute top-4 left-4 md:top-6 md:left-6 text-[#832161] text-sm tracking-wider" data-testid="lightbox-counter">
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
