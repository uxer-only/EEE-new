import { useState, useEffect, Fragment } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getProviderDashboard, createProviderProfile, updateProviderProfile, deleteProviderProfile, getMySubscription, createSubscriptionCheckout, updateAutoRenew, listMyEnquiries, markEnquiryRead, deleteEnquiry, replyToEnquiry, listMyInvoices, invoicePdfUrl, invoiceViewUrl, getAgencyProfile } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import EmailVerificationBanner from '@/components/EmailVerificationBanner';
import { 
  ChatCircle, CheckCircle, User, MapPin, Camera, Clock, 
  CurrencyDollar, FileText, Phone, EnvelopeSimple, WhatsappLogo,
  Plus, Trash, CaretRight, CaretLeft, UploadSimple, X, VideoCamera, ShieldCheck, Crown, Sparkle, ArrowRight, DotsSixVertical,
  PaperPlaneTilt, DownloadSimple, Eye, Check, CircleNotch
} from 'phosphor-react';
import { toast } from 'sonner';
import { notifyError, notifyProblem } from '../lib/notify';
import CharacteristicsForm from '@/components/CharacteristicsForm';
import BasicInfoStep from '@/components/onboarding/BasicInfoStep';
import VerificationModal from '@/components/VerificationModal';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
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
  const { providerId: routeProviderId } = useParams();
  const navigate = useNavigate();
  const isNewAgencyProfile = routeProviderId === 'new';
  const isAgencyScoped = !!routeProviderId;               // managing a specific agency profile
  const activeProviderId = isNewAgencyProfile ? null : (routeProviderId || null);
  const subscribeHref = `/subscribe${activeProviderId ? `?provider_id=${activeProviderId}` : ''}`;
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [mode, setMode] = useState('overview'); // 'overview' | 'edit' | 'create'
  const [createdProviderId, setCreatedProviderId] = useState(null); // id of a just-created independent profile (keeps the Activate wizard step working)
  const [saving, setSaving] = useState(false);
  const [draftStatus, setDraftStatus] = useState('idle'); // idle | saving | saved | error
  const [removing, setRemoving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [applyServicesToAll, setApplyServicesToAll] = useState(false);
  const [applyRatesToAll, setApplyRatesToAll] = useState(false);
  const [profileData, setProfileData] = useState({
    display_name: '',
    account_type: localStorage.getItem('pending_account_type') || 'independent',
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
    accepts_disabilities: false,
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
    ...(isAgencyScoped && applyServicesToAll ? [] : [{ id: 3, title: 'Services', icon: FileText }]),
    ...(isAgencyScoped && applyRatesToAll ? [] : [{ id: 4, title: 'Rates & Availability', icon: CurrencyDollar }]),
    ...(isAgencyScoped ? [] : [{ id: 5, title: 'Activate', icon: Crown }])
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
    if (user && user.email_verified === false) {
      notifyProblem('Please confirm your email first.', 'Check your inbox for the confirmation link — you can resend it from the banner at the top of your dashboard.');
      return;
    }
    setPayRedirecting(true);
    try {
      const { data } = await createSubscriptionCheckout({
        featured_plan: planFeatured,
        vip_plan: planVipOn ? planVip : null,
        auto_renew: autoRenew,
        origin_url: window.location.origin,
        provider_id: activeProviderId || createdProviderId
      });
      if (data?.url) {
        window.location.href = data.url;
      } else {
        notifyProblem("We couldn't start checkout.", 'Please try again in a moment.');
        setPayRedirecting(false);
      }
    } catch (e) {
      notifyError(e, "We couldn't start checkout.");
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
    if (isNewAgencyProfile) {
      // Fresh agency profile — start in create mode with escort-style display name,
      // prefilled with the agency's default services / rates / availability / contact.
      (async () => {
        try {
          const { data: ag } = await getAgencyProfile();
          if (ag && ag.onboarded) {
            setProfileData((pd) => ({
              ...pd,
              account_type: 'independent',
              location: {
                city: ag.location?.city || pd.location.city,
                country: ag.location?.country || pd.location.country
              },
              contact: { ...pd.contact, ...(ag.contact || {}) },
              services: ag.apply_services_to_all && ag.default_services ? ag.default_services : pd.services,
              accepts_disabilities: ag.accepts_disabilities ?? pd.accepts_disabilities,
              rates: (ag.default_rates && (ag.default_rates.incall || ag.default_rates.outcall)) ? ag.default_rates : pd.rates,
              availability_type: ag.default_availability?.availability_type || pd.availability_type,
              schedule: ag.default_availability?.schedule || pd.schedule,
              available247: ag.default_availability?.available247 ?? pd.available247,
              booking_advance: ag.default_availability?.booking_advance ?? pd.booking_advance,
              characteristics: {
                ...pd.characteristics,
                languages: Array.isArray(ag.languages) ? ag.languages : pd.characteristics.languages
              }
            }));
          } else {
            setProfileData((pd) => ({ ...pd, account_type: 'independent' }));
          }
        } catch (_e) {
          setProfileData((pd) => ({ ...pd, account_type: 'independent' }));
        }
      })();
      setMode('create');
      setLoading(false);
      return;
    }
    fetchDashboard();
    fetchSubscription();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeProviderId]);

  // Load agency default flags (controls whether Services / Rates steps appear per-profile)
  useEffect(() => {
    if (!isAgencyScoped) return;
    (async () => {
      try {
        const { data: ag } = await getAgencyProfile();
        if (ag && ag.onboarded) {
          setApplyServicesToAll(!!ag.apply_services_to_all);
          setApplyRatesToAll(!!ag.apply_rates_to_all);
        }
      } catch (_e) { /* agency profile may not exist yet */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAgencyScoped]);

  const fetchSubscription = async () => {
    try {
      const { data } = await getMySubscription(activeProviderId);
      setSubscription(data);
    } catch (_subErr) {
      // Subscription endpoint may 404 for brand-new providers — banner simply won't render.
    }
  };

  const fetchDashboard = async () => {
    try {
      const response = await getProviderDashboard(activeProviderId);
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
          accepts_disabilities: p.accepts_disabilities || false,
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
      notifyError(error, "We couldn't load your dashboard.");
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
    setRemoving(true);
    try {
      await deleteProviderProfile(activeProviderId);
      toast.success('Profile removed');
      if (isAgencyScoped) {
        navigate('/dashboard');
      } else {
        logout();
      }
    } catch (error) {
      notifyError(error, "We couldn't remove your profile.");
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
        accepts_disabilities: profileData.accepts_disabilities,
        photos: newPhotos,
        characteristics: profileData.characteristics
      };
      await updateProviderProfile(payload, activeProviderId);
      setUploadedFiles([]);
      toast.success('Profile updated');
      await fetchDashboard();
      setMode('overview');
    } catch (error) {
      notifyError(error, "We couldn't save your changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateProfile = async () => {
    // Friendly guardrails before hitting the server
    if (!profileData.display_name?.trim()) {
      notifyProblem('A display name is required.', 'Go to the Basic Info step and enter a display name for this profile.');
      setCurrentStep(1);
      return false;
    }
    if (!isAgencyScoped && !profileData.location?.country) {
      notifyProblem('A country is required.', 'Go to the Basic Info step and select the country for this profile.');
      setCurrentStep(1);
      return false;
    }
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
        accepts_disabilities: profileData.accepts_disabilities,
        photos: newPhotos,
        characteristics: profileData.characteristics
      };
      if (dashboard?.profile && !isNewAgencyProfile) {
        await updateProviderProfile(payload, activeProviderId);
        toast.success('Profile updated successfully!');
        setUploadedFiles([]);
        fetchDashboard();
        return true;
      } else if (createdProviderId && !isAgencyScoped) {
        // Re-saving the just-created independent profile (user went Back, edited, and continued again)
        await updateProviderProfile(payload, createdProviderId);
        setUploadedFiles([]);
        toast.success('Changes saved.');
        return true;
      } else {
        const { data: created } = await createProviderProfile(payload);
        setUploadedFiles([]);
        if (isAgencyScoped && created?.provider_id) {
          // Agency: return to the roster so they can choose a plan and add more profiles
          toast.success('Profile added! Choose a plan for it on your dashboard.');
          navigate('/dashboard');
          return true;
        }
        // Independent: stay inside the wizard on the Activate step so the stepper
        // and "Previous" button remain — the user can still go back to edit anything.
        setCreatedProviderId(created?.provider_id || null);
        toast.success('Profile saved — pick a plan to activate. You can still go back to edit.');
        return true;
      }
    } catch (error) {
      notifyError(error, "We couldn't save your profile.");
      return false;
    }
  };

  // ---- Draft autosave + Save & exit (creation flow only) ----
  const buildDraftPayload = () => ({
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
    accepts_disabilities: profileData.accepts_disabilities,
    photos: profileData.photos || [],
    characteristics: profileData.characteristics,
  });

  const canPersistDraft = () =>
    !!profileData.display_name?.trim() && (isAgencyScoped || !!profileData.location?.country);

  const saveDraft = async ({ allowCreate = false } = {}) => {
    if (mode === 'edit') return false;
    if (!canPersistDraft()) return false;
    try {
      setDraftStatus('saving');
      const payload = buildDraftPayload();
      if (dashboard?.profile && !isNewAgencyProfile) {
        await updateProviderProfile(payload, activeProviderId);
      } else if (createdProviderId && !isAgencyScoped) {
        await updateProviderProfile(payload, createdProviderId);
      } else if (allowCreate && !isAgencyScoped) {
        const { data: created } = await createProviderProfile(payload);
        setCreatedProviderId(created?.provider_id || null);
      } else {
        setDraftStatus('idle');
        return false;
      }
      setDraftStatus('saved');
      return true;
    } catch (e) {
      setDraftStatus('error');
      return false;
    }
  };

  const handleSaveExit = async () => {
    if (canPersistDraft()) await saveDraft({ allowCreate: true });
    navigate('/dashboard');
  };

  // Debounced autosave while editing an already-persisted draft (no silent create)
  useEffect(() => {
    if (mode === 'edit' || !canPersistDraft()) return;
    const hasRecord = (dashboard?.profile && !isNewAgencyProfile) || (createdProviderId && !isAgencyScoped);
    if (!hasRecord) return;
    const t = setTimeout(() => { saveDraft(); }, 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileData]);

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
      notifyProblem('Some files were skipped.', 'Only JPG, PNG and WebP images and MP4 videos are allowed — please choose supported files.');
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
    const idx = steps.findIndex((s) => s.id === currentStep);
    if (idx >= 0 && idx < steps.length - 1) setCurrentStep(steps[idx + 1].id);
  };

  const prevStep = () => {
    const idx = steps.findIndex((s) => s.id === currentStep);
    if (idx > 0) setCurrentStep(steps[idx - 1].id);
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
        <SiteHeader />

        <div className="pt-32 pb-20 section-padding">
          <div className="max-w-6xl mx-auto">
            <EmailVerificationBanner user={user} />
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12" data-testid="manage-header">
              <div>
                <p className="text-[#000000] text-xs uppercase tracking-[0.2em] mb-3">Manage Profile</p>
                {isAgencyScoped && (
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-1 text-sm text-[#7A2357] hover:text-[#A3243B] transition-colors mb-3"
                    data-testid="back-to-agency-btn"
                  >
                    <CaretLeft size={16} /> Back to all profiles
                  </button>
                )}
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

            {/* Subscription banner — activation notice is the default until payment is confirmed */}
            <div className="mb-8" data-testid="subscription-banner">
              {subscription?.in_grace ? (
                  <div className="rounded-lg border border-[#F59E0B]/60 bg-[#F59E0B]/10 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4" data-testid="grace-banner">
                    <div className="flex items-start gap-3">
                      <Crown size={22} weight="fill" className="text-[#B45309] mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[#000000] font-medium mb-1">Your listing has expired</p>
                        <p className="text-[#000000] text-sm">
                          It stays visible on Browse for <span className="font-semibold">{Math.ceil(subscription.grace_days_left)} more day{Math.ceil(subscription.grace_days_left) === 1 ? '' : 's'}</span>. Renew now to avoid being hidden from clients.
                        </p>
                      </div>
                    </div>
                    <Link to={subscribeHref} className="btn-primary whitespace-nowrap" data-testid="renew-cta">
                      Renew now
                    </Link>
                  </div>
                ) : !subscription?.featured_active ? (
                  <div className="rounded-lg border border-[#7A2357]/40 bg-gradient-to-r from-[#7A2357]/10 to-transparent p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Crown size={22} weight="fill" className="text-[#7A2357] mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[#000000] font-medium mb-1">Activate your profile</p>
                        <p className="text-[#000000] text-sm">
                          Choose a Featured plan to appear on Browse. Add VIP Boost to be displayed at the top of every search.
                        </p>
                      </div>
                    </div>
                    <Link to={subscribeHref} className="btn-primary whitespace-nowrap" data-testid="activate-cta">
                      Choose a plan
                    </Link>
                  </div>
                ) : (
                  <div className="rounded-lg border border-[#dbdadd] bg-white p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {subscription.vip_active ? (
                        <Crown size={22} weight="fill" className="text-[#7A2357] mt-0.5 shrink-0" />
                      ) : (
                        <CheckCircle size={22} weight="fill" className="text-[#22C55E] mt-0.5 shrink-0" />
                      )}
                      <div>
                        <p className="text-[#000000] font-medium mb-1">
                          {subscription.vip_active ? 'Profile status: online (VIP)' : 'Profile status: online'}
                        </p>
                        <p className="text-[#000000] text-sm mb-3">
                          Your profile expires in <span className="text-[#000000] font-medium">{Math.ceil(subscription.featured_days_left)} day{Math.ceil(subscription.featured_days_left) === 1 ? '' : 's'}</span>
                          {subscription.vip_active && subscription.vip_days_left ? (
                            <> · VIP Boost: {Math.ceil(subscription.vip_days_left)} day{Math.ceil(subscription.vip_days_left) === 1 ? '' : 's'} remaining</>
                          ) : null}
                          .
                        </p>
                        {/* Auto-renew toggle */}
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={subscription.auto_renew !== false}
                            onClick={async () => {
                              const next = !(subscription.auto_renew !== false);
                              try {
                                await updateAutoRenew(next, activeProviderId);
                                fetchDashboard();
                                toast.success(next ? 'Auto-renew enabled' : 'Auto-renew disabled');
                              } catch (err) {
                                notifyError(err, "We couldn't update auto-renew.");
                              }
                            }}
                            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                              subscription.auto_renew !== false ? 'bg-[#A3243B]' : 'bg-[#dbdadd]'
                            }`}
                            data-testid="auto-renew-summary-toggle"
                          >
                            <span
                              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-[#FFFFFF] transition-transform ${
                                subscription.auto_renew !== false ? 'translate-x-5' : ''
                              }`}
                            />
                          </button>
                          <span className="text-sm text-[#000000]">
                            Auto-renew {subscription.auto_renew !== false ? 'on' : 'off'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      {!subscription.vip_active && (
                        <Link to={subscribeHref} className="btn-secondary whitespace-nowrap" data-testid="upgrade-vip-cta">
                          Upgrade to VIP
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>

            {/* Messages + Invoices boxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8" data-testid="messages-invoices-grid">
              <MessagesBox providerId={activeProviderId} />
              <InvoicesBox providerId={activeProviderId} />
            </div>

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
                    className="mb-8 rounded-lg border border-[#7A2357]/30 bg-[#7A2357]/5 p-5 flex items-start gap-4"
                    data-testid="verification-banner-submitted"
                  >
                    <ShieldCheck size={22} weight="thin" className="text-[#7A2357] mt-0.5 shrink-0" />
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
                  className="mb-8 rounded-lg border border-[#7A2357]/40 bg-gradient-to-br from-[#7A2357]/10 to-transparent p-6"
                  data-testid="verification-banner-pending"
                >
                  <div className="flex items-start gap-4">
                    <ShieldCheck size={24} weight="thin" className="text-[#7A2357] mt-1 shrink-0" />
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
                    <User size={18} className="text-[#7A2357]" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#000000]">Step 1</p>
                    <h3 className="text-lg font-bold text-[#000000]">Basic Info</h3>
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
                    <Camera size={18} className="text-[#7A2357]" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#000000]">Step 2</p>
                    <h3 className="text-lg font-bold text-[#000000]">Photos & Video&apos;s</h3>
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
              {(!isAgencyScoped || !applyServicesToAll) && (
              <div className="bg-white border border-[#dbdadd] rounded-lg p-8" data-testid="card-services">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full border border-[#dbdadd] flex items-center justify-center">
                    <FileText size={18} className="text-[#7A2357]" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#000000]">Step 3</p>
                    <h3 className="text-lg font-bold text-[#000000]">Services</h3>
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
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#7A2357] mb-2">Inclusive ({inclusiveServices.length})</p>
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
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#7A2357] mb-2">Extra ({extraServices.length})</p>
                        <div className="flex flex-wrap gap-2">
                          {extraServices.slice(0, 6).map(([name, v]) => (
                            <span key={name} className="px-3 py-1 text-xs border border-[#7A2357]/40 bg-[#7A2357]/10 text-[#7A2357] rounded-full">
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
              )}

              {/* 4. Rates */}
              {(!isAgencyScoped || !applyRatesToAll) && (
              <div className="bg-white border border-[#dbdadd] rounded-lg p-8" data-testid="card-rates">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full border border-[#dbdadd] flex items-center justify-center">
                    <CurrencyDollar size={18} className="text-[#7A2357]" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#000000]">Step 4</p>
                    <h3 className="text-lg font-bold text-[#000000]">Rates</h3>
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
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#7A2357] mb-3">{kind}</p>
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
                                <span className="text-[#7A2357]">
                                  {v ? `${sym}${v}` : <span className="text-[#000000] text-sm italic">Not set</span>}
                                </span>
                              </div>
                            );
                          })}
                          {extras.map((extra, i) => (
                            <div key={`extra-${i}`} className="flex items-center justify-between border-b border-[#dbdadd] pb-2">
                              <span className="text-[#000000] text-sm">{extra.hours} hours</span>
                              <span className="text-[#7A2357]">
                                {extra.price ? `${sym}${extra.price}` : <span className="text-[#000000] text-sm italic">Not set</span>}
                              </span>
                            </div>
                          ))}
                          {col.overnight !== undefined && col.overnight !== '' && (
                            <div className="flex items-center justify-between border-b border-[#dbdadd] pb-2">
                              <span className="text-[#000000] text-sm">Overnight</span>
                              <span className="text-[#7A2357]">{sym}{col.overnight}</span>
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
              )}

              {/* 5. Availability */}
              {(!isAgencyScoped || !applyRatesToAll) && (
              <div className="bg-white border border-[#dbdadd] rounded-lg p-8" data-testid="card-availability">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full border border-[#dbdadd] flex items-center justify-center">
                    <Clock size={18} className="text-[#7A2357]" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#000000]">Step 4</p>
                    <h3 className="text-lg font-bold text-[#000000]">Availability</h3>
                    <p className="text-[#000000] text-xs mt-1">{availableDays} of 7 days available</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
                  {scheduleDays.map(([day, sched]) => (
                    <div
                      key={day}
                      className={`border p-3 text-center transition-colors ${
                        sched?.available ? 'border-[#7A2357]/40 bg-[#7A2357]/5' : 'border-[#dbdadd] opacity-50'
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
              )}

              {/* Remove profile */}
              <div className="bg-white border border-[#B91C1C] rounded-lg p-6 mt-12" data-testid="card-danger-zone">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full border border-[#B91C1C] flex items-center justify-center">
                    <Trash size={18} className="text-[#B91C1C]" />
                  </div>
                  <div>
                    <h3 className="text-xl text-[#B91C1C]">Remove my profile</h3>
                  </div>
                </div>
                <p className="text-[#000000] text-sm mb-6">
                  This permanently deletes your profile, photos, subscriptions and verification documents. This action cannot be undone.
                </p>
                <button
                  onClick={() => setConfirmRemove(true)}
                  disabled={removing}
                  className="w-full px-4 py-3 border border-[#B91C1C] text-[#B91C1C] hover:bg-[#B91C1C]/10 transition-colors text-sm uppercase tracking-wider disabled:opacity-50"
                  data-testid="remove-profile-btn"
                >
                  {removing ? 'Removing…' : 'Remove profile permanently'}
                </button>
              </div>
            </div>
          </div>
        </div>
        <ConfirmDeleteModal
          open={confirmRemove}
          onClose={() => setConfirmRemove(false)}
          onConfirm={handleRemoveProfile}
          busy={removing}
          title="Remove profile permanently"
          description="Your photos, services, subscription history, enquiries and verification documents will all be deleted. This cannot be undone."
          confirmWord={p.display_name || 'DELETE'}
          confirmLabel="Remove profile"
        />
        <VerificationModal
          open={showVerificationModal}
          onClose={() => setShowVerificationModal(false)}
          onSubmitted={fetchDashboard}
          providerId={activeProviderId}
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
              className="flex items-center gap-2 text-[#000000] hover:text-[#A3243B] transition-colors"
              data-testid="back-to-overview-btn"
            >
              <CaretLeft size={18} />
              <span className="uppercase tracking-wider text-xs md:text-sm">Back to Overview</span>
            </button>
          ) : isAgencyScoped ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-[#000000] hover:text-[#A3243B] transition-colors"
              data-testid="back-to-agency-btn"
            >
              <CaretLeft size={18} />
              <span className="uppercase tracking-wider text-xs md:text-sm">Back to all profiles</span>
            </button>
          ) : null
        }
      />

      <div className="pt-32 pb-20 section-padding">
        <div className="max-w-4xl mx-auto">
          <EmailVerificationBanner user={user} />
          {/* Page header */}
          {mode === 'edit' ? (
            <div className="text-center mb-10">
              <h2 className="text-4xl font-bold text-[#1B1820] mb-2">Edit {steps[currentStep - 1]?.title}</h2>
              <p className="text-[#5F5966]">Update this section of your profile</p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#7A2357] mb-2" data-testid="step-indicator-label">
                  Step {currentStep} of {steps.length} · About 6 minutes left
                </p>
                <h2 className="text-[30px] md:text-4xl font-bold text-[#1B1820] leading-tight mb-1">Complete your profile</h2>
                <p className="text-[#5F5966]">Set up your provider profile to start receiving enquiries.</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {draftStatus !== 'idle' && (
                  <span className="flex items-center gap-1.5 text-sm text-[#5F5966]" data-testid="draft-status">
                    {draftStatus === 'saving' ? (
                      <><CircleNotch size={16} className="animate-spin" /> Saving…</>
                    ) : draftStatus === 'error' ? (
                      <span className="text-[#A3243B]">Couldn't save</span>
                    ) : (
                      <><CheckCircle size={16} weight="fill" className="text-[#7A2357]" /> Draft saved</>
                    )}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSaveExit}
                  className="px-5 py-2.5 rounded-lg border border-[#DFDAE4] bg-white text-sm font-semibold text-[#1B1820] hover:border-[#7A2357] hover:text-[#7A2357] transition-colors"
                  data-testid="save-exit-button"
                >
                  Save &amp; exit
                </button>
              </div>
            </div>
          )}

          {/* Progress Steps - only for creation flow */}
          {mode !== 'edit' && (
          <div className="mb-8 bg-white rounded-2xl shadow-[0_6px_20px_rgba(52,24,60,0.06)] px-5 md:px-7 py-4 overflow-x-auto">
            <div className="flex items-center">
              {steps.map((step, index) => {
                const active = currentStep === step.id;
                const done = currentStep > step.id;
                const label = ({ 1: 'Basic info', 2: 'Photos & videos', 3: 'Services', 4: 'Rates & availability', 5: 'Activate' })[step.id] || step.title;
                return (
                  <Fragment key={step.id}>
                    <button
                      onClick={() => setCurrentStep(step.id)}
                      className="flex items-center gap-2.5 flex-shrink-0 transition-colors"
                      data-testid={`step-${step.id}`}
                    >
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-semibold transition-colors ${
                        active ? 'border-2 border-[#7A2357] text-[#7A2357] bg-white'
                        : done ? 'bg-[#7A2357] text-white'
                        : 'bg-[#F5F2F7] text-[#8E8597]'
                      }`}>
                        {done ? <Check size={14} weight="bold" /> : step.id}
                      </span>
                      <span className={`text-[15px] whitespace-nowrap ${
                        active ? 'font-bold text-[#1B1820]' : done ? 'text-[#1B1820]' : 'text-[#5F5966]'
                      }`}>{label}</span>
                    </button>
                    {index < steps.length - 1 && (
                      <div className="flex-1 h-px bg-[#DFDAE4] mx-3 md:mx-5 min-w-[20px]" />
                    )}
                  </Fragment>
                );
              })}
            </div>
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
              <BasicInfoStep
                profileData={profileData}
                setProfileData={setProfileData}
                isAgencyScoped={isAgencyScoped}
                newLanguage={newLanguage}
                setNewLanguage={setNewLanguage}
                showAddLanguage={showAddLanguage}
                setShowAddLanguage={setShowAddLanguage}
                countryDialCodes={COUNTRY_DIAL_CODES}
              />
            )}

            {/* Step 2: Photos & Video's */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-[#7A2357] mb-6">Photos & Video&apos;s</h3>
                <p className="text-[#000000] text-sm mb-6">Add photos and videos to your profile. Media will be reviewed before being published.</p>

                {/* Upload Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-12 text-center transition-all cursor-pointer ${
                    isDragging 
                      ? 'border-[#7A2357] bg-[#7A2357]/5' 
                      : 'border-[#dbdadd] hover:border-[#7A2357]'
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
                  <UploadSimple size={48} className={`mx-auto mb-4 transition-colors ${isDragging ? 'text-[#7A2357]' : 'text-[#000000]'}`} />
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
                            <span className="absolute top-2 left-2 px-2 py-1 bg-[#7A2357] text-[#0A0A0C] text-[10px] uppercase tracking-wider font-medium rounded-sm">
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
                              className="w-7 h-7 bg-black/70 hover:bg-[#7A2357] disabled:opacity-30 disabled:cursor-not-allowed rounded-full flex items-center justify-center text-white"
                              data-testid={`photo-move-left-${idx}`}
                              aria-label="Move left"
                            >
                              <CaretLeft size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); movePhoto(idx, idx + 1); }}
                              disabled={idx === profileData.photos.length - 1}
                              className="w-7 h-7 bg-black/70 hover:bg-[#7A2357] disabled:opacity-30 disabled:cursor-not-allowed rounded-full flex items-center justify-center text-white"
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
                <h3 className="text-2xl font-bold text-[#7A2357] mb-6">Services</h3>
                
                {/* Type of Companionship */}
                <div className="mb-8">
                  <label className="input-label mb-4">Type of companionship</label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setProfileData({ ...profileData, companionshipType: 'escort' })}
                      className={`px-6 py-3 border text-sm transition-all ${
                        profileData.companionshipType === 'escort'
                          ? 'border-[#7A2357] bg-[#7A2357]/5 text-[#7A2357]'
                          : 'border-[#898989] text-[#898989] hover:border-[#7A2357]'
                      }`}
                    >
                      Escort
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfileData({ ...profileData, companionshipType: 'erotic-massage' })}
                      className={`px-6 py-3 border text-sm transition-all ${
                        profileData.companionshipType === 'erotic-massage'
                          ? 'border-[#7A2357] bg-[#7A2357]/5 text-[#7A2357]'
                          : 'border-[#898989] text-[#898989] hover:border-[#7A2357]'
                      }`}
                    >
                      Erotic Massage
                    </button>
                  </div>
                </div>

                {/* Accepts people with disabilities */}
                <div className="rounded-lg border border-[#7A2357]/30 bg-[#7A2357]/5 p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!profileData.accepts_disabilities}
                      onChange={(e) => setProfileData({ ...profileData, accepts_disabilities: e.target.checked })}
                      className="mt-0.5 w-5 h-5 rounded border-[#dbdadd] bg-white checked:bg-[#7A2357] checked:border-[#7A2357]"
                      data-testid="accepts-disabilities-checkbox"
                    />
                    <span className="text-[#000000] font-medium">We accept people with disabilities</span>
                  </label>
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
                          } ${serviceData.type ? 'bg-[#7A2357]/5' : ''}`}
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
                                  ? 'border-[#7A2357] bg-[#7A2357]/5 text-[#7A2357]'
                                  : 'border-[#898989] text-[#898989] hover:border-[#7A2357]'
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
                                  ? 'border-[#7A2357] bg-[#7A2357]/5 text-[#7A2357]'
                                  : 'border-[#898989] text-[#898989] hover:border-[#7A2357]'
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
                    <h3 className="text-2xl font-bold text-[#7A2357] mb-1">Availability</h3>
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
                              ? 'border-[#7A2357] bg-[#7A2357]/5 text-[#7A2357]'
                              : 'border-[#898989] text-[#898989] hover:border-[#7A2357]'
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
                      className="w-5 h-5 rounded border-[#dbdadd] bg-white checked:bg-[#7A2357] checked:border-[#7A2357]"
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
                      className="w-5 h-5 rounded border-[#dbdadd] bg-white checked:bg-[#7A2357] checked:border-[#7A2357]"
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
                            className="w-5 h-5 rounded border-[#dbdadd] bg-white checked:bg-[#7A2357] checked:border-[#7A2357]"
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
                    <h3 className="text-2xl font-bold text-[#7A2357] mb-1">Rates</h3>
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
                          <h4 className="text-[#7A2357] uppercase tracking-[0.2em] text-sm">
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
                            className="w-full py-3 border border-dashed border-[#dbdadd] text-[#000000] hover:border-[#7A2357] hover:text-[#A3243B] transition-colors flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
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
                                  className="w-5 h-5 rounded border-[#dbdadd] bg-white checked:bg-[#A3243B] checked:border-[#A3243B]"
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
                  <p className="text-[10px] uppercase tracking-[0.3em] text-[#7A2357] mb-3">Final step</p>
                  <h3 className="text-2xl text-[#7A2357] mb-2">Activate your profile</h3>
                  <p className="text-[#000000] text-sm max-w-xl">
                    Your profile is saved. A Featured listing makes you visible to clients on Browse. Add VIP Boost to appear at the top of every search.
                  </p>
                </div>

                {/* Featured */}
                <div className="card-premium p-6">
                  <div className="flex items-start gap-3 mb-5">
                    <Sparkle size={20} weight="fill" className="text-[#7A2357] mt-1 flex-shrink-0" />
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
                            ? 'border-[#7A2357] bg-[#7A2357]/5'
                            : 'border-[#dbdadd] hover:border-[#7A2357]'
                        }`}
                        data-testid={`featured-option-${opt.id}`}
                      >
                        {opt.badge && (
                          <span className="absolute top-3 right-3 text-[10px] uppercase tracking-wider px-2 py-1 bg-[#7A2357] text-[#FFFFFF] font-medium">
                            {opt.badge}
                          </span>
                        )}
                        <p className="text-[#000000] text-xs uppercase tracking-[0.2em] mb-2">{opt.label}</p>
                        <p className="text-3xl text-[#000000] mb-1">€{opt.price}</p>
                        <p className="text-[#000000] text-xs">{opt.perDay}</p>
                        {planFeatured === opt.id && (
                          <CheckCircle size={18} weight="fill" className="absolute bottom-3 right-3 text-[#7A2357]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* VIP Boost */}
                <div className="card-premium p-6">
                  <div className="flex items-start justify-between mb-5 gap-4">
                    <div className="flex items-start gap-3">
                      <Crown size={20} weight="fill" className="text-[#7A2357] mt-1 flex-shrink-0" />
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
                        planVipOn ? 'bg-[#7A2357]' : 'bg-[#dbdadd]'
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
                            ? 'border-[#7A2357] bg-[#7A2357]/5'
                            : 'border-[#dbdadd] hover:border-[#7A2357]'
                        }`}
                        data-testid={`vip-option-${opt.id}`}
                      >
                        {opt.badge && (
                          <span className="absolute top-3 right-3 text-[10px] uppercase tracking-wider px-2 py-1 bg-[#7A2357] text-[#FFFFFF] font-medium">
                            {opt.badge}
                          </span>
                        )}
                        <p className="text-[#000000] text-xs uppercase tracking-[0.2em] mb-2">{opt.label}</p>
                        <p className="text-2xl text-[#000000]">€{opt.price}</p>
                        {planVipOn && planVip === opt.id && (
                          <CheckCircle size={16} weight="fill" className="absolute bottom-3 right-3 text-[#7A2357]" />
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
                      autoRenew ? 'bg-[#7A2357]' : 'bg-[#dbdadd]'
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
          </motion.div>

          {/* Action bar */}
          <div className="mt-6 bg-white border border-[#ECE8EF] rounded-2xl shadow-[0_6px_20px_rgba(52,24,60,0.06)] px-5 md:px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
              {mode !== 'edit' && currentStep === 1 && (
                <p className="text-sm text-[#5F5966]">Physical characteristics are optional.</p>
              )}
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

                  {isAgencyScoped ? (
                    steps[steps.length - 1]?.id === currentStep ? (
                      <button
                        type="button"
                        onClick={handleCreateProfile}
                        className="btn-primary flex items-center gap-2"
                        data-testid="save-agency-profile-button"
                      >
                        Save profile
                        <CheckCircle size={18} weight="bold" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={nextStep}
                        className="btn-primary flex items-center gap-2"
                        data-testid="next-button"
                      >
                        Next
                        <CaretRight size={20} />
                      </button>
                    )
                  ) : currentStep < 4 ? (
                    <button
                      type="button"
                      onClick={currentStep === 1
                        ? async () => { await saveDraft({ allowCreate: true }); nextStep(); }
                        : nextStep}
                      className="btn-primary flex items-center gap-2"
                      data-testid="next-button"
                    >
                      {currentStep === 1 ? 'Save & continue' : 'Next'}
                      <CaretRight size={20} />
                    </button>
                  ) : currentStep === 4 ? (
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await handleCreateProfile();
                        if (ok) setCurrentStep(5);
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
        </div>
      </div>
      <VerificationModal
        open={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        onSubmitted={fetchDashboard}
        providerId={activeProviderId}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Received messages box
 * ------------------------------------------------------------------ */
function MessagesBox({ providerId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);
  const [expandedId, setExpandedId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = async () => {
    try {
      const res = await listMyEnquiries(providerId);
      setItems(res.data.enquiries || []);
      setUnread(res.data.unread || 0);
    } catch (e) { console.error('Failed to load enquiries', e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [providerId]);

  const toggleExpand = async (enq) => {
    const nextId = expandedId === enq.enquiry_id ? null : enq.enquiry_id;
    setExpandedId(nextId);
    setReplyText('');
    if (nextId && !enq.read) {
      try {
        await markEnquiryRead(enq.enquiry_id, true);
        setItems((prev) => prev.map((e) => e.enquiry_id === enq.enquiry_id ? { ...e, read: true } : e));
        setUnread((u) => Math.max(0, u - 1));
      } catch (e) { console.error('Failed to mark enquiry read', e); }
    }
  };

  const handleDelete = async (enq, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete this message from ${enq.name || 'Anonymous'}? This cannot be undone.`)) return;
    setDeletingId(enq.enquiry_id);
    try {
      await deleteEnquiry(enq.enquiry_id);
      setItems((prev) => prev.filter((e) => e.enquiry_id !== enq.enquiry_id));
      if (!enq.read) setUnread((u) => Math.max(0, u - 1));
      if (expandedId === enq.enquiry_id) setExpandedId(null);
      toast.success('Message deleted');
    } catch (err) {
      notifyError(err, "We couldn't delete this message.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleReply = async (enq, e) => {
    e.stopPropagation();
    const text = replyText.trim();
    if (text.length < 2) {
      notifyProblem('Your reply is too short.', 'Write at least a couple of words before sending.');
      return;
    }
    setReplying(true);
    try {
      const res = await replyToEnquiry(enq.enquiry_id, text);
      toast.success(res.data.delivered ? 'Reply sent' : 'Reply saved (email not delivered)');
      setReplyText('');
      setExpandedId(null);
    } catch (err) {
      notifyError(err, "We couldn't send your reply.");
    } finally {
      setReplying(false);
    }
  };

  return (
    <div className="rounded-lg border border-[#dbdadd] bg-white p-5" data-testid="messages-box">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-[#7A2357]">Received messages</h3>
        {unread > 0 && (
          <span className="text-xs font-medium px-2 py-1 bg-[#A3243B] text-white rounded-full" data-testid="messages-unread-count">
            {unread} new
          </span>
        )}
      </div>
      {loading ? (
        <p className="text-sm text-[#898989]">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-[#898989]">No messages yet. Enquiries from your public profile will appear here.</p>
      ) : (
        <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
          {items.map((enq) => {
            const isOpen = expandedId === enq.enquiry_id;
            return (
              <div
                key={enq.enquiry_id}
                className={`border rounded-lg transition-colors ${enq.read ? 'border-[#dbdadd] bg-white' : 'border-[#A3243B]/40 bg-[#A3243B]/5'}`}
                data-testid={`message-item-${enq.enquiry_id}`}
              >
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => toggleExpand(enq)}
                      className="flex-1 text-left min-w-0"
                      data-testid={`message-toggle-${enq.enquiry_id}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm truncate ${enq.read ? 'text-[#000000]' : 'text-[#000000] font-semibold'}`}>
                          {enq.name || 'Anonymous'}
                        </span>
                        <span className="text-xs text-[#898989] shrink-0">
                          {new Date(enq.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className={`text-xs mt-1 ${isOpen ? 'text-[#000000] whitespace-pre-wrap' : 'text-[#898989] truncate'}`}>
                        {enq.message}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(enq, e)}
                      disabled={deletingId === enq.enquiry_id}
                      className="text-[#898989] hover:text-[#B91C1C] p-1 rounded transition-colors disabled:opacity-50"
                      title="Delete message"
                      aria-label="Delete message"
                      data-testid={`message-delete-${enq.enquiry_id}`}
                    >
                      <Trash size={16} weight="regular" />
                    </button>
                  </div>

                  {isOpen && enq.email && (
                    <div className="mt-3 pt-3 border-t border-[#dbdadd]">
                      <p className="text-xs text-[#7A2357] mb-2">
                        Reply to <span className="text-[#000000] font-medium">{enq.email}</span>
                      </p>
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write your reply…"
                        rows={3}
                        className="input-premium w-full text-sm"
                        data-testid={`message-reply-textarea-${enq.enquiry_id}`}
                      />
                      <div className="flex items-center justify-end gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => { setExpandedId(null); setReplyText(''); }}
                          className="text-xs text-[#898989] hover:text-[#000000] uppercase tracking-wider"
                          data-testid={`message-reply-cancel-${enq.enquiry_id}`}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleReply(enq, e)}
                          disabled={replying || replyText.trim().length < 2}
                          className="btn-primary text-xs px-3 py-2 flex items-center gap-2 disabled:opacity-50"
                          data-testid={`message-reply-send-${enq.enquiry_id}`}
                        >
                          <PaperPlaneTilt size={14} weight="fill" />
                          {replying ? 'Sending…' : 'Send reply'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Invoices box
 * ------------------------------------------------------------------ */
function InvoicesBox({ providerId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listMyInvoices(providerId)
      .then((r) => setItems(r.data.invoices || []))
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line
  }, [providerId]);

  const formatMoney = (amt, currency) => {
    if (amt === null || amt === undefined) return '—';
    const sym = { EUR: '€', USD: '$', GBP: '£' }[currency] || (currency + ' ');
    return `${sym}${Number(amt).toFixed(2)}`;
  };

  const describe = (inv) => {
    const parts = [];
    if (inv.featured_id) parts.push(`Featured ${inv.featured_id}`);
    if (inv.vip_id) parts.push(`VIP ${inv.vip_id}`);
    return parts.length ? parts.join(' + ') : (inv.plan || 'Subscription');
  };

  return (
    <div className="rounded-lg border border-[#dbdadd] bg-white p-5" data-testid="invoices-box">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-[#7A2357]">Invoices</h3>
        {items.length > 0 && (
          <span className="text-xs text-[#898989]">{items.length} total</span>
        )}
      </div>
      {loading ? (
        <p className="text-sm text-[#898989]">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-[#898989]">No invoices yet. Each subscription purchase will appear here.</p>
      ) : (
        <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
          {items.map((inv) => (
            <div
              key={inv.invoice_id}
              className="flex items-center justify-between gap-3 border border-[#dbdadd] rounded-lg p-3"
              data-testid={`invoice-item-${inv.invoice_id}`}
            >
              <div className="min-w-0">
                <p className="text-sm text-[#000000] font-medium truncate">{describe(inv)}</p>
                <p className="text-xs text-[#898989]">
                  {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : '—'} · {formatMoney(inv.amount, inv.currency)}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <a
                  href={invoiceViewUrl(inv.invoice_id)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs uppercase tracking-wider text-[#7A2357] hover:text-[#A3243B] flex items-center gap-1"
                  data-testid={`invoice-view-${inv.invoice_id}`}
                  title="View invoice in a new tab"
                >
                  <Eye size={14} weight="regular" />
                  View
                </a>
                <a
                  href={invoicePdfUrl(inv.invoice_id)}
                  className="text-xs uppercase tracking-wider text-[#7A2357] hover:text-[#A3243B] flex items-center gap-1"
                  data-testid={`invoice-pdf-${inv.invoice_id}`}
                  title="Download PDF"
                >
                  <DownloadSimple size={14} weight="regular" />
                  Download
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

