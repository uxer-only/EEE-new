import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getProviderDashboard, createProviderProfile, updateProviderProfile, deleteProviderProfile, getMySubscription, createSubscriptionCheckout } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { 
  ChatCircle, CheckCircle, User, MapPin, Camera, Clock, 
  CurrencyDollar, FileText, Phone, EnvelopeSimple, WhatsappLogo,
  Plus, Trash, CaretRight, CaretLeft, UploadSimple, X, VideoCamera, ShieldCheck, Crown, Sparkle, ArrowRight, DotsSixVertical
} from 'phosphor-react';
import { toast } from 'sonner';
import CharacteristicsForm from '@/components/CharacteristicsForm';
import VerificationModal from '@/components/VerificationModal';
import SiteHeader from '@/components/SiteHeader';

// Map country → international dial code prefix
const COUNTRY_DIAL_CODES = {
  Belgium: '+32', Netherlands: '+31', Luxembourg: '+352', France: '+33',
  Germany: '+49', 'United Kingdom': '+44', Spain: '+34', Italy: '+39',
  Portugal: '+351', Switzerland: '+41', Austria: '+43', Ireland: '+353',
  Denmark: '+45', Sweden: '+46', Norway: '+47', Finland: '+358',
  Poland: '+48', 'Czech Republic': '+420', Greece: '+30', Croatia: '+385',
  Hungary: '+36', Romania: '+40', Bulgaria: '+359', Slovenia: '+386',
  Slovakia: '+421', Estonia: '+372', Latvia: '+371', Lithuania: '+370',
  Cyprus: '+357', Malta: '+356', Iceland: '+354', Monaco: '+377',
  USA: '+1', Canada: '+1', Mexico: '+52', Brazil: '+55', Argentina: '+54',
  Australia: '+61', 'New Zealand': '+64', Japan: '+81', 'South Korea': '+82',
  China: '+86', India: '+91', Singapore: '+65', 'Hong Kong': '+852',
  Thailand: '+66', UAE: '+971', 'Saudi Arabia': '+966', Turkey: '+90',
  Russia: '+7', Ukraine: '+380', 'South Africa': '+27', Egypt: '+20',
  Israel: '+972', Lebanon: '+961', Morocco: '+212'
};

const CURRENCY_OPTIONS = [
  { code: 'EUR', symbol: '€',   label: 'Euro (EUR)' },
  { code: 'USD', symbol: '$',   label: 'US Dollar (USD)' },
  { code: 'GBP', symbol: '£',   label: 'British Pound (GBP)' },
  { code: 'CHF', symbol: 'CHF', label: 'Swiss Franc (CHF)' },
  { code: 'AUD', symbol: 'A$',  label: 'Australian Dollar (AUD)' },
  { code: 'CAD', symbol: 'C$',  label: 'Canadian Dollar (CAD)' },
  { code: 'JPY', symbol: '¥',   label: 'Japanese Yen (JPY)' },
  { code: 'AED', symbol: 'AED', label: 'UAE Dirham (AED)' },
  { code: 'SGD', symbol: 'S$',  label: 'Singapore Dollar (SGD)' },
  { code: 'HKD', symbol: 'HK$', label: 'Hong Kong Dollar (HKD)' }
];
const currencySymbol = (code) => CURRENCY_OPTIONS.find((c) => c.code === code)?.symbol || '€';

export default function ProviderDashboard() {
  const { user, logout } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [mode, setMode] = useState('overview'); // 'overview' | 'edit' | 'create'
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [profileData, setProfileData] = useState({
    display_name: '',
    account_type: 'independent',
    age: '',
    gender: '',
    essence: '',
    companionshipType: '',
    location: { city: '', country: '' },
    bio: '',
    services: {}, // Changed to object: { serviceName: { type: 'inclusive' | 'extra' | null, price: '' } }
    rates: {
      currency: 'EUR',
      incall: { '1hour': '', '2hours': '', '3hours': '', 'overnight': '', extras: [] },
      outcall: { '1hour': '', '2hours': '', '3hours': '', 'overnight': '', extras: [] }
    },
    contact: {
      phone: '',
      whatsapp: '',
      email: ''
    },
    schedule: {
      monday: { available: true, start: '10:00', end: '22:00' },
      tuesday: { available: true, start: '10:00', end: '22:00' },
      wednesday: { available: true, start: '10:00', end: '22:00' },
      thursday: { available: true, start: '10:00', end: '22:00' },
      friday: { available: true, start: '10:00', end: '23:00' },
      saturday: { available: true, start: '10:00', end: '23:00' },
      sunday: { available: true, start: '10:00', end: '22:00' }
    },
    availability_type: 'both',  // 'incall' | 'outcall' | 'both'
    booking_advance: false,
    photos: [],
    characteristics: {
      nationality: '',
      ethnicity: '',
      orientation: '',
      height: '',
      weight: '',
      eye_color: '',
      hair_color: '',
      hair_length: '',
      breast_size: '',
      breast_type: '',
      pubic_hair: '',
      languages: [],
      tattoos: '',
      piercings: '',
      smoker: ''
    }
  });
  const [newService, setNewService] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [draggedPhotoIdx, setDraggedPhotoIdx] = useState(null);
  const [newLanguage, setNewLanguage] = useState('');
  const [showAddLanguage, setShowAddLanguage] = useState(false);

  // Reorder helpers for existing profile photos
  const movePhoto = (from, to) => {
    if (to < 0 || to >= (profileData.photos || []).length) return;
    const next = [...profileData.photos];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setProfileData({ ...profileData, photos: next });
  };
  const onPhotoDragStart = (idx) => setDraggedPhotoIdx(idx);
  const onPhotoDragOver = (e) => e.preventDefault();
  const onPhotoDrop = (targetIdx) => {
    if (draggedPhotoIdx === null || draggedPhotoIdx === targetIdx) return;
    movePhoto(draggedPhotoIdx, targetIdx);
    setDraggedPhotoIdx(null);
  };

  const steps = [
    { id: 1, title: 'Basic Info', icon: User },
    { id: 2, title: "Photos & Video's", icon: Camera },
    { id: 3, title: 'Services', icon: FileText },
    { id: 4, title: 'Rates & Availability', icon: CurrencyDollar },
    { id: 5, title: 'Activate', icon: Crown }
  ];

  // Plan options for Step 5 (mirrors Subscribe.js / backend PLANS allowlist)
  const FEATURED_OPTIONS = [
    { id: 'featured_2w', label: '2 weeks', price: 30, perDay: '€2.14 / day' },
    { id: 'featured_4w', label: '4 weeks', price: 55, perDay: '€1.96 / day', badge: 'Save €5' }
  ];
  const VIP_OPTIONS = [
    { id: 'vip_2w', label: '2 weeks', price: 15 },
    { id: 'vip_4w', label: '4 weeks', price: 25, badge: 'Save €5' }
  ];
  const [planFeatured, setPlanFeatured] = useState('featured_4w');
  const [planVipOn, setPlanVipOn] = useState(false);
  const [planVip, setPlanVip] = useState('vip_4w');
  const [autoRenew, setAutoRenew] = useState(true);
  const [payRedirecting, setPayRedirecting] = useState(false);

  const planTotal =
    (FEATURED_OPTIONS.find((o) => o.id === planFeatured)?.price || 0) +
    (planVipOn ? VIP_OPTIONS.find((o) => o.id === planVip)?.price || 0 : 0);

  const handlePayAndActivate = async () => {
    setPayRedirecting(true);
    try {
      const { data } = await createSubscriptionCheckout({
        featured_plan: planFeatured,
        vip_plan: planVipOn ? planVip : null,
        auto_renew: autoRenew,
        origin_url: window.location.origin
      });
      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.error('Could not start checkout');
        setPayRedirecting(false);
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Checkout failed');
      setPayRedirecting(false);
    }
  };

  const escortServices = [
    'Relaxing massage', 'Erotic massage', 'Couple massage', 'Body to body', 
    'Travel', 'Classic sex', '69 position', 'Cunnilingus', 'Dirty talk', 'Duo with girl', 
    'Facesitting', 'Fingering', 'French kissing', 'Handjob', 'GFE', 'Masturbation', 
    'Oral without condom', 'Rimming', 'Role-play', 'Greek', 'Sex toys', 'Shower together', 
    'Squirting', 'Striptease', 'Uniform', 'Casual photos', 'Couples', 'Cum on face', 
    'Cum in mouth', 'Deepthroat', 'Erotic photos', 'Filming', 'Facefuck', 
    'Porn star experience', 'Strapon service', 'Swallowing', 'With 2 men', 'Group sex', 
    'Findom', 'Double penetration', 'BDSM - Femdom'
  ];

  const massageServices = [
    'Relaxing massage', 'Erotic massage', 'Couple massage', 'Body to body',
    'Role-play', 'Sex toys', 'Shower together', 'Striptease', 'Uniform',
    'Casual photos', 'Couples', 'Erotic photos', 'Filming'
  ];

  const serviceOptions = profileData.companionshipType === 'erotic-massage' ? massageServices : escortServices;

  useEffect(() => {
    fetchDashboard();
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const { data } = await getMySubscription();
      setSubscription(data);
    } catch (_subErr) {
      // Subscription endpoint may 404 for brand-new providers — banner simply won't render.
    }
  };

  const fetchDashboard = async () => {
    try {
      const response = await getProviderDashboard();
      setDashboard(response.data);
      const p = response.data?.profile;
      if (p) {
        // Hydrate profileData from existing profile (normalize legacy schema)
        const servicesNormalized = Array.isArray(p.services)
          ? p.services.reduce((acc, s) => ({ ...acc, [s]: { type: 'inclusive', price: '' } }), {})
          : (p.services || {});
        // Normalize rates: legacy flat {1hour, 2hours,...} → nested {incall, outcall}
        const blank = { '1hour': '', '2hours': '', '3hours': '', 'overnight': '', extras: [] };
        let ratesNormalized;
        if (p.rates?.incall || p.rates?.outcall) {
          ratesNormalized = {
            incall:  { ...blank, ...(p.rates.incall  || {}), extras: Array.isArray(p.rates.incall?.extras)  ? p.rates.incall.extras  : [] },
            outcall: { ...blank, ...(p.rates.outcall || {}), extras: Array.isArray(p.rates.outcall?.extras) ? p.rates.outcall.extras : [] }
          };
        } else {
          // Legacy: map flat rates into incall, leave outcall blank
          ratesNormalized = {
            incall: {
              '1hour':    p.rates?.['1hour']    ?? p.rates?.hourly ?? '',
              '2hours':   p.rates?.['2hours']   ?? '',
              '3hours':   p.rates?.['3hours']   ?? '',
              'overnight':p.rates?.['overnight']?? '',
              extras: []
            },
            outcall: { ...blank }
          };
        }
        const defaultSchedule = {
          monday: { available: true, start: '10:00', end: '22:00' },
          tuesday: { available: true, start: '10:00', end: '22:00' },
          wednesday: { available: true, start: '10:00', end: '22:00' },
          thursday: { available: true, start: '10:00', end: '22:00' },
          friday: { available: true, start: '10:00', end: '23:00' },
          saturday: { available: true, start: '10:00', end: '23:00' },
          sunday: { available: true, start: '10:00', end: '22:00' }
        };
        setProfileData({
          display_name: p.display_name || '',
          age: p.age || '',
          gender: p.gender || '',
          essence: p.essence || '',
          companionshipType: p.companionshipType || '',
          location: { city: p.location?.city || '', country: p.location?.country || '' },
          bio: p.bio || '',
          services: servicesNormalized,
          rates: ratesNormalized,
          contact: p.contact || { phone: '', whatsapp: '', email: '' },
          schedule: p.schedule || defaultSchedule,
          availability_type: p.availability_type || 'both',
          booking_advance: p.booking_advance || false,
          available247: p.available247 || false,
          photos: p.photos || [],
          characteristics: {
            nationality: p.characteristics?.nationality || '',
            ethnicity: p.characteristics?.ethnicity || '',
            orientation: p.characteristics?.orientation || '',
            height: p.characteristics?.height || '',
            weight: p.characteristics?.weight || '',
            eye_color: p.characteristics?.eye_color || '',
            hair_color: p.characteristics?.hair_color || '',
            hair_length: p.characteristics?.hair_length || '',
            breast_size: p.characteristics?.breast_size || '',
            breast_type: p.characteristics?.breast_type || '',
            pubic_hair: p.characteristics?.pubic_hair || '',
            languages: Array.isArray(p.characteristics?.languages) ? p.characteristics.languages : [],
            tattoos: p.characteristics?.tattoos || '',
            piercings: p.characteristics?.piercings || '',
            smoker: p.characteristics?.smoker || ''
          }
        });
        setMode('overview');
      } else {
        setMode('create');
      }
    } catch (error) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (step, anchor) => {
    setCurrentStep(step);
    setMode('edit');
    if (anchor) {
      // Scroll to the named section after the step content paints
      setTimeout(() => {
        const el = document.getElementById(anchor);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 250);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const filesToBase64 = (files) => {
    return Promise.all(files.map(f => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(f.file);
    })));
  };

  const cancelEdit = () => {
    setMode('overview');
    setUploadedFiles([]);
    // Re-hydrate from server copy to discard changes
    fetchDashboard();
  };

  const handleRemoveProfile = async () => {
    const confirmed = window.confirm(
      'Permanently delete your profile?\n\nThis cannot be undone. Your photos, services, subscription history and verification documents will all be removed.'
    );
    if (!confirmed) return;
    setRemoving(true);
    try {
      await deleteProviderProfile();
      toast.success('Profile removed');
      logout();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to remove profile');
      setRemoving(false);
    }
  };

  const saveStep = async () => {
    setSaving(true);
    try {
      // If there are new uploaded files, convert them to base64 data URLs and append
      let newPhotos = profileData.photos || [];
      if (uploadedFiles.length > 0) {
        const imageFiles = uploadedFiles.filter(f => f.type === 'photo');
        const base64List = await filesToBase64(imageFiles);
        newPhotos = [...newPhotos, ...base64List];
      }
      const payload = {
        display_name: profileData.display_name,
        account_type: profileData.account_type,
        age: profileData.age ? parseInt(profileData.age) : null,
        gender: profileData.gender,
        essence: profileData.essence,
        companionshipType: profileData.companionshipType,
        location: profileData.location,
        bio: profileData.bio,
        services: profileData.services,
        rates: profileData.rates,
        contact: profileData.contact,
        schedule: profileData.schedule,
        availability_type: profileData.availability_type,
        booking_advance: profileData.booking_advance,
        available247: profileData.available247,
        photos: newPhotos,
        characteristics: profileData.characteristics
      };
      await updateProviderProfile(payload);
      setUploadedFiles([]);
      toast.success('Profile updated');
      await fetchDashboard();
      setMode('overview');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateProfile = async () => {
    try {
      // Persist uploaded files as base64 data URLs so they survive page refresh
      let newPhotos = profileData.photos || [];
      if (uploadedFiles.length > 0) {
        const imageFiles = uploadedFiles.filter(f => f.type === 'photo');
        const base64List = await filesToBase64(imageFiles);
        newPhotos = [...newPhotos, ...base64List];
      }
      const payload = {
        display_name: profileData.display_name,
        account_type: profileData.account_type,
        age: profileData.age ? parseInt(profileData.age) : null,
        gender: profileData.gender,
        essence: profileData.essence,
        companionshipType: profileData.companionshipType,
        location: profileData.location,
        bio: profileData.bio,
        services: profileData.services,
        rates: profileData.rates,
        contact: profileData.contact,
        schedule: profileData.schedule,
        availability_type: profileData.availability_type,
        booking_advance: profileData.booking_advance,
        available247: profileData.available247,
        photos: newPhotos,
        characteristics: profileData.characteristics
      };
      if (dashboard?.profile) {
        await updateProviderProfile(payload);
        toast.success('Profile updated successfully!');
      } else {
        await createProviderProfile(payload);
        toast.success('Profile created! Now let\'s verify your identity.');
        // Auto-open verification modal on first create
        setTimeout(() => setShowVerificationModal(true), 800);
      }
      setUploadedFiles([]);
      fetchDashboard();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save profile');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  };

  const handleFiles = (files) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'];
    const validFiles = files.filter(file => validTypes.includes(file.type));
    
    if (validFiles.length !== files.length) {
      toast.error('Some files were skipped. Only JPG, PNG, WebP images and MP4 videos are allowed.');
    }

    const newFiles = validFiles.map(file => ({
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('video') ? 'video' : 'photo',
      name: file.name
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  const nextStep = () => {
    if (currentStep < 5) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0EFF4] dashboard-light flex items-center justify-center">
        <div className="shimmer w-16 h-16 rounded-full"></div>
      </div>
    );
  }

  // If provider has a profile AND is in overview mode → show Management Dashboard
  if (dashboard?.profile && mode === 'overview') {
    const p = dashboard.profile;
    const inclusiveServices = Object.entries(profileData.services || {}).filter(([_, v]) => v?.type === 'inclusive');
    const extraServices = Object.entries(profileData.services || {}).filter(([_, v]) => v?.type === 'extra');
    const legacyServices = Array.isArray(p.services) ? p.services : [];
    const scheduleDays = Object.entries(profileData.schedule || {});
    const availableDays = scheduleDays.filter(([_, v]) => v?.available).length;
    const dayLabels = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };

    return (
      <div className="min-h-screen bg-[#F0EFF4] dashboard-light">
        <SiteHeader
          links={[
            { label: 'Logout', onClick: logout, testId: 'logout-btn' }
          ]}
        />

        <div className="pt-32 pb-20 section-padding">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12" data-testid="manage-header">
              <div>
                <p className="text-[#000000] text-xs uppercase tracking-[0.2em] mb-3">Manage Profile</p>
                <h2 className="text-4xl md:text-5xl text-[#000000] mb-3">Welcome, {p.display_name}</h2>
                <div className="flex items-center gap-4">
                  {p.verified ? (
                    <div className="verified-badge" data-testid="verified-badge"><CheckCircle size={16} weight="fill" />Verified Provider</div>
                  ) : (
                    <div className="status-badge status-pending">Verification {p.verification_status}</div>
                  )}
                  <span className="text-[#000000] text-sm">·</span>
                  <span className="text-[#000000] text-sm">{p.location?.city}, {p.location?.country}</span>
                </div>
              </div>
              <Link
                to={`/providers/${p.provider_id}`}
                className="btn-secondary flex items-center gap-2"
                data-testid="view-public-profile-btn"
              >
                View Public Profile
                <CaretRight size={16} />
              </Link>
            </div>

            {/* Subscription banner */}
            {subscription && (
              <div className="mb-8" data-testid="subscription-banner">
                {!subscription.featured_active ? (
                  <div className="rounded-lg border border-[#C6A87C]/40 bg-gradient-to-r from-[#C6A87C]/10 to-transparent p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Crown size={22} weight="fill" className="text-[#C6A87C] mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[#000000] font-medium mb-1">Activate your profile</p>
                        <p className="text-[#000000] text-sm">
                          Choose a Featured plan to appear on Browse. Add VIP Boost to be displayed at the top of every search.
                        </p>
                      </div>
                    </div>
                    <Link to="/subscribe" className="btn-primary whitespace-nowrap" data-testid="activate-cta">
                      Choose a plan
                    </Link>
                  </div>
                ) : (
                  <div className="rounded-lg border border-[#dbdadd] bg-white p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {subscription.vip_active ? (
                        <Crown size={22} weight="fill" className="text-[#C6A87C] mt-0.5 shrink-0" />
                      ) : (
                        <CheckCircle size={22} weight="fill" className="text-[#22C55E] mt-0.5 shrink-0" />
                      )}
                      <div>
                        <p className="text-[#000000] font-medium mb-1">
                          {subscription.vip_active ? 'VIP Featured · live' : 'Featured · live'}
                        </p>
                        <p className="text-[#000000] text-sm">
                          Your profile expires in <span className="text-[#000000] font-medium">{Math.ceil(subscription.featured_days_left)} day{Math.ceil(subscription.featured_days_left) === 1 ? '' : 's'}</span>
                          {subscription.vip_active && subscription.vip_days_left ? (
                            <> · VIP Boost: {Math.ceil(subscription.vip_days_left)} day{Math.ceil(subscription.vip_days_left) === 1 ? '' : 's'} remaining</>
                          ) : null}
                          .
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      {!subscription.vip_active && (
                        <Link to="/subscribe" className="btn-secondary whitespace-nowrap" data-testid="upgrade-vip-cta">
                          Upgrade to VIP
                        </Link>
                      )}
                      <Link to="/subscribe" className="btn-primary whitespace-nowrap" data-testid="renew-cta">
                        Renew / extend
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Verification banner / status */}
            {(() => {
              const s = p.verification_status || 'pending';
              const verified = p.verified === true;
              if (verified) {
                return (
                  <div
                    className="mb-8 rounded-lg border border-green-500/30 bg-green-500/5 p-5 flex items-start gap-4"
                    data-testid="verification-banner-approved"
                  >
                    <CheckCircle size={22} weight="fill" className="text-green-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[#000000] font-medium mb-1">Profile verified</p>
                      <p className="text-[#000000] text-sm">Your profile is live and appears in client search results with the Verified badge.</p>
                    </div>
                  </div>
                );
              }
              if (s === 'submitted') {
                return (
                  <div
                    className="mb-8 rounded-lg border border-[#C6A87C]/30 bg-[#C6A87C]/5 p-5 flex items-start gap-4"
                    data-testid="verification-banner-submitted"
                  >
                    <ShieldCheck size={22} weight="thin" className="text-[#C6A87C] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[#000000] font-medium mb-1">Verification under review</p>
                      <p className="text-[#000000] text-sm">We&apos;re reviewing your documents — you&apos;ll receive an email within 24 hours. Your profile becomes visible to clients once approved.</p>
                    </div>
                  </div>
                );
              }
              if (s === 'rejected') {
                return (
                  <div
                    className="mb-8 rounded-lg border border-red-500/30 bg-red-500/5 p-5"
                    data-testid="verification-banner-rejected"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                        <span className="text-red-400 text-lg">!</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-[#000000] font-medium mb-1">Verification needs attention</p>
                        {p.rejection_reason && (
                          <p className="text-[#000000] text-sm mb-3"><span className="text-[#000000]">Reason:</span> {p.rejection_reason}</p>
                        )}
                        <button
                          onClick={() => setShowVerificationModal(true)}
                          className="btn-primary text-sm"
                          data-testid="verification-resubmit-btn"
                        >
                          Resubmit documents
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }
              // pending (not submitted)
              return (
                <div
                  className="mb-8 rounded-lg border border-[#C6A87C]/40 bg-gradient-to-br from-[#C6A87C]/10 to-transparent p-6"
                  data-testid="verification-banner-pending"
                >
                  <div className="flex items-start gap-4">
                    <ShieldCheck size={24} weight="thin" className="text-[#C6A87C] mt-1 shrink-0" />
                    <div className="flex-1">
                      <p className="text-[#000000] font-medium mb-1">Unlock the Verified badge</p>
                      <p className="text-[#000000] text-sm mb-4 leading-relaxed">
                        Your profile is created — verify your identity to appear in client search and build trust. Takes about 2 minutes. We review within 24 hours.
                      </p>
                      <button
                        onClick={() => setShowVerificationModal(true)}
                        className="btn-primary text-sm"
                        data-testid="verification-start-btn"
                      >
                        Start verification
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Management Cards — stacked in registration order */}
            <div className="flex flex-col gap-6">
              {/* 1. Basic Info */}
              <div className="bg-white border border-[#dbdadd] rounded-lg p-8" data-testid="card-basic-info">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full border border-[#dbdadd] flex items-center justify-center">
                    <User size={18} className="text-[#C6A87C]" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#000000]">Step 1</p>
                    <h3 className="text-xl text-[#000000]">Basic Info</h3>
                  </div>
                </div>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-[#000000]">Display name</dt>
                    <dd className="text-[#000000] text-right">{p.display_name || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[#000000]">Age</dt>
                    <dd className="text-[#000000]">{p.age || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[#000000]">Gender</dt>
                    <dd className="text-[#000000] capitalize">{p.gender || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[#000000]">Location</dt>
                    <dd className="text-[#000000] text-right">{p.location?.city ? `${p.location.city}, ${p.location.country}` : '—'}</dd>
                  </div>
                  <div className="pt-2 border-t border-[#dbdadd]">
                    <dt className="text-[#000000] mb-2">Bio</dt>
                    <dd className="text-[#000000] line-clamp-3 leading-relaxed">{p.bio || <span className="text-[#000000] italic">Not set</span>}</dd>
                  </div>
                </dl>
                <button
                  onClick={() => openEdit(1)}
                  className="btn-secondary w-full mt-8"
                  data-testid="edit-basic-info-btn"
                >
                  Edit Basic Info
                </button>
              </div>

              {/* 2. Photos & Videos */}
              <div className="bg-white border border-[#dbdadd] rounded-lg p-8" data-testid="card-photos">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full border border-[#dbdadd] flex items-center justify-center">
                    <Camera size={18} className="text-[#C6A87C]" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#000000]">Step 2</p>
                    <h3 className="text-xl text-[#000000]">Photos & Video&apos;s</h3>
                  </div>
                </div>
                {p.photos && p.photos.length > 0 ? (
                  <>
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {p.photos.slice(0, 8).map((photo, i) => (
                        <div key={`${i}-${photo.slice(-40)}`} className="aspect-[3/4] overflow-hidden rounded">
                          <img src={photo} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                    <p className="text-[#000000] text-sm">{p.photos.length} media uploaded</p>
                  </>
                ) : (
                  <div className="h-32 flex items-center justify-center border border-dashed border-[#dbdadd] rounded">
                    <p className="text-[#000000] text-sm italic">No photos yet</p>
                  </div>
                )}
                <button
                  onClick={() => openEdit(2)}
                  className="btn-secondary w-full mt-8"
                  data-testid="edit-photos-btn"
                >
                  Edit Photos & Video&apos;s
                </button>
              </div>

              {/* 3. Services */}
              <div className="bg-white border border-[#dbdadd] rounded-lg p-8" data-testid="card-services">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full border border-[#dbdadd] flex items-center justify-center">
                    <FileText size={18} className="text-[#C6A87C]" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#000000]">Step 3</p>
                    <h3 className="text-xl text-[#000000]">Services</h3>
                  </div>
                </div>
                {legacyServices.length === 0 && inclusiveServices.length === 0 && extraServices.length === 0 ? (
                  <p className="text-[#000000] text-sm italic">No services set</p>
                ) : (
                  <div className="space-y-4">
                    {/* Prefer new-schema (dict) rendering; fall back to legacy list only if dict is empty */}
                    {inclusiveServices.length === 0 && extraServices.length === 0 && legacyServices.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#000000] mb-2">Offered</p>
                        <div className="flex flex-wrap gap-2">
                          {legacyServices.map((s) => (
                            <span key={s} className="px-3 py-1 text-xs border border-[#dbdadd] text-[#000000] rounded-full">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {inclusiveServices.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#000000] mb-2">Inclusive ({inclusiveServices.length})</p>
                        <div className="flex flex-wrap gap-2">
                          {inclusiveServices.slice(0, 8).map(([name]) => (
                            <span key={name} className="px-3 py-1 text-xs border border-[#dbdadd] text-[#000000] rounded-full">{name}</span>
                          ))}
                          {inclusiveServices.length > 8 && <span className="px-3 py-1 text-xs text-[#000000]">+{inclusiveServices.length - 8} more</span>}
                        </div>
                      </div>
                    )}
                    {extraServices.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#000000] mb-2">Extra ({extraServices.length})</p>
                        <div className="flex flex-wrap gap-2">
                          {extraServices.slice(0, 6).map(([name, v]) => (
                            <span key={name} className="px-3 py-1 text-xs border border-[#C6A87C]/40 bg-[#C6A87C]/10 text-[#C6A87C] rounded-full">
                              {name} {v.price && `· €${v.price}`}
                            </span>
                          ))}
                          {extraServices.length > 6 && <span className="px-3 py-1 text-xs text-[#000000]">+{extraServices.length - 6} more</span>}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={() => openEdit(3)}
                  className="btn-secondary w-full mt-8"
                  data-testid="edit-services-btn"
                >
                  Edit Services
                </button>
              </div>

              {/* 4. Rates */}
              <div className="bg-white border border-[#dbdadd] rounded-lg p-8" data-testid="card-rates">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full border border-[#dbdadd] flex items-center justify-center">
                    <CurrencyDollar size={18} className="text-[#C6A87C]" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#000000]">Step 4</p>
                    <h3 className="text-xl text-[#000000]">Rates</h3>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {['incall', 'outcall'].map((kind) => {
                    const col = profileData.rates?.[kind] || {};
                    const sym = currencySymbol(profileData.rates?.currency);
                    const base = ['1hour', '2hours', '3hours'];
                    const extras = (Array.isArray(col.extras) ? col.extras : [])
                      .slice()
                      .sort((a, b) => (Number(a.hours) || 0) - (Number(b.hours) || 0));
                    return (
                      <div key={kind}>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#C6A87C] mb-3">{kind}</p>
                        <div className="space-y-2">
                          {[
                            { key: '1hour', label: '1 hour' },
                            { key: '2hours', label: '2 hours' },
                            { key: '3hours', label: '3 hours' }
                          ].map(({ key, label }) => {
                            const v = col[key];
                            return (
                              <div key={key} className="flex items-center justify-between border-b border-[#dbdadd] pb-2">
                                <span className="text-[#000000] text-sm">{label}</span>
                                <span className="text-[#C6A87C]">
                                  {v ? `${sym}${v}` : <span className="text-[#000000] text-sm italic">Not set</span>}
                                </span>
                              </div>
                            );
                          })}
                          {extras.map((extra, i) => (
                            <div key={`extra-${i}`} className="flex items-center justify-between border-b border-[#dbdadd] pb-2">
                              <span className="text-[#000000] text-sm">{extra.hours} hours</span>
                              <span className="text-[#C6A87C]">
                                {extra.price ? `${sym}${extra.price}` : <span className="text-[#000000] text-sm italic">Not set</span>}
                              </span>
                            </div>
                          ))}
                          {col.overnight !== undefined && col.overnight !== '' && (
                            <div className="flex items-center justify-between border-b border-[#dbdadd] pb-2">
                              <span className="text-[#000000] text-sm">Overnight</span>
                              <span className="text-[#C6A87C]">{sym}{col.overnight}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => openEdit(4, 'rates-section')}
                  className="btn-secondary w-full mt-8"
                  data-testid="edit-rates-btn"
                >
                  Edit Rates
                </button>
              </div>

              {/* 5. Availability */}
              <div className="bg-white border border-[#dbdadd] rounded-lg p-8" data-testid="card-availability">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full border border-[#dbdadd] flex items-center justify-center">
                    <Clock size={18} className="text-[#C6A87C]" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#000000]">Step 4</p>
                    <h3 className="text-xl text-[#000000]">Availability</h3>
                    <p className="text-[#000000] text-xs mt-1">{availableDays} of 7 days available</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
                  {scheduleDays.map(([day, sched]) => (
                    <div
                      key={day}
                      className={`border p-3 text-center transition-colors ${
                        sched?.available ? 'border-[#C6A87C]/40 bg-[#C6A87C]/5' : 'border-[#dbdadd] opacity-50'
                      }`}
                    >
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[#000000] mb-2">{dayLabels[day] || day.slice(0, 3)}</p>
                      {sched?.available ? (
                        <>
                          <p className="text-[#000000] text-sm">{sched.start}</p>
                          <p className="text-[#000000] text-xs">to</p>
                          <p className="text-[#000000] text-sm">{sched.end}</p>
                        </>
                      ) : (
                        <p className="text-[#000000] text-xs italic">Closed</p>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => openEdit(4, 'availability-section')}
                  className="btn-secondary w-full mt-8"
                  data-testid="edit-availability-btn"
                >
                  Edit Availability
                </button>
              </div>

              {/* Danger zone — Remove profile */}
              <div className="bg-white border border-red-500/30 rounded-lg p-6 mt-12" data-testid="card-danger-zone">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full border border-red-500/40 flex items-center justify-center">
                    <Trash size={18} className="text-red-400" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-red-400/80">Danger zone</p>
                    <h3 className="text-xl text-[#000000]">Remove my profile</h3>
                  </div>
                </div>
                <p className="text-[#000000] text-sm mb-6">
                  This permanently deletes your profile, photos, subscriptions and verification documents. This action cannot be undone.
                </p>
                <button
                  onClick={handleRemoveProfile}
                  disabled={removing}
                  className="w-full px-4 py-3 border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors text-sm uppercase tracking-wider disabled:opacity-50"
                  data-testid="remove-profile-btn"
                >
                  {removing ? 'Removing…' : 'Remove profile permanently'}
                </button>
              </div>
            </div>
          </div>
        </div>
        <VerificationModal
          open={showVerificationModal}
          onClose={() => setShowVerificationModal(false)}
          onSubmitted={fetchDashboard}
        />
      </div>
    );
  }

  // Profile setup flow - full page experience
  return (
    <div className="min-h-screen bg-[#F0EFF4] dashboard-light">
      {/* Header */}
      <SiteHeader
        leftSlot={
          mode === 'edit' ? (
            <button
              onClick={cancelEdit}
              className="flex items-center gap-2 text-[#000000] hover:text-[#DA4167] transition-colors"
              data-testid="back-to-overview-btn"
            >
              <CaretLeft size={18} />
              <span className="uppercase tracking-wider text-xs md:text-sm">Back to Overview</span>
            </button>
          ) : null
        }
        links={[
          { label: 'Logout', onClick: logout, testId: 'logout-btn' }
        ]}
      />

      <div className="pt-32 pb-20 section-padding">
        <div className="max-w-4xl mx-auto">
          {/* Page Title */}
          <div className="text-center mb-12">
            <h2 className="text-4xl text-[#000000] mb-4">
 {mode === 'edit' ? `Edit ${steps[currentStep - 1]?.title}` : 'Complete Your Profile'}
 </h2>
            <p className="text-[#000000]">
              {mode === 'edit' ? 'Update this section of your profile' : 'Set up your provider profile to start receiving enquiries'}
            </p>
          </div>

          {/* Progress Steps - only for creation flow */}
          {mode !== 'edit' && (
          <div className="flex items-center justify-between mb-12 px-4">
            {steps.map((step, index) => {
              const stepStateClass = (() => {
                if (currentStep === step.id) return 'text-[#832161]';
                if (currentStep > step.id) return 'text-green-600';
                return 'text-[#000000]';
              })();
              const stepBorderClass = (() => {
                if (currentStep === step.id) return 'border-[#832161] bg-white';
                if (currentStep > step.id) return 'border-green-600 bg-white';
                return 'border-[#dbdadd] bg-white';
              })();
              return (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex flex-col items-center gap-2 transition-all ${stepStateClass}`}
                  data-testid={`step-${step.id}`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${stepBorderClass}`}>
                    {currentStep > step.id ? (
                      <CheckCircle size={24} weight="fill" />
                    ) : (
                      <step.icon size={24} />
                    )}
                  </div>
                  <span className="text-xs uppercase tracking-wider hidden md:block">{step.title}</span>
                </button>
                {index < steps.length - 1 && (
                  <div className={`w-8 md:w-16 h-0.5 mx-2 ${
                    currentStep > step.id ? 'bg-green-600' : 'bg-[#dbdadd]'
                  }`} />
                )}
              </div>
              );
            })}
          </div>
          )}

          {/* Step Content */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={currentStep === 1 ? 'p-0' : 'bg-white border border-[#dbdadd] rounded-lg p-8 transition-none'}
          >
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-8">
                {/* Box 1: Basic Information */}
                <div className="bg-white border border-[#dbdadd] rounded-lg p-6">
                  <h3 className="text-2xl font-bold text-[#832161] mb-6">Basic Information</h3>
                  
                  <div className="flex flex-col gap-4">
                    {/* Account Type */}
                    <div>
                      <label className="input-label">I am</label>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => setProfileData({ ...profileData, account_type: 'independent' })}
                          className={`py-3 px-6 border transition-all ${
                            profileData.account_type === 'independent'
                              ? 'border-[#832161] text-[#832161]'
                              : 'border-[#898989] text-[#898989] hover:border-[#832161]'
                          }`}
                          data-testid="account-type-independent"
                        >
                          <span className="uppercase tracking-wider text-sm font-medium">Independent Companion</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setProfileData({ ...profileData, account_type: 'agency' })}
                          className={`py-3 px-6 border transition-all ${
                            profileData.account_type === 'agency'
                              ? 'border-[#832161] text-[#832161]'
                              : 'border-[#898989] text-[#898989] hover:border-[#832161]'
                          }`}
                          data-testid="account-type-agency"
                        >
                          <span className="uppercase tracking-wider text-sm font-medium">Agency</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="input-label">
                        {profileData.account_type === 'agency' ? 'Agency name' : 'Display name'}
                      </label>
                      <input
                        type="text"
                        value={profileData.display_name}
                        onChange={(e) => setProfileData({ ...profileData, display_name: e.target.value })}
                        className="input-premium w-full"
                        placeholder={profileData.account_type === 'agency' ? 'Your agency name' : 'Your display name'}
                        data-testid="display-name-input"
                      />
                    </div>

                    <div>
                      <label className="input-label">Age</label>
                      <input
                        type="number"
                        value={profileData.age}
                        onChange={(e) => setProfileData({ ...profileData, age: e.target.value })}
                        className="input-premium w-full"
                        placeholder="Your age"
                        min="18"
                        data-testid="age-input"
                      />
                    </div>
                    <div>
                      <label className="input-label">Gender</label>
                      <select
                        value={profileData.gender}
                        onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
                        className="input-premium w-full"
                        data-testid="gender-input"
                      >
                        <option value="">Select gender</option>
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                        <option value="trans">Trans</option>
                      </select>
                    </div>

                    <div>
                      <label className="input-label">City</label>
                      <input
                        type="text"
                        value={profileData.location.city}
                        onChange={(e) => setProfileData({ ...profileData, location: { ...profileData.location, city: e.target.value } })}
                        className="input-premium w-full"
                        placeholder="Your city"
                        data-testid="city-input"
                      />
                    </div>
                    <div>
                      <label className="input-label">Country</label>
                      <select
                        value={profileData.location.country}
                        onChange={(e) => setProfileData({ ...profileData, location: { ...profileData.location, country: e.target.value } })}
                        className="input-premium w-full"
                        data-testid="country-input"
                      >
                          <option value="">Select country</option>
                          <option value="Belgium">Belgium</option>
                          <option value="Netherlands">Netherlands</option>
                          <option value="Luxembourg">Luxembourg</option>
                          <option value="France">France</option>
                          <option value="Germany">Germany</option>
                          <option value="United Kingdom">United Kingdom</option>
                          <option value="Spain">Spain</option>
                          <option value="Italy">Italy</option>
                          <option value="Portugal">Portugal</option>
                          <option value="Switzerland">Switzerland</option>
                          <option value="Austria">Austria</option>
                          <option value="Ireland">Ireland</option>
                          <option value="Denmark">Denmark</option>
                          <option value="Sweden">Sweden</option>
                          <option value="Norway">Norway</option>
                          <option value="Finland">Finland</option>
                          <option value="Poland">Poland</option>
                          <option value="Czech Republic">Czech Republic</option>
                          <option value="Greece">Greece</option>
                          <option value="Croatia">Croatia</option>
                          <option value="Hungary">Hungary</option>
                          <option value="Romania">Romania</option>
                          <option value="Bulgaria">Bulgaria</option>
                          <option value="Slovenia">Slovenia</option>
                          <option value="Slovakia">Slovakia</option>
                          <option value="Estonia">Estonia</option>
                          <option value="Latvia">Latvia</option>
                          <option value="Lithuania">Lithuania</option>
                          <option value="Cyprus">Cyprus</option>
                          <option value="Malta">Malta</option>
                          <option value="Monaco">Monaco</option>
                          <option value="Andorra">Andorra</option>
                          <option value="United States">United States</option>
                          <option value="Canada">Canada</option>
                          <option value="Australia">Australia</option>
                          <option value="New Zealand">New Zealand</option>
                          <option value="Brazil">Brazil</option>
                          <option value="Argentina">Argentina</option>
                          <option value="Mexico">Mexico</option>
                          <option value="United Arab Emirates">United Arab Emirates</option>
                          <option value="Singapore">Singapore</option>
                          <option value="Japan">Japan</option>
                          <option value="South Korea">South Korea</option>
                          <option value="Thailand">Thailand</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                  </div>

                  {/* Describe yourself */}
                  <div className="mt-8 pt-8 border-t border-[#dbdadd]">
                    <label className="input-label">Describe yourself</label>
                    <textarea
                      value={profileData.bio}
                      onChange={(e) => setProfileData({ ...profileData, bio: e.target.value.slice(0, 1500) })}
                      className="input-premium w-full h-32 resize-none"
                      placeholder="Share what makes you unique. This will be displayed in 'My Essence' on your profile..."
                      maxLength={1500}
                      data-testid="essence-input"
                    />
                    <div className="flex justify-end mt-2">
                      <span className="text-xs text-[#000000]">{(profileData.bio || '').length}/1500</span>
                    </div>
                  </div>

                  {/* Languages */}
                  <div className="mt-8 pt-8 border-t border-[#dbdadd]">
                    <div className="flex items-end justify-between mb-3">
                      <label className="input-label !mb-0">Languages</label>
                      <span className="text-xs text-[#000000]">
                        {(profileData.characteristics?.languages || []).length} selected
                      </span>
                    </div>
                    {(() => {
                      const PRESETS = ['English', 'French', 'German', 'Russian'];
                      const current = profileData.characteristics?.languages || [];
                      const customs = current.filter((l) => !PRESETS.includes(l));

                      const toggle = (lang) => {
                        const next = current.includes(lang)
                          ? current.filter((l) => l !== lang)
                          : [...current, lang];
                        setProfileData({
                          ...profileData,
                          characteristics: { ...(profileData.characteristics || {}), languages: next }
                        });
                      };
                      const addCustom = () => {
                        const v = newLanguage.trim();
                        if (!v) return;
                        // case-insensitive duplicate guard
                        if (current.some((l) => l.toLowerCase() === v.toLowerCase())) {
                          setNewLanguage('');
                          return;
                        }
                        setProfileData({
                          ...profileData,
                          characteristics: {
                            ...(profileData.characteristics || {}),
                            languages: [...current, v]
                          }
                        });
                        setNewLanguage('');
                      };

                      return (
                        <>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {PRESETS.map((lang) => {
                              const selected = current.includes(lang);
                              return (
                                <button
                                  key={lang}
                                  type="button"
                                  onClick={() => toggle(lang)}
                                  className={`py-2.5 px-3 border text-sm uppercase tracking-wider transition-all ${
                                    selected
                                      ? 'border-[#832161] text-[#832161]'
                                      : 'border-[#898989] text-[#898989] hover:border-[#832161]'
                                  }`}
                                  data-testid={`basic-lang-${lang.toLowerCase()}`}
                                >
                                  {lang}
                                </button>
                              );
                            })}
                            {customs.map((lang) => (
                              <div
                                key={lang}
                                className="relative py-2.5 pl-3 pr-8 border border-[#832161] text-[#832161] text-sm uppercase tracking-wider flex items-center"
                                data-testid={`basic-lang-custom-${lang.toLowerCase()}`}
                              >
                                <span className="truncate">{lang}</span>
                                <button
                                  type="button"
                                  onClick={() => toggle(lang)}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#832161] hover:text-red-400 transition-colors"
                                  aria-label={`Remove ${lang}`}
                                  data-testid={`basic-lang-remove-${lang.toLowerCase()}`}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>

                          {/* Add language CTA → reveals input */}
                          {showAddLanguage ? (
                            <div className="mt-4 flex items-center gap-2">
                              <input
                                type="text"
                                value={newLanguage}
                                onChange={(e) => setNewLanguage(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addCustom();
                                    setShowAddLanguage(false);
                                  } else if (e.key === 'Escape') {
                                    setNewLanguage('');
                                    setShowAddLanguage(false);
                                  }
                                }}
                                autoFocus
                                placeholder="e.g. Italian"
                                className="input-premium flex-1"
                                data-testid="add-language-input"
                              />
                              <button
                                type="button"
                                onClick={() => { addCustom(); setShowAddLanguage(false); }}
                                disabled={!newLanguage.trim()}
                                className="px-4 py-3 border border-[#C6A87C] text-[#C6A87C] hover:bg-[#C6A87C]/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm uppercase tracking-wider whitespace-nowrap"
                                data-testid="add-language-confirm"
                              >
                                Add
                              </button>
                              <button
                                type="button"
                                onClick={() => { setNewLanguage(''); setShowAddLanguage(false); }}
                                className="px-3 py-3 border border-[#dbdadd] text-[#000000] hover:border-red-400 hover:text-red-400 transition-colors"
                                aria-label="Cancel"
                                data-testid="add-language-cancel"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setShowAddLanguage(true)}
                              className="mt-4 inline-flex items-center gap-2 px-4 py-3 border border-dashed border-[#dbdadd] text-[#000000] hover:border-[#C6A87C] hover:text-[#DA4167] transition-colors text-sm uppercase tracking-wider"
                              data-testid="add-language-button"
                            >
                              <Plus size={16} /> Add language
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Box 2: Contact Information */}
                <div className="bg-white border border-[#dbdadd] rounded-lg p-6">
                  <h3 className="text-2xl font-bold text-[#832161] mb-6">Contact information</h3>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="input-label">Mobile phone</label>
                      {(() => {
                        const dial = COUNTRY_DIAL_CODES[profileData.location.country] || '';
                        const raw = profileData.contact.phone || '';
                        // Strip leading dial code from displayed value so the prefix doesn't double
                        const localValue = dial && raw.startsWith(dial)
                          ? raw.slice(dial.length).replace(/^\s+/, '')
                          : raw;
                        return (
                          <div className="flex items-stretch border border-[#dbdadd] focus-within:border-[#C6A87C] transition-colors">
                            {dial && (
                              <span className="px-3 py-3 bg-white text-[#C6A87C] text-[13px] border-r border-[#dbdadd] select-none whitespace-nowrap" data-testid="phone-dial-code">
                                {dial}
                              </span>
                            )}
                            <input
                              type="tel"
                              value={localValue}
                              onChange={(e) => {
                                const next = e.target.value.replace(/^\+\d+\s?/, '');
                                setProfileData({
                                  ...profileData,
                                  contact: {
                                    ...profileData.contact,
                                    phone: dial ? `${dial} ${next}`.trim() : next
                                  }
                                });
                              }}
                              className="flex-1 bg-transparent border-0 focus:ring-0 focus:outline-none px-4 py-3 text-[13px] text-[#000000] placeholder:text-[#000000] placeholder:italic"
                              placeholder={dial ? 'XXX XX XX XX' : 'Select country first or enter full number'}
                              data-testid="phone-input"
                            />
                          </div>
                        );
                      })()}
                    </div>
                    <div>
                      <label className="input-label">E-mail</label>
                      <input
                        type="email"
                        value={profileData.contact.email}
                        onChange={(e) => setProfileData({ ...profileData, contact: { ...profileData.contact, email: e.target.value } })}
                        className="input-premium w-full"
                        placeholder="your@email.com"
                        data-testid="email-input"
                      />
                    </div>

                    <div>
                      <label className="input-label mb-4">Available on</label>
                      <div className="flex gap-6 flex-wrap">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={profileData.contact.hasWhatsapp || false}
                            onChange={(e) => setProfileData({
                              ...profileData,
                              contact: { ...profileData.contact, hasWhatsapp: e.target.checked }
                            })}
                            className="w-5 h-5 rounded border-[#dbdadd] bg-white checked:bg-[#25D366] checked:border-[#25D366]"
                          />
                          <span className="text-[#000000]">WhatsApp</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={profileData.contact.hasTelegram || false}
                            onChange={(e) => setProfileData({
                              ...profileData,
                              contact: { ...profileData.contact, hasTelegram: e.target.checked }
                            })}
                            className="w-5 h-5 rounded border-[#dbdadd] bg-white checked:bg-[#0088cc] checked:border-[#0088cc]"
                          />
                          <span className="text-[#000000]">Telegram</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={profileData.contact.hasSignal || false}
                            onChange={(e) => setProfileData({
                              ...profileData,
                              contact: { ...profileData.contact, hasSignal: e.target.checked }
                            })}
                            className="w-5 h-5 rounded border-[#dbdadd] bg-white checked:bg-[#3A76F0] checked:border-[#3A76F0]"
                          />
                          <span className="text-[#000000]">Signal</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={profileData.contact.hasSms || false}
                            onChange={(e) => setProfileData({
                              ...profileData,
                              contact: { ...profileData.contact, hasSms: e.target.checked }
                            })}
                            className="w-5 h-5 rounded border-[#dbdadd] bg-white checked:bg-[#C6A87C] checked:border-[#C6A87C]"
                            data-testid="contact-sms"
                          />
                          <span className="text-[#000000]">SMS</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={profileData.contact.hasViber || false}
                            onChange={(e) => setProfileData({
                              ...profileData,
                              contact: { ...profileData.contact, hasViber: e.target.checked }
                            })}
                            className="w-5 h-5 rounded border-[#dbdadd] bg-white checked:bg-[#7360F2] checked:border-[#7360F2]"
                            data-testid="contact-viber"
                          />
                          <span className="text-[#000000]">Viber</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={profileData.contact.hasLine || false}
                            onChange={(e) => setProfileData({
                              ...profileData,
                              contact: { ...profileData.contact, hasLine: e.target.checked }
                            })}
                            className="w-5 h-5 rounded border-[#dbdadd] bg-white checked:bg-[#00C300] checked:border-[#00C300]"
                            data-testid="contact-line"
                          />
                          <span className="text-[#000000]">Line</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={profileData.contact.hasWechat || false}
                            onChange={(e) => setProfileData({
                              ...profileData,
                              contact: { ...profileData.contact, hasWechat: e.target.checked }
                            })}
                            className="w-5 h-5 rounded border-[#dbdadd] bg-white checked:bg-[#09B83E] checked:border-[#09B83E]"
                            data-testid="contact-wechat"
                          />
                          <span className="text-[#000000]">WeChat</span>
                        </label>
                      </div>

                      {/* ID inputs for username-based platforms */}
                      {(profileData.contact.hasTelegram || profileData.contact.hasLine || profileData.contact.hasWechat) && (
                        <div className="mt-4 flex flex-col gap-4">
                          {profileData.contact.hasTelegram && (
                            <div>
                              <label className="input-label" htmlFor="telegram-id">Telegram ID</label>
                              <input
                                id="telegram-id"
                                type="text"
                                value={profileData.contact.telegramId || ''}
                                onChange={(e) => setProfileData({
                                  ...profileData,
                                  contact: { ...profileData.contact, telegramId: e.target.value }
                                })}
                                className="input-premium w-full"
                                placeholder="@username"
                                data-testid="telegram-id-input"
                              />
                            </div>
                          )}
                          {profileData.contact.hasLine && (
                            <div>
                              <label className="input-label" htmlFor="line-id">Line ID</label>
                              <input
                                id="line-id"
                                type="text"
                                value={profileData.contact.lineId || ''}
                                onChange={(e) => setProfileData({
                                  ...profileData,
                                  contact: { ...profileData.contact, lineId: e.target.value }
                                })}
                                className="input-premium w-full"
                                placeholder="your-line-id"
                                data-testid="line-id-input"
                              />
                            </div>
                          )}
                          {profileData.contact.hasWechat && (
                            <div>
                              <label className="input-label" htmlFor="wechat-id">WeChat ID</label>
                              <input
                                id="wechat-id"
                                type="text"
                                value={profileData.contact.wechatId || ''}
                                onChange={(e) => setProfileData({
                                  ...profileData,
                                  contact: { ...profileData.contact, wechatId: e.target.value }
                                })}
                                className="input-premium w-full"
                                placeholder="your-wechat-id"
                                data-testid="wechat-id-input"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Box 2: Physical Characteristics (optional) */}
                <div className="bg-white border border-[#dbdadd] rounded-lg p-6">
                  <h3 className="text-2xl font-bold text-[#832161] mb-1">Physical Characteristics</h3>
                  <p className="text-[#000000] text-sm mb-6">All fields are optional — fill what you want shown on your profile.</p>

                  <CharacteristicsForm
                    characteristics={profileData.characteristics}
                    onChange={(c) => setProfileData({ ...profileData, characteristics: c })}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Photos & Video's */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-[#832161] mb-6">Photos & Video&apos;s</h3>
                <p className="text-[#000000] text-sm mb-6">Add photos and videos to your profile. Media will be reviewed before being published.</p>

                {/* Upload Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-12 text-center transition-all cursor-pointer ${
                    isDragging 
                      ? 'border-[#C6A87C] bg-[#C6A87C]/5' 
                      : 'border-[#dbdadd] hover:border-[#C6A87C]'
                  }`}
                  onClick={() => document.getElementById('file-upload').click()}
                  data-testid="upload-zone"
                >
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  <UploadSimple size={48} className={`mx-auto mb-4 transition-colors ${isDragging ? 'text-[#C6A87C]' : 'text-[#000000]'}`} />
                  <p className="text-[#000000] text-lg mb-2">
                    {isDragging ? 'Drop files here' : 'Drag & drop your files here'}
                  </p>
                  <p className="text-[#000000] text-sm mb-4">or click to browse</p>
                  <p className="text-[#000000] text-xs">
                    Supported formats: JPG, PNG, WebP, MP4 • Max 10MB per file
                  </p>
                </div>

                {/* Existing photos from profile */}
                {profileData.photos && profileData.photos.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[#000000] font-medium">Current media ({profileData.photos.length})</h4>
                      <p className="text-[#000000] text-xs">Drag to reorder · the first photo is your cover</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {profileData.photos.map((photoUrl, idx) => (
                        <div
                          key={`existing-${idx}`}
                          draggable
                          onDragStart={() => onPhotoDragStart(idx)}
                          onDragOver={onPhotoDragOver}
                          onDrop={() => onPhotoDrop(idx)}
                          onDragEnd={() => setDraggedPhotoIdx(null)}
                          className={`relative group aspect-[3/4] cursor-grab active:cursor-grabbing transition-opacity ${
                            draggedPhotoIdx === idx ? 'opacity-40' : ''
                          }`}
                          data-testid={`existing-photo-${idx}`}
                        >
                          <img
                            src={photoUrl}
                            alt={`Photo ${idx + 1}`}
                            className="w-full h-full object-cover rounded pointer-events-none"
                          />

                          {/* Cover badge */}
                          {idx === 0 && (
                            <span className="absolute top-2 left-2 px-2 py-1 bg-[#C6A87C] text-[#0A0A0C] text-[10px] uppercase tracking-wider font-medium rounded-sm">
                              Cover
                            </span>
                          )}

                          {/* Drag handle indicator (top center) */}
                          <div className="absolute top-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-[#000000] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <DotsSixVertical size={14} />
                          </div>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProfileData({
                                ...profileData,
                                photos: profileData.photos.filter((_, i) => i !== idx)
                              });
                            }}
                            className="absolute top-2 right-2 w-7 h-7 bg-black/70 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            data-testid={`remove-existing-photo-${idx}`}
                            aria-label="Delete photo"
                          >
                            <X size={14} className="text-white" />
                          </button>

                          {/* Reorder arrows (bottom) */}
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); movePhoto(idx, idx - 1); }}
                              disabled={idx === 0}
                              className="w-7 h-7 bg-black/70 hover:bg-[#C6A87C] disabled:opacity-30 disabled:cursor-not-allowed rounded-full flex items-center justify-center text-white"
                              data-testid={`photo-move-left-${idx}`}
                              aria-label="Move left"
                            >
                              <CaretLeft size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); movePhoto(idx, idx + 1); }}
                              disabled={idx === profileData.photos.length - 1}
                              className="w-7 h-7 bg-black/70 hover:bg-[#C6A87C] disabled:opacity-30 disabled:cursor-not-allowed rounded-full flex items-center justify-center text-white"
                              data-testid={`photo-move-right-${idx}`}
                              aria-label="Move right"
                            >
                              <CaretRight size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Uploaded Files Preview */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[#000000] font-medium">{uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} selected</h4>
                      <button
                        type="button"
                        onClick={() => setUploadedFiles([])}
                        className="text-[#000000] hover:text-red-500 text-sm transition-colors"
                      >
                        Remove all
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      {uploadedFiles.map((file) => (
                        <div key={file.id} className="relative group aspect-[3/4]">
                          {file.type === 'video' ? (
                            <div className="w-full h-full bg-white rounded flex items-center justify-center">
                              <VideoCamera size={32} className="text-[#000000]" />
                            </div>
                          ) : (
                            <img
                              src={file.preview}
                              alt={file.name}
                              className="w-full h-full object-cover rounded"
                            />
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(file.id);
                            }}
                            className="absolute top-2 right-2 w-6 h-6 bg-black/70 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            data-testid={`remove-file-${file.id}`}
                          >
                            <X size={14} className="text-white" />
                          </button>
                          {file.type === 'video' && (
                            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 rounded text-xs text-white">
                              Video
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-[#000000] text-sm">
                  Tip: Use high-quality photos that show your personality. Avoid filters and ensure good lighting.
                </p>
              </div>
            )}

            {/* Step 3: Services */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-[#832161] mb-6">Services</h3>
                
                {/* Type of Companionship */}
                <div className="mb-8">
                  <label className="input-label mb-4">Type of companionship</label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setProfileData({ ...profileData, companionshipType: 'escort' })}
                      className={`px-6 py-3 border text-sm transition-all ${
                        profileData.companionshipType === 'escort'
                          ? 'border-[#832161] text-[#832161]'
                          : 'border-[#898989] text-[#898989] hover:border-[#832161]'
                      }`}
                    >
                      Escort
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfileData({ ...profileData, companionshipType: 'erotic-massage' })}
                      className={`px-6 py-3 border text-sm transition-all ${
                        profileData.companionshipType === 'erotic-massage'
                          ? 'border-[#832161] text-[#832161]'
                          : 'border-[#898989] text-[#898989] hover:border-[#832161]'
                      }`}
                    >
                      Erotic Massage
                    </button>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-[#dbdadd] my-4"></div>
                
                <p className="text-[#000000] text-sm mb-4">Select the services you offer and specify if they are inclusive or at an extra cost</p>
                
                {/* Services Table */}
                <div className="border border-[#dbdadd] rounded-lg overflow-hidden">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-[#4B4B4B] border-b border-[#4B4B4B]">
                    <div className="col-span-5 text-[#FFFFFF] text-sm font-medium">Service</div>
                    <div className="col-span-3 text-[#FFFFFF] text-sm font-medium">Type</div>
                    <div className="col-span-4 text-[#FFFFFF] text-sm font-medium text-right">Price</div>
                  </div>
                  
                  {/* Table Body */}
                  <div>
                    {serviceOptions.map((service, index) => {
                      const serviceData = profileData.services[service] || { type: null, price: '' };
                      return (
                        <div 
                          key={service} 
                          className={`grid grid-cols-12 gap-4 px-4 py-3 items-center ${
                            index !== serviceOptions.length - 1 ? 'border-b border-[#dbdadd]' : ''
                          } ${serviceData.type ? 'bg-[#C6A87C]/5' : ''}`}
                        >
                          {/* Service Name */}
                          <div className="col-span-5 text-[#000000] text-sm">{service}</div>
                          
                          {/* Type Selectors */}
                          <div className="col-span-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => setProfileData({
                                ...profileData,
                                services: {
                                  ...profileData.services,
                                  [service]: { 
                                    type: serviceData.type === 'inclusive' ? null : 'inclusive', 
                                    price: '' 
                                  }
                                }
                              })}
                              className={`px-3 h-9 text-xs border transition-all ${
                                serviceData.type === 'inclusive'
                                  ? 'border-[#832161] text-[#832161]'
                                  : 'border-[#898989] text-[#898989] hover:border-[#832161]'
                              }`}
                            >
                              Inclusive
                            </button>
                            <button
                              type="button"
                              onClick={() => setProfileData({
                                ...profileData,
                                services: {
                                  ...profileData.services,
                                  [service]: { 
                                    type: serviceData.type === 'extra' ? null : 'extra', 
                                    price: serviceData.price 
                                  }
                                }
                              })}
                              className={`px-3 h-9 text-xs border transition-all ${
                                serviceData.type === 'extra'
                                  ? 'border-[#832161] text-[#832161]'
                                  : 'border-[#898989] text-[#898989] hover:border-[#832161]'
                              }`}
                            >
                              Extra
                            </button>
                          </div>
                          
                          {/* Price Field */}
                          <div className="col-span-4 flex justify-end">
                            {serviceData.type === 'extra' ? (
                              <div className="relative w-24">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#000000] text-sm">€</span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={serviceData.price}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9]/g, '');
                                    setProfileData({
                                      ...profileData,
                                      services: {
                                        ...profileData.services,
                                        [service]: { ...serviceData, price: value }
                                      }
                                    });
                                  }}
                                  className="input-premium w-full h-9 !pl-7 !pr-2 text-xs"
                                  placeholder="0"
                                />
                              </div>
                            ) : (
                              <span className="text-[#000000] text-sm">-</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Add Custom Service */}
                <div className="mt-6 p-4 border border-[#dbdadd] rounded-lg">
                  <label className="input-label mb-3">Add another service</label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="text"
                      value={newService}
                      onChange={(e) => setNewService(e.target.value)}
                      className="input-premium w-64"
                      placeholder="Enter service name..."
                      data-testid="custom-service-input"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newService.trim()) {
                          setProfileData({
                            ...profileData,
                            services: {
                              ...profileData.services,
                              [newService.trim()]: { type: 'inclusive', price: '' }
                            }
                          });
                          setNewService('');
                        }
                      }}
                      className="btn-secondary h-[50px] px-6 flex items-center gap-2"
                    >
                      <Plus size={18} />
                      Add
                    </button>
                  </div>
                </div>

                {/* Summary */}
                {Object.keys(profileData.services).filter(s => profileData.services[s]?.type).length > 0 && (
                  <div className="mt-4 p-4 border border-[#dbdadd] rounded">
                    <p className="text-[#000000] text-sm mb-2">
                      Selected: {Object.keys(profileData.services).filter(s => profileData.services[s]?.type === 'inclusive').length} inclusive, {Object.keys(profileData.services).filter(s => profileData.services[s]?.type === 'extra').length} extra
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Rates & Availability */}
            {currentStep === 4 && (
              <div className="space-y-10">
                {/* Availability */}
                <div id="availability-section" className="flex flex-col gap-4 scroll-mt-24">
                  <div>
                    <h3 className="text-2xl font-bold text-[#832161] mb-1">Availability</h3>
                    <p className="text-[#000000] text-sm">Set your availability for each day</p>
                  </div>

                  {/* Service type: Incall / Outcall / Both */}
                  <div>
                    <label className="input-label">Available for</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: 'incall',  label: 'Incall' },
                        { value: 'outcall', label: 'Outcall' },
                        { value: 'both',    label: 'Incall & outcall' }
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setProfileData({ ...profileData, availability_type: opt.value })}
                          className={`py-3 px-4 border text-sm uppercase tracking-wider transition-all ${
                            profileData.availability_type === opt.value
                              ? 'border-[#832161] text-[#832161]'
                              : 'border-[#898989] text-[#898989] hover:border-[#832161]'
                          }`}
                          data-testid={`availability-type-${opt.value}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 24/7 Option */}
                  <div className="space-y-0">
                  <label className="flex items-center gap-3 cursor-pointer py-1">
                    <input
                      type="checkbox"
                      checked={profileData.available247 || false}
                      onChange={(e) => {
                        const is247 = e.target.checked;
                        const updatedSchedule = {};
                        Object.keys(profileData.schedule).forEach(day => {
                          updatedSchedule[day] = {
                            available: !is247,
                            start: '10:00',
                            end: '22:00'
                          };
                        });
                        setProfileData({
                          ...profileData,
                          available247: is247,
                          schedule: updatedSchedule
                        });
                      }}
                      className="w-5 h-5 rounded border-[#dbdadd] bg-white checked:bg-[#C6A87C] checked:border-[#C6A87C]"
                    />
                    <span className="text-[#000000]">Available 24/7</span>
                  </label>

                  {/* Booking in advance Option */}
                  <label className="flex items-center gap-3 cursor-pointer py-1 border-b border-[#dbdadd]">
                    <input
                      type="checkbox"
                      checked={profileData.booking_advance || false}
                      onChange={(e) => setProfileData({
                        ...profileData,
                        booking_advance: e.target.checked
                      })}
                      className="w-5 h-5 rounded border-[#dbdadd] bg-white checked:bg-[#C6A87C] checked:border-[#C6A87C]"
                      data-testid="booking-advance-checkbox"
                    />
                    <span className="text-[#000000]">Booking in advance necessary</span>
                  </label>
                  </div>

                  <div className="space-y-4">
                    {Object.entries(profileData.schedule).map(([day, schedule]) => (
                      <div key={day} className="flex items-center gap-4 py-3 border-b border-[#dbdadd]">
                        <label className="flex items-center gap-3 cursor-pointer w-32">
                          <input
                            type="checkbox"
                            checked={schedule.available}
                            onChange={(e) => setProfileData({
                              ...profileData,
                              schedule: {
                                ...profileData.schedule,
                                [day]: { ...schedule, available: e.target.checked }
                              }
                            })}
                            className="w-5 h-5 rounded border-[#dbdadd] bg-white checked:bg-[#C6A87C] checked:border-[#C6A87C]"
                          />
                          <span className="text-[#000000] capitalize">{day}</span>
                        </label>
                        {schedule.available && (
                          <>
                            <input
                              type="time"
                              value={schedule.start}
                              onChange={(e) => setProfileData({
                                ...profileData,
                                schedule: {
                                  ...profileData.schedule,
                                  [day]: { ...schedule, start: e.target.value }
                                }
                              })}
                              className="input-premium px-3 py-2"
                            />
                            <span className="text-[#000000]">to</span>
                            <input
                              type="time"
                              value={schedule.end}
                              onChange={(e) => setProfileData({
                                ...profileData,
                                schedule: {
                                  ...profileData.schedule,
                                  [day]: { ...schedule, end: e.target.value }
                                }
                              })}
                              className="input-premium px-3 py-2"
                            />
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-[#dbdadd]"></div>

                {/* Rates */}
                <div id="rates-section" className="flex flex-col gap-4 scroll-mt-24">
                  <div>
                    <h3 className="text-2xl font-bold text-[#832161] mb-1">Rates</h3>
                  </div>

                  {/* Currency selector */}
                  <div>
                    <label className="input-label" htmlFor="rates-currency-select">Select currency</label>
                    <select
                      id="rates-currency-select"
                      value={profileData.rates?.currency || 'EUR'}
                      onChange={(e) => setProfileData({
                        ...profileData,
                        rates: { ...(profileData.rates || {}), currency: e.target.value }
                      })}
                      className="input-premium w-full md:w-72"
                      data-testid="rates-currency-select"
                    >
                      {CURRENCY_OPTIONS.map((opt) => (
                        <option key={opt.code} value={opt.code}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className={`grid grid-cols-1 gap-8 ${profileData.availability_type === 'both' ? 'md:grid-cols-2' : ''}`}>
                    {['incall', 'outcall']
                      .filter((kind) =>
                        profileData.availability_type === 'both' ||
                        profileData.availability_type === kind
                      )
                      .map((kind) => {
                      const col = profileData.rates?.[kind] || { '1hour':'', '2hours':'', '3hours':'', 'overnight':'', extras: [] };
                      const setCol = (next) => setProfileData({
                        ...profileData,
                        rates: { ...profileData.rates, [kind]: next }
                      });
                      const setKey = (key, value) => setCol({ ...col, [key]: value });
                      const setExtra = (idx, patch) => {
                        const extras = [...(col.extras || [])];
                        extras[idx] = { ...extras[idx], ...patch };
                        setCol({ ...col, extras });
                      };
                      const removeExtra = (idx) => {
                        const extras = (col.extras || []).filter((_, i) => i !== idx);
                        setCol({ ...col, extras });
                      };
                      const addExtra = () => {
                        const used = new Set([1, 2, 3, ...(col.extras || []).map((e) => Number(e.hours))]);
                        let next = 4;
                        while (used.has(next)) next += 1;
                        setCol({ ...col, extras: [...(col.extras || []), { hours: next, price: '' }] });
                      };

                      return (
                        <div key={kind} className="flex flex-col gap-4">
                          <h4 className="text-[#832161] uppercase tracking-[0.2em] text-sm">
 {kind === 'incall' ? 'Incall' : 'Outcall'}
 </h4>

                          {[
                            { key: '1hour',     label: '1 hour'    },
                            { key: '2hours',    label: '2 hours'   },
                            { key: '3hours',    label: '3 hours'   },
                            { key: 'overnight', label: 'Overnight' }
                          ].map(({ key, label }) => (
                            <div key={key}>
                              <label className="input-label">{label}</label>
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#000000] text-sm">{currencySymbol(profileData.rates?.currency)}</span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={col[key]}
                                  onChange={(e) => setKey(key, e.target.value.replace(/[^0-9]/g, ''))}
                                  className="input-premium w-full !pl-14"
                                  placeholder="0"
                                  data-testid={`rate-${kind}-${key}`}
                                />
                              </div>
                            </div>
                          ))}

                          {/* Custom extra hours */}
                          {(col.extras || []).map((extra, idx) => (
                            <div key={`extra-${idx}`} className="flex items-end gap-2">
                              <div className="w-20">
                                <label className="input-label">Hours</label>
                                <input
                                  type="number"
                                  min="4"
                                  max="48"
                                  value={extra.hours || ''}
                                  onChange={(e) => setExtra(idx, { hours: e.target.value.replace(/[^0-9]/g, '') })}
                                  className="input-premium w-full text-center"
                                  data-testid={`rate-${kind}-extra-hours-${idx}`}
                                />
                              </div>
                              <div className="flex-1">
                                <label className="input-label">Price</label>
                                <div className="relative">
                                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#000000] text-sm">{currencySymbol(profileData.rates?.currency)}</span>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={extra.price || ''}
                                    onChange={(e) => setExtra(idx, { price: e.target.value.replace(/[^0-9]/g, '') })}
                                    className="input-premium w-full !pl-14"
                                    placeholder="0"
                                    data-testid={`rate-${kind}-extra-price-${idx}`}
                                  />
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeExtra(idx)}
                                className="h-[50px] px-3 border border-[#dbdadd] text-[#000000] hover:border-red-500 hover:text-red-500 transition-colors"
                                data-testid={`rate-${kind}-extra-remove-${idx}`}
                                aria-label="Remove duration"
                              >
                                <Trash size={16} />
                              </button>
                            </div>
                          ))}

                          {/* Add hour CTA */}
                          <button
                            type="button"
                            onClick={addExtra}
                            className="w-full py-3 border border-dashed border-[#dbdadd] text-[#000000] hover:border-[#C6A87C] hover:text-[#DA4167] transition-colors flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
                            data-testid={`rate-${kind}-add-hour`}
                          >
                            <Plus size={16} />
                            Add hour
                          </button>

                          {/* Taxi not included — outcall only, checkbox reveals price input */}
                          {kind === 'outcall' && (
                            <div>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={col.taxiEnabled ?? (col.taxi !== '' && col.taxi !== undefined && col.taxi !== null)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setKey('taxiEnabled', true);
                                    } else {
                                      setKey('taxiEnabled', false);
                                      setKey('taxi', '');
                                    }
                                  }}
                                  className="w-5 h-5 rounded border-[#dbdadd] bg-white checked:bg-[#DA4167] checked:border-[#DA4167]"
                                  data-testid={`rate-${kind}-taxi-toggle`}
                                />
                                <span className="text-[#000000] text-sm">Taxi not included</span>
                              </label>
                              {(col.taxiEnabled ?? (col.taxi !== '' && col.taxi !== undefined && col.taxi !== null)) && (
                                <div className="relative mt-1">
                                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#000000] text-sm">{currencySymbol(profileData.rates?.currency)}</span>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={col.taxi ?? ''}
                                    onChange={(e) => setKey('taxi', e.target.value.replace(/[^0-9]/g, ''))}
                                    className="input-premium w-full !pl-14"
                                    placeholder="0"
                                    data-testid={`rate-${kind}-taxi`}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Rates */}
              </div>
            )}

            {/* Step 5: Activate (paid advertising) */}
            {currentStep === 5 && (
              <div className="space-y-8">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-[#832161] mb-3">Final step</p>
                  <h3 className="text-2xl text-[#832161] mb-2">Activate your profile</h3>
                  <p className="text-[#000000] text-sm max-w-xl">
                    Your profile is saved. A Featured listing makes you visible to clients on Browse. Add VIP Boost to appear at the top of every search.
                  </p>
                </div>

                {/* Featured */}
                <div className="card-premium p-6">
                  <div className="flex items-start gap-3 mb-5">
                    <Sparkle size={20} weight="fill" className="text-[#832161] mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="text-xl text-[#000000]">Featured listing</h4>
                      <p className="text-[#000000] text-sm">Required to be visible on Browse.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {FEATURED_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPlanFeatured(opt.id)}
                        className={`relative text-left p-5 border-2 transition-all ${
                          planFeatured === opt.id
                            ? 'border-[#832161] bg-[#832161]/5'
                            : 'border-[#dbdadd] hover:border-[#832161]'
                        }`}
                        data-testid={`featured-option-${opt.id}`}
                      >
                        {opt.badge && (
                          <span className="absolute top-3 right-3 text-[10px] uppercase tracking-wider px-2 py-1 bg-[#832161] text-[#FFFFFF] font-medium">
                            {opt.badge}
                          </span>
                        )}
                        <p className="text-[#000000] text-xs uppercase tracking-[0.2em] mb-2">{opt.label}</p>
                        <p className="text-3xl text-[#000000] mb-1">€{opt.price}</p>
                        <p className="text-[#000000] text-xs">{opt.perDay}</p>
                        {planFeatured === opt.id && (
                          <CheckCircle size={18} weight="fill" className="absolute bottom-3 right-3 text-[#832161]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* VIP Boost */}
                <div className="card-premium p-6">
                  <div className="flex items-start justify-between mb-5 gap-4">
                    <div className="flex items-start gap-3">
                      <Crown size={20} weight="fill" className="text-[#832161] mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="text-xl text-[#000000]">
 VIP Boost <span className="text-xs uppercase tracking-[0.2em] text-[#000000] ml-2">Optional</span>
 </h4>
                        <p className="text-[#000000] text-sm">Be displayed at the very top of Browse.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={planVipOn}
                      onClick={() => setPlanVipOn(!planVipOn)}
                      className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${
                        planVipOn ? 'bg-[#832161]' : 'bg-[#dbdadd]'
                      }`}
                      data-testid="vip-toggle"
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-[#FFFFFF] transition-transform ${
                          planVipOn ? 'translate-x-5' : ''
                        }`}
                      />
                    </button>
                  </div>
                  {/* VIP cards: always visible (prices shown upfront), dimmed when toggle is OFF */}
                  <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-opacity ${planVipOn ? 'opacity-100' : 'opacity-50'}`}>
                    {VIP_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          // First click selects + auto-enables VIP toggle; subsequent click just switches option
                          if (!planVipOn) setPlanVipOn(true);
                          setPlanVip(opt.id);
                        }}
                        className={`relative text-left p-4 border-2 transition-all ${
                          planVipOn && planVip === opt.id
                            ? 'border-[#832161] bg-[#832161]/5'
                            : 'border-[#dbdadd] hover:border-[#832161]'
                        }`}
                        data-testid={`vip-option-${opt.id}`}
                      >
                        {opt.badge && (
                          <span className="absolute top-3 right-3 text-[10px] uppercase tracking-wider px-2 py-1 bg-[#832161] text-[#FFFFFF] font-medium">
                            {opt.badge}
                          </span>
                        )}
                        <p className="text-[#000000] text-xs uppercase tracking-[0.2em] mb-2">{opt.label}</p>
                        <p className="text-2xl text-[#000000]">€{opt.price}</p>
                        {planVipOn && planVip === opt.id && (
                          <CheckCircle size={16} weight="fill" className="absolute bottom-3 right-3 text-[#832161]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Auto-renew */}
                <div className="card-premium p-6 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h4 className="text-lg text-[#000000] mb-1">Auto-renew</h4>
                    <p className="text-[#000000] text-sm">
                      Automatically renew your plan when it expires. Cancel any time from your dashboard.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoRenew}
                    onClick={() => setAutoRenew(!autoRenew)}
                    className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${
                      autoRenew ? 'bg-[#832161]' : 'bg-[#dbdadd]'
                    }`}
                    data-testid="auto-renew-toggle"
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-[#FFFFFF] transition-transform ${
                        autoRenew ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>

                {/* Total */}
                <div className="card-premium p-6 flex items-end justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-[#000000] text-xs uppercase tracking-[0.2em] mb-1">Total today</p>
                    <p className="text-4xl text-[#000000]" data-testid="total-amount">€{planTotal}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[#000000] text-xs">
                      {autoRenew ? `Then €${planTotal} per period until cancelled` : 'One-time payment'}
                    </p>
                    <p className="text-[#000000] text-xs">Visa, Mastercard, Apple Pay, PayPal & more</p>
                  </div>
                </div>
              </div>
            )}
            <div className={`flex ${mode !== 'edit' && currentStep === 1 ? 'justify-end' : 'justify-between'} mt-8 pt-6 border-t border-[#dbdadd]`}>
              {mode === 'edit' ? (
                <>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="btn-secondary flex items-center gap-2"
                    data-testid="cancel-edit-button"
                  >
                    <CaretLeft size={20} />
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveStep}
                    disabled={saving}
                    className="btn-primary flex items-center gap-2 disabled:opacity-50"
                    data-testid="save-step-button"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              ) : (
                <>
                  {currentStep > 1 && (
                    <button
                      type="button"
                      onClick={prevStep}
                      className="btn-secondary flex items-center gap-2"
                      data-testid="prev-button"
                    >
                      <CaretLeft size={20} />
                      Previous
                    </button>
                  )}

                  {currentStep < 4 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      className="btn-primary flex items-center gap-2"
                      data-testid="next-button"
                    >
                      Next
                      <CaretRight size={20} />
                    </button>
                  ) : currentStep === 4 ? (
                    <button
                      type="button"
                      onClick={async () => {
                        await handleCreateProfile();
                        setCurrentStep(5);
                      }}
                      className="btn-primary flex items-center gap-2"
                      data-testid="save-and-continue-button"
                    >
                      Save & continue
                      <CaretRight size={20} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePayAndActivate}
                      disabled={payRedirecting}
                      className="btn-primary flex items-center gap-2 disabled:opacity-50"
                      data-testid="pay-and-activate-button"
                    >
                      {payRedirecting ? 'Redirecting…' : (
                        <>Pay €{planTotal} & activate <ArrowRight size={18} /></>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>
      <VerificationModal
        open={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        onSubmitted={fetchDashboard}
      />
    </div>
  );
}
