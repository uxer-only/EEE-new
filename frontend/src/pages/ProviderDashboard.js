import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getProviderDashboard, createProviderProfile, updateProviderProfile, getMySubscription, createSubscriptionCheckout } from '@/services/api';
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

export default function ProviderDashboard() {
  const { user, logout } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [mode, setMode] = useState('overview'); // 'overview' | 'edit' | 'create'
  const [saving, setSaving] = useState(false);
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
    } catch {
      // ignore — banner just won't render
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

  const openEdit = (step) => {
    setCurrentStep(step);
    setMode('edit');
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
      <div className="min-h-screen bg-[#0A0A0C] flex items-center justify-center">
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
      <div className="min-h-screen bg-[#0A0A0C]">
        <SiteHeader
          links={[
            { to: '/messages', label: 'Messages', testId: 'messages-link' },
            { label: 'Logout', onClick: logout, testId: 'logout-btn' }
          ]}
        />

        <div className="pt-32 pb-20 section-padding">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12" data-testid="manage-header">
              <div>
                <p className="text-[#A1A1AA] text-xs uppercase tracking-[0.2em] mb-3">Manage Profile</p>
                <h2 className="text-4xl md:text-5xl text-[#F2F0ED] mb-3">Welcome, {p.display_name}</h2>
                <div className="flex items-center gap-4">
                  {p.verified ? (
                    <div className="verified-badge" data-testid="verified-badge"><CheckCircle size={16} weight="fill" />Verified Provider</div>
                  ) : (
                    <div className="status-badge status-pending">Verification {p.verification_status}</div>
                  )}
                  <span className="text-[#71717A] text-sm">·</span>
                  <span className="text-[#A1A1AA] text-sm">{p.location?.city}, {p.location?.country}</span>
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
                        <p className="text-[#F2F0ED] font-medium mb-1">Activate your profile</p>
                        <p className="text-[#A1A1AA] text-sm">
                          Choose a Featured plan to appear on Browse. Add VIP Boost to be displayed at the top of every search.
                        </p>
                      </div>
                    </div>
                    <Link to="/subscribe" className="btn-primary whitespace-nowrap" data-testid="activate-cta">
                      Choose a plan
                    </Link>
                  </div>
                ) : (
                  <div className="rounded-lg border border-[#27272A] bg-[#141416] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {subscription.vip_active ? (
                        <Crown size={22} weight="fill" className="text-[#C6A87C] mt-0.5 shrink-0" />
                      ) : (
                        <CheckCircle size={22} weight="fill" className="text-[#22C55E] mt-0.5 shrink-0" />
                      )}
                      <div>
                        <p className="text-[#F2F0ED] font-medium mb-1">
                          {subscription.vip_active ? 'VIP Featured · live' : 'Featured · live'}
                        </p>
                        <p className="text-[#A1A1AA] text-sm">
                          Your profile expires in <span className="text-[#F2F0ED] font-medium">{Math.ceil(subscription.featured_days_left)} day{Math.ceil(subscription.featured_days_left) === 1 ? '' : 's'}</span>
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
                      <p className="text-[#F2F0ED] font-medium mb-1">Profile verified</p>
                      <p className="text-[#A1A1AA] text-sm">Your profile is live and appears in client search results with the Verified badge.</p>
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
                      <p className="text-[#F2F0ED] font-medium mb-1">Verification under review</p>
                      <p className="text-[#A1A1AA] text-sm">We're reviewing your documents — you'll receive an email within 24 hours. Your profile becomes visible to clients once approved.</p>
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
                        <p className="text-[#F2F0ED] font-medium mb-1">Verification needs attention</p>
                        {p.rejection_reason && (
                          <p className="text-[#A1A1AA] text-sm mb-3"><span className="text-[#F2F0ED]">Reason:</span> {p.rejection_reason}</p>
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
                      <p className="text-[#F2F0ED] font-medium mb-1">Unlock the Verified badge</p>
                      <p className="text-[#A1A1AA] text-sm mb-4 leading-relaxed">
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

            {/* 5 Management Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. Basic Info */}
              <div className="card-premium p-8" data-testid="card-basic-info">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-[#C6A87C] flex items-center justify-center">
                      <User size={18} className="text-[#C6A87C]" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[#A1A1AA]">Step 1</p>
                      <h3 className="text-xl text-[#F2F0ED]">Basic Info</h3>
                    </div>
                  </div>
                  <button
                    onClick={() => openEdit(1)}
                    className="text-[#C6A87C] hover:text-[#D4B88C] uppercase tracking-wider text-xs"
                    data-testid="edit-basic-info-btn"
                  >
                    Edit
                  </button>
                </div>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-[#A1A1AA]">Display name</dt>
                    <dd className="text-[#F2F0ED] text-right">{p.display_name || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[#A1A1AA]">Age</dt>
                    <dd className="text-[#F2F0ED]">{p.age || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[#A1A1AA]">Gender</dt>
                    <dd className="text-[#F2F0ED] capitalize">{p.gender || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[#A1A1AA]">Location</dt>
                    <dd className="text-[#F2F0ED] text-right">{p.location?.city ? `${p.location.city}, ${p.location.country}` : '—'}</dd>
                  </div>
                  <div className="pt-2 border-t border-[#27272A]">
                    <dt className="text-[#A1A1AA] mb-2">Bio</dt>
                    <dd className="text-[#F2F0ED] line-clamp-3 leading-relaxed">{p.bio || <span className="text-[#6B7280] italic">Not set</span>}</dd>
                  </div>
                </dl>
              </div>

              {/* 2. Photos & Videos */}
              <div className="card-premium p-8" data-testid="card-photos">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-[#C6A87C] flex items-center justify-center">
                      <Camera size={18} className="text-[#C6A87C]" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[#A1A1AA]">Step 2</p>
                      <h3 className="text-xl text-[#F2F0ED]">Photos & Video's</h3>
                    </div>
                  </div>
                  <button
                    onClick={() => openEdit(2)}
                    className="text-[#C6A87C] hover:text-[#D4B88C] uppercase tracking-wider text-xs"
                    data-testid="edit-photos-btn"
                  >
                    Edit
                  </button>
                </div>
                {p.photos && p.photos.length > 0 ? (
                  <>
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {p.photos.slice(0, 8).map((photo, i) => (
                        <div key={i} className="aspect-[3/4] overflow-hidden rounded">
                          <img src={photo} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                    <p className="text-[#A1A1AA] text-sm">{p.photos.length} media uploaded</p>
                  </>
                ) : (
                  <div className="h-32 flex items-center justify-center border border-dashed border-[#52525B] rounded">
                    <p className="text-[#6B7280] text-sm italic">No photos yet</p>
                  </div>
                )}
              </div>

              {/* 3. Services */}
              <div className="card-premium p-8" data-testid="card-services">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-[#C6A87C] flex items-center justify-center">
                      <FileText size={18} className="text-[#C6A87C]" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[#A1A1AA]">Step 3</p>
                      <h3 className="text-xl text-[#F2F0ED]">Services</h3>
                    </div>
                  </div>
                  <button
                    onClick={() => openEdit(3)}
                    className="text-[#C6A87C] hover:text-[#D4B88C] uppercase tracking-wider text-xs"
                    data-testid="edit-services-btn"
                  >
                    Edit
                  </button>
                </div>
                {legacyServices.length === 0 && inclusiveServices.length === 0 && extraServices.length === 0 ? (
                  <p className="text-[#6B7280] text-sm italic">No services set</p>
                ) : (
                  <div className="space-y-4">
                    {/* Prefer new-schema (dict) rendering; fall back to legacy list only if dict is empty */}
                    {inclusiveServices.length === 0 && extraServices.length === 0 && legacyServices.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#A1A1AA] mb-2">Offered</p>
                        <div className="flex flex-wrap gap-2">
                          {legacyServices.map((s) => (
                            <span key={s} className="px-3 py-1 text-xs border border-[#52525B] text-[#F2F0ED] rounded-full">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {inclusiveServices.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#A1A1AA] mb-2">Inclusive ({inclusiveServices.length})</p>
                        <div className="flex flex-wrap gap-2">
                          {inclusiveServices.slice(0, 8).map(([name]) => (
                            <span key={name} className="px-3 py-1 text-xs border border-[#52525B] text-[#F2F0ED] rounded-full">{name}</span>
                          ))}
                          {inclusiveServices.length > 8 && <span className="px-3 py-1 text-xs text-[#A1A1AA]">+{inclusiveServices.length - 8} more</span>}
                        </div>
                      </div>
                    )}
                    {extraServices.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#A1A1AA] mb-2">Extra ({extraServices.length})</p>
                        <div className="flex flex-wrap gap-2">
                          {extraServices.slice(0, 6).map(([name, v]) => (
                            <span key={name} className="px-3 py-1 text-xs border border-[#C6A87C]/40 bg-[#C6A87C]/10 text-[#C6A87C] rounded-full">
                              {name} {v.price && `· €${v.price}`}
                            </span>
                          ))}
                          {extraServices.length > 6 && <span className="px-3 py-1 text-xs text-[#A1A1AA]">+{extraServices.length - 6} more</span>}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 4. Rates */}
              <div className="card-premium p-8" data-testid="card-rates">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-[#C6A87C] flex items-center justify-center">
                      <CurrencyDollar size={18} className="text-[#C6A87C]" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[#A1A1AA]">Step 4</p>
                      <h3 className="text-xl text-[#F2F0ED]">Rates</h3>
                    </div>
                  </div>
                  <button
                    onClick={() => openEdit(4)}
                    className="text-[#C6A87C] hover:text-[#D4B88C] uppercase tracking-wider text-xs"
                    data-testid="edit-rates-btn"
                  >
                    Edit
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {['incall', 'outcall'].map((kind) => (
                    <div key={kind}>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[#C6A87C] mb-3">{kind}</p>
                      <div className="space-y-2">
                        {[
                          { key: '1hour', label: '1 hour' },
                          { key: '2hours', label: '2 hours' },
                          { key: '3hours', label: '3 hours' },
                          { key: 'overnight', label: 'Overnight' }
                        ].map(({ key, label }) => {
                          const v = profileData.rates?.[kind]?.[key];
                          return (
                            <div key={key} className="flex items-center justify-between border-b border-[#27272A] pb-2">
                              <span className="text-[#A1A1AA] text-sm">{label}</span>
                              <span className="text-[#C6A87C]">
                                {v ? `€${v}` : <span className="text-[#6B7280] text-sm italic">Not set</span>}
                              </span>
                            </div>
                          );
                        })}
                        {(profileData.rates?.[kind]?.extras || []).map((extra, i) => (
                          <div key={`extra-${i}`} className="flex items-center justify-between border-b border-[#27272A] pb-2">
                            <span className="text-[#A1A1AA] text-sm">{extra.hours} hours</span>
                            <span className="text-[#C6A87C]">
                              {extra.price ? `€${extra.price}` : <span className="text-[#6B7280] text-sm italic">Not set</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. Availability */}
              <div className="card-premium p-8 md:col-span-2" data-testid="card-availability">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-[#C6A87C] flex items-center justify-center">
                      <Clock size={18} className="text-[#C6A87C]" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[#A1A1AA]">Step 4</p>
                      <h3 className="text-xl text-[#F2F0ED]">Availability</h3>
                      <p className="text-[#A1A1AA] text-xs mt-1">{availableDays} of 7 days available</p>
                    </div>
                  </div>
                  <button
                    onClick={() => openEdit(4)}
                    className="text-[#C6A87C] hover:text-[#D4B88C] uppercase tracking-wider text-xs"
                    data-testid="edit-availability-btn"
                  >
                    Edit
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
                  {scheduleDays.map(([day, sched]) => (
                    <div
                      key={day}
                      className={`border p-3 text-center transition-colors ${
                        sched?.available ? 'border-[#C6A87C]/40 bg-[#C6A87C]/5' : 'border-[#27272A] opacity-50'
                      }`}
                    >
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[#A1A1AA] mb-2">{dayLabels[day] || day.slice(0, 3)}</p>
                      {sched?.available ? (
                        <>
                          <p className="text-[#F2F0ED] text-sm">{sched.start}</p>
                          <p className="text-[#A1A1AA] text-xs">to</p>
                          <p className="text-[#F2F0ED] text-sm">{sched.end}</p>
                        </>
                      ) : (
                        <p className="text-[#6B7280] text-xs italic">Closed</p>
                      )}
                    </div>
                  ))}
                </div>
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
    <div className="min-h-screen bg-[#0A0A0C]">
      {/* Header */}
      <SiteHeader
        leftSlot={
          mode === 'edit' ? (
            <button
              onClick={cancelEdit}
              className="flex items-center gap-2 text-[#A1A1AA] hover:text-[#C6A87C] transition-colors"
              data-testid="back-to-overview-btn"
            >
              <CaretLeft size={18} />
              <span className="uppercase tracking-wider text-xs md:text-sm">Back to Overview</span>
            </button>
          ) : null
        }
        links={[
          { to: '/messages', label: 'Messages', testId: 'messages-link' },
          { label: 'Logout', onClick: logout, testId: 'logout-btn' }
        ]}
      />

      <div className="pt-32 pb-20 section-padding">
        <div className="max-w-4xl mx-auto">
          {/* Page Title */}
          <div className="text-center mb-12">
            <h2 className="text-4xl text-[#F2F0ED] mb-4">
 {mode === 'edit' ? `Edit ${steps[currentStep - 1]?.title}` : 'Complete Your Profile'}
 </h2>
            <p className="text-[#A1A1AA]">
              {mode === 'edit' ? 'Update this section of your profile' : 'Set up your provider profile to start receiving enquiries'}
            </p>
          </div>

          {/* Progress Steps - only for creation flow */}
          {mode !== 'edit' && (
          <div className="flex items-center justify-between mb-12 px-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex flex-col items-center gap-2 transition-all ${
                    currentStep === step.id 
                      ? 'text-[#C6A87C]' 
                      : currentStep > step.id 
                        ? 'text-green-500' 
                        : 'text-[#9CA3AF]'
                  }`}
                  data-testid={`step-${step.id}`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                    currentStep === step.id 
                      ? 'border-[#C6A87C] bg-[#C6A87C]/10' 
                      : currentStep > step.id 
                        ? 'border-green-500 bg-green-500/10' 
                        : 'border-[#52525B]'
                  }`}>
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
                    currentStep > step.id ? 'bg-green-500' : 'bg-[#52525B]'
                  }`} />
                )}
              </div>
            ))}
          </div>
          )}

          {/* Step Content */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="card-premium p-8"
          >
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-8">
                {/* Box 1: Basic Information */}
                <div className="border border-[#27272A] rounded-lg p-6">
                  <h3 className="text-2xl text-[#C6A87C] mb-6">Basic Information</h3>
                  
                  <div className="space-y-6">
                    {/* Account Type */}
                    <div>
                      <label className="input-label">I am</label>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => setProfileData({ ...profileData, account_type: 'independent' })}
                          className={`py-3 px-6 border transition-all ${
                            profileData.account_type === 'independent'
                              ? 'border-[#C6A87C] bg-[#C6A87C]/10 text-[#C6A87C]'
                              : 'border-[#3F3F46] text-[#A1A1AA] hover:border-[#C6A87C]'
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
                              ? 'border-[#C6A87C] bg-[#C6A87C]/10 text-[#C6A87C]'
                              : 'border-[#3F3F46] text-[#A1A1AA] hover:border-[#C6A87C]'
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
                  <div className="mt-8 pt-8 border-t border-[#27272A]">
                    <label className="input-label">Describe yourself</label>
                    <textarea
                      value={profileData.bio}
                      onChange={(e) => setProfileData({ ...profileData, bio: e.target.value.slice(0, 500) })}
                      className="input-premium w-full h-32 resize-none"
                      placeholder="Share what makes you unique. This will be displayed in 'My Essence' on your profile..."
                      maxLength={500}
                      data-testid="essence-input"
                    />
                    <div className="flex justify-between mt-2">
                      <p className="input-helper">This will be displayed in "My Essence" on your profile</p>
                      <span className="text-xs text-[#9CA3AF]">{(profileData.bio || '').length}/500</span>
                    </div>
                  </div>

                  {/* Languages */}
                  <div className="mt-8 pt-8 border-t border-[#27272A]">
                    <div className="flex items-end justify-between mb-3">
                      <label className="input-label !mb-0">Languages</label>
                      <span className="text-xs text-[#71717A]">
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
                                      ? 'border-[#C6A87C] bg-[#C6A87C]/10 text-[#C6A87C]'
                                      : 'border-[#3F3F46] text-[#A1A1AA] hover:border-[#C6A87C]'
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
                                className="relative py-2.5 pl-3 pr-8 border border-[#C6A87C] bg-[#C6A87C]/10 text-[#C6A87C] text-sm uppercase tracking-wider flex items-center"
                                data-testid={`basic-lang-custom-${lang.toLowerCase()}`}
                              >
                                <span className="truncate">{lang}</span>
                                <button
                                  type="button"
                                  onClick={() => toggle(lang)}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#C6A87C] hover:text-red-400 transition-colors"
                                  aria-label={`Remove ${lang}`}
                                  data-testid={`basic-lang-remove-${lang.toLowerCase()}`}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>

                          {/* Add language */}
                          <div className="mt-4 flex items-center gap-2">
                            <input
                              type="text"
                              value={newLanguage}
                              onChange={(e) => setNewLanguage(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addCustom();
                                }
                              }}
                              placeholder="e.g. Italian"
                              className="input-premium flex-1"
                              data-testid="add-language-input"
                            />
                            <button
                              type="button"
                              onClick={addCustom}
                              disabled={!newLanguage.trim()}
                              className="px-4 py-3 border border-[#3F3F46] text-[#A1A1AA] hover:border-[#C6A87C] hover:text-[#C6A87C] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm uppercase tracking-wider flex items-center gap-2 whitespace-nowrap"
                              data-testid="add-language-button"
                            >
                              <Plus size={16} /> Add language
                            </button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Box 2: Contact Information */}
                <div className="border border-[#27272A] rounded-lg p-6">
                  <h3 className="text-2xl text-[#C6A87C] mb-6">Contact information</h3>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="input-label">Mobile phone</label>
                        <input
                          type="tel"
                          value={profileData.contact.phone}
                          onChange={(e) => setProfileData({ ...profileData, contact: { ...profileData.contact, phone: e.target.value } })}
                          className="input-premium w-full"
                          placeholder="+32 XXX XX XX XX"
                          data-testid="phone-input"
                        />
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
                            className="w-5 h-5 rounded border-[#52525B] bg-transparent checked:bg-[#25D366] checked:border-[#25D366]"
                          />
                          <span className="text-[#A1A1AA]">WhatsApp</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={profileData.contact.hasTelegram || false}
                            onChange={(e) => setProfileData({
                              ...profileData,
                              contact: { ...profileData.contact, hasTelegram: e.target.checked }
                            })}
                            className="w-5 h-5 rounded border-[#52525B] bg-transparent checked:bg-[#0088cc] checked:border-[#0088cc]"
                          />
                          <span className="text-[#A1A1AA]">Telegram</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={profileData.contact.hasSignal || false}
                            onChange={(e) => setProfileData({
                              ...profileData,
                              contact: { ...profileData.contact, hasSignal: e.target.checked }
                            })}
                            className="w-5 h-5 rounded border-[#52525B] bg-transparent checked:bg-[#3A76F0] checked:border-[#3A76F0]"
                          />
                          <span className="text-[#A1A1AA]">Signal</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Box 2: Physical Characteristics (optional) */}
                <div className="border border-[#27272A] rounded-lg p-6">
                  <h3 className="text-2xl text-[#C6A87C] mb-1">Physical Characteristics</h3>
                  <p className="text-[#71717A] text-sm mb-6">All fields are optional — fill what you want shown on your profile.</p>

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
                <h3 className="text-2xl text-[#C6A87C] mb-6">Photos & Video's</h3>
                <p className="text-[#A1A1AA] text-sm mb-6">Add photos and videos to your profile. Media will be reviewed before being published.</p>

                {/* Upload Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-12 text-center transition-all cursor-pointer ${
                    isDragging 
                      ? 'border-[#C6A87C] bg-[#C6A87C]/5' 
                      : 'border-[#52525B] hover:border-[#C6A87C]'
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
                  <UploadSimple size={48} className={`mx-auto mb-4 transition-colors ${isDragging ? 'text-[#C6A87C]' : 'text-[#9CA3AF]'}`} />
                  <p className="text-[#F2F0ED] text-lg mb-2">
                    {isDragging ? 'Drop files here' : 'Drag & drop your files here'}
                  </p>
                  <p className="text-[#9CA3AF] text-sm mb-4">or click to browse</p>
                  <p className="text-[#6B7280] text-xs">
                    Supported formats: JPG, PNG, WebP, MP4 • Max 10MB per file
                  </p>
                </div>

                {/* Existing photos from profile */}
                {profileData.photos && profileData.photos.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[#F2F0ED] font-medium">Current media ({profileData.photos.length})</h4>
                      <p className="text-[#71717A] text-xs">Drag to reorder · the first photo is your cover</p>
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
                          <div className="absolute top-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-[#F2F0ED] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
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
                      <h4 className="text-[#F2F0ED] font-medium">{uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} selected</h4>
                      <button
                        type="button"
                        onClick={() => setUploadedFiles([])}
                        className="text-[#9CA3AF] hover:text-red-500 text-sm transition-colors"
                      >
                        Remove all
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      {uploadedFiles.map((file) => (
                        <div key={file.id} className="relative group aspect-[3/4]">
                          {file.type === 'video' ? (
                            <div className="w-full h-full bg-[#1F1F23] rounded flex items-center justify-center">
                              <VideoCamera size={32} className="text-[#9CA3AF]" />
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

                <p className="text-[#9CA3AF] text-sm">
                  Tip: Use high-quality photos that show your personality. Avoid filters and ensure good lighting.
                </p>
              </div>
            )}

            {/* Step 3: Services */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h3 className="text-2xl text-[#C6A87C] mb-6">Services</h3>
                
                {/* Type of Companionship */}
                <div className="mb-8">
                  <label className="input-label mb-4">Type of companionship</label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setProfileData({ ...profileData, companionshipType: 'escort' })}
                      className={`px-6 py-3 border text-sm transition-all ${
                        profileData.companionshipType === 'escort'
                          ? 'border-[#C6A87C] bg-[#C6A87C]/20 text-[#C6A87C]'
                          : 'border-[#52525B] text-[#9CA3AF] hover:border-[#C6A87C]'
                      }`}
                    >
                      Escort
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfileData({ ...profileData, companionshipType: 'erotic-massage' })}
                      className={`px-6 py-3 border text-sm transition-all ${
                        profileData.companionshipType === 'erotic-massage'
                          ? 'border-[#C6A87C] bg-[#C6A87C]/20 text-[#C6A87C]'
                          : 'border-[#52525B] text-[#9CA3AF] hover:border-[#C6A87C]'
                      }`}
                    >
                      Erotic Massage
                    </button>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-[#52525B] my-4"></div>
                
                <p className="text-[#A1A1AA] text-sm mb-4">Select the services you offer and specify if they are inclusive or at an extra cost</p>
                
                {/* Services Table */}
                <div className="border border-[#27272A] rounded-lg overflow-hidden">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-[#1F1F23] border-b border-[#27272A]">
                    <div className="col-span-5 text-[#A1A1AA] text-sm font-medium">Service</div>
                    <div className="col-span-3 text-[#A1A1AA] text-sm font-medium">Type</div>
                    <div className="col-span-4 text-[#A1A1AA] text-sm font-medium text-right">Price</div>
                  </div>
                  
                  {/* Table Body */}
                  <div>
                    {serviceOptions.map((service, index) => {
                      const serviceData = profileData.services[service] || { type: null, price: '' };
                      return (
                        <div 
                          key={service} 
                          className={`grid grid-cols-12 gap-4 px-4 py-3 items-center ${
                            index !== serviceOptions.length - 1 ? 'border-b border-[#27272A]' : ''
                          } ${serviceData.type ? 'bg-[#C6A87C]/5' : ''}`}
                        >
                          {/* Service Name */}
                          <div className="col-span-5 text-[#F2F0ED] text-sm">{service}</div>
                          
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
                                  ? 'border-[#C6A87C] bg-[#C6A87C]/20 text-[#C6A87C]'
                                  : 'border-[#52525B] text-[#9CA3AF] hover:border-[#C6A87C]'
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
                                  ? 'border-[#C6A87C] bg-[#C6A87C]/20 text-[#C6A87C]'
                                  : 'border-[#52525B] text-[#9CA3AF] hover:border-[#C6A87C]'
                              }`}
                            >
                              Extra
                            </button>
                          </div>
                          
                          {/* Price Field */}
                          <div className="col-span-4 flex justify-end">
                            {serviceData.type === 'extra' ? (
                              <div className="relative w-24">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#9CA3AF] text-sm">€</span>
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
                              <span className="text-[#52525B] text-sm">-</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Add Custom Service */}
                <div className="mt-6 p-4 border border-[#27272A] rounded-lg">
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
                  <div className="mt-4 p-4 border border-[#27272A] rounded">
                    <p className="text-[#A1A1AA] text-sm mb-2">
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
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl text-[#C6A87C] mb-1">Availability</h3>
                    <p className="text-[#A1A1AA] text-sm">Set your availability for each day</p>
                  </div>

                  {/* Service type: Incall / Outcall / Both */}
                  <div>
                    <label className="input-label">I offer</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: 'incall',  label: 'Incall only' },
                        { value: 'outcall', label: 'Outcall only' },
                        { value: 'both',    label: 'Incall & outcall' }
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setProfileData({ ...profileData, availability_type: opt.value })}
                          className={`py-3 px-4 border text-sm uppercase tracking-wider transition-all ${
                            profileData.availability_type === opt.value
                              ? 'border-[#C6A87C] bg-[#C6A87C]/10 text-[#C6A87C]'
                              : 'border-[#3F3F46] text-[#A1A1AA] hover:border-[#C6A87C]'
                          }`}
                          data-testid={`availability-type-${opt.value}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 24/7 Option */}
                  <label className="flex items-center gap-3 cursor-pointer py-3 border-b border-[#52525B]">
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
                      className="w-5 h-5 rounded border-[#52525B] bg-transparent checked:bg-[#C6A87C] checked:border-[#C6A87C]"
                    />
                    <span className="text-[#F2F0ED]">Available 24/7</span>
                  </label>

                  <div className="space-y-4">
                    {Object.entries(profileData.schedule).map(([day, schedule]) => (
                      <div key={day} className="flex items-center gap-4 py-3 border-b border-[#27272A]">
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
                            className="w-5 h-5 rounded border-[#52525B] bg-transparent checked:bg-[#C6A87C] checked:border-[#C6A87C]"
                          />
                          <span className="text-[#F2F0ED] capitalize">{day}</span>
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
                            <span className="text-[#A1A1AA]">to</span>
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
                <div className="border-t border-[#27272A]"></div>

                {/* Rates */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl text-[#C6A87C] mb-1">Rates</h3>
                    <p className="text-[#A1A1AA] text-sm">
                      Set your pricing for different durations.{' '}
                      {profileData.availability_type === 'incall'
                        ? 'Fill out the Incall column only.'
                        : profileData.availability_type === 'outcall'
                          ? 'Fill out the Outcall column only.'
                          : 'Incall = client visits you. Outcall = you visit the client.'}
                    </p>
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
                        <div key={kind} className="space-y-8">
                          <h4 className="text-lg text-[#C6A87C] uppercase tracking-[0.2em] text-sm border-b border-[#27272A] pb-3">
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
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]">€</span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={col[key]}
                                  onChange={(e) => setKey(key, e.target.value.replace(/[^0-9]/g, ''))}
                                  className="input-premium w-full !pl-10"
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
                                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]">€</span>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={extra.price || ''}
                                    onChange={(e) => setExtra(idx, { price: e.target.value.replace(/[^0-9]/g, '') })}
                                    className="input-premium w-full !pl-10"
                                    placeholder="0"
                                    data-testid={`rate-${kind}-extra-price-${idx}`}
                                  />
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeExtra(idx)}
                                className="h-[50px] px-3 border border-[#3F3F46] text-[#A1A1AA] hover:border-red-500 hover:text-red-500 transition-colors"
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
                            className="w-full py-3 border border-dashed border-[#3F3F46] text-[#A1A1AA] hover:border-[#C6A87C] hover:text-[#C6A87C] transition-colors flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
                            data-testid={`rate-${kind}-add-hour`}
                          >
                            <Plus size={16} />
                            Add hour
                          </button>
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
                  <p className="text-[10px] uppercase tracking-[0.3em] text-[#C6A87C] mb-3">Final step</p>
                  <h3 className="text-2xl text-[#C6A87C] mb-2">Activate your profile</h3>
                  <p className="text-[#A1A1AA] text-sm max-w-xl">
                    Your profile is saved. A Featured listing makes you visible to clients on Browse. Add VIP Boost to appear at the top of every search.
                  </p>
                </div>

                {/* Featured */}
                <div className="card-premium p-6">
                  <div className="flex items-start gap-3 mb-5">
                    <Sparkle size={20} weight="fill" className="text-[#C6A87C] mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="text-xl text-[#F2F0ED]">Featured listing</h4>
                      <p className="text-[#A1A1AA] text-sm">Required to be visible on Browse.</p>
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
                            ? 'border-[#C6A87C] bg-[#C6A87C]/5'
                            : 'border-[#27272A] hover:border-[#3F3F46]'
                        }`}
                        data-testid={`featured-option-${opt.id}`}
                      >
                        {opt.badge && (
                          <span className="absolute top-3 right-3 text-[10px] uppercase tracking-wider px-2 py-1 bg-[#C6A87C] text-[#0A0A0C] font-medium">
                            {opt.badge}
                          </span>
                        )}
                        <p className="text-[#A1A1AA] text-xs uppercase tracking-[0.2em] mb-2">{opt.label}</p>
                        <p className="text-3xl text-[#F2F0ED] mb-1">€{opt.price}</p>
                        <p className="text-[#71717A] text-xs">{opt.perDay}</p>
                        {planFeatured === opt.id && (
                          <CheckCircle size={18} weight="fill" className="absolute bottom-3 right-3 text-[#C6A87C]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* VIP Boost */}
                <div className="card-premium p-6">
                  <div className="flex items-start justify-between mb-5 gap-4">
                    <div className="flex items-start gap-3">
                      <Crown size={20} weight="fill" className="text-[#C6A87C] mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="text-xl text-[#F2F0ED]">
 VIP Boost <span className="text-xs uppercase tracking-[0.2em] text-[#71717A] ml-2">Optional</span>
 </h4>
                        <p className="text-[#A1A1AA] text-sm">Be displayed at the very top of Browse.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={planVipOn}
                      onClick={() => setPlanVipOn(!planVipOn)}
                      className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${
                        planVipOn ? 'bg-[#C6A87C]' : 'bg-[#27272A]'
                      }`}
                      data-testid="vip-toggle"
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-[#F2F0ED] transition-transform ${
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
                            ? 'border-[#C6A87C] bg-[#C6A87C]/5'
                            : 'border-[#27272A] hover:border-[#3F3F46]'
                        }`}
                        data-testid={`vip-option-${opt.id}`}
                      >
                        {opt.badge && (
                          <span className="absolute top-3 right-3 text-[10px] uppercase tracking-wider px-2 py-1 bg-[#C6A87C] text-[#0A0A0C] font-medium">
                            {opt.badge}
                          </span>
                        )}
                        <p className="text-[#A1A1AA] text-xs uppercase tracking-[0.2em] mb-2">{opt.label}</p>
                        <p className="text-2xl text-[#F2F0ED]">€{opt.price}</p>
                        {planVipOn && planVip === opt.id && (
                          <CheckCircle size={16} weight="fill" className="absolute bottom-3 right-3 text-[#C6A87C]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Auto-renew */}
                <div className="card-premium p-6 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h4 className="text-lg text-[#F2F0ED] mb-1">Auto-renew</h4>
                    <p className="text-[#A1A1AA] text-sm">
                      Automatically renew your plan when it expires. Cancel any time from your dashboard.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoRenew}
                    onClick={() => setAutoRenew(!autoRenew)}
                    className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${
                      autoRenew ? 'bg-[#C6A87C]' : 'bg-[#27272A]'
                    }`}
                    data-testid="auto-renew-toggle"
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-[#F2F0ED] transition-transform ${
                        autoRenew ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>

                {/* Total */}
                <div className="card-premium p-6 flex items-end justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-[#A1A1AA] text-xs uppercase tracking-[0.2em] mb-1">Total today</p>
                    <p className="text-4xl text-[#F2F0ED]" data-testid="total-amount">€{planTotal}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[#71717A] text-xs">
                      {autoRenew ? `Then €${planTotal} per period until cancelled` : 'One-time payment'}
                    </p>
                    <p className="text-[#71717A] text-xs">Visa, Mastercard, Apple Pay, PayPal & more</p>
                  </div>
                </div>
              </div>
            )}
            <div className="flex justify-between mt-8 pt-6 border-t border-[#27272A]">
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
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                    className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="prev-button"
                  >
                    <CaretLeft size={20} />
                    Previous
                  </button>

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
