import { useState, useEffect, Fragment } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getProviderDashboard, createProviderProfile, updateProviderProfile, deleteProviderProfile, getMySubscription, createSubscriptionCheckout, updateAutoRenew, listMyEnquiries, markEnquiryRead, deleteEnquiry, replyToEnquiry, listMyInvoices, invoicePdfUrl, invoiceViewUrl, getMyMedia, getAgencyProfile } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import EmailVerificationBanner from '@/components/EmailVerificationBanner';
import { 
  ChatCircle, CheckCircle, User, MapPin, Camera, Clock, 
  CurrencyDollar, FileText, Phone, EnvelopeSimple, WhatsappLogo,
  Plus, Trash, CaretRight, CaretLeft, UploadSimple, X, VideoCamera, ShieldCheck, Crown, Sparkle, ArrowRight, DotsSixVertical,
  PaperPlaneTilt, DownloadSimple, Eye, Check, CircleNotch, Lock, PencilSimple, Play
} from 'phosphor-react';
import { toast } from 'sonner';
import { notifyError, notifyProblem } from '../lib/notify';
import CharacteristicsForm from '@/components/CharacteristicsForm';
import BasicInfoStep from '@/components/onboarding/BasicInfoStep';
import ServicesStep from '@/components/onboarding/ServicesStep';
import RatesAvailabilityStep from '@/components/onboarding/RatesAvailabilityStep';
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
  const [enquiries, setEnquiries] = useState([]);
  const [enquiriesUnread, setEnquiriesUnread] = useState(0);
  const [invoices, setInvoices] = useState([]);
  const [media, setMedia] = useState([]);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [showInvoicesModal, setShowInvoicesModal] = useState(false);
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

  // Step 5 order summary — VIP duration always mirrors the chosen Featured duration
  const featuredOpt = FEATURED_OPTIONS.find((o) => o.id === planFeatured);
  const featuredWeeks = planFeatured === 'featured_2w' ? '2 weeks' : '4 weeks';
  const vipPrice = VIP_OPTIONS.find((o) => o.id === (planFeatured === 'featured_2w' ? 'vip_2w' : 'vip_4w'))?.price || 0;
  const stepTotal = (featuredOpt?.price || 0) + (planVipOn ? vipPrice : 0);
  useEffect(() => {
    setPlanVip(planFeatured === 'featured_2w' ? 'vip_2w' : 'vip_4w');
  }, [planFeatured]);

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
    fetchOverviewData();
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

  const fetchOverviewData = async () => {
    const [enq, inv, med] = await Promise.allSettled([
      listMyEnquiries(activeProviderId),
      listMyInvoices(activeProviderId),
      getMyMedia(activeProviderId),
    ]);
    if (enq.status === 'fulfilled') {
      setEnquiries(enq.value.data?.enquiries || []);
      setEnquiriesUnread(enq.value.data?.unread || 0);
    }
    if (inv.status === 'fulfilled') setInvoices(inv.value.data?.invoices || []);
    if (med.status === 'fulfilled') setMedia(med.value.data?.media || []);
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

    const firstName = (p.display_name || '').split(' ')[0] || p.display_name;
    const contactRows = [
      { label: 'Mobile phone', value: profileData.contact?.phone },
      { label: 'WhatsApp', value: profileData.contact?.whatsapp },
      { label: 'Telegram', value: profileData.contact?.telegram },
      { label: 'Email', value: profileData.contact?.email },
    ].filter((c) => c.value);
    const basicRows = [
      { label: 'Display name', value: p.display_name },
      { label: 'Age', value: p.age },
      { label: 'Gender', value: p.gender, cap: true },
      { label: 'Orientation', value: profileData.characteristics?.orientation, cap: true },
      { label: 'Location', value: p.location?.city ? `${p.location.city}, ${p.location.country}` : null },
      { label: 'Languages', value: Array.isArray(profileData.characteristics?.languages) && profileData.characteristics.languages.length ? profileData.characteristics.languages.join(', ') : null },
      ...contactRows,
    ];
    const sym = currencySymbol(profileData.rates?.currency);
    const rateIncall = profileData.rates?.incall || {};
    const rateOutcall = profileData.rates?.outcall || {};
    const firstRates = [Number(rateIncall['1hour']) || null, Number(rateOutcall['1hour']) || null].filter(Boolean);
    const fromRate = firstRates.length ? Math.min(...firstRates) : null;
    const toHrs = (t) => { const [h, m] = String(t || '0:0').split(':').map(Number); return (h || 0) + (m || 0) / 60; };
    const weeklyHours = Object.values(profileData.schedule || {}).reduce((acc, s) => (s?.available ? acc + Math.max(0, toHrs(s.end) - toHrs(s.start)) : acc), 0);
    const availTypeLabel = profileData.availability_type === 'incall' ? 'Incall only' : profileData.availability_type === 'outcall' ? 'Outcall only' : 'Incall & outcall';
    const rateRowsFor = (col) => {
      const extras = (Array.isArray(col.extras) ? col.extras : []).slice().sort((a, b) => (Number(a.hours) || 0) - (Number(b.hours) || 0));
      return [
        { label: '1 hour', v: col['1hour'] },
        { label: '2 hours', v: col['2hours'] },
        { label: '3 hours', v: col['3hours'] },
        ...extras.map((e) => ({ label: `${e.hours} hours`, v: e.price })),
        ...(col.overnight !== undefined && col.overnight !== '' ? [{ label: 'Overnight', v: col.overnight }] : []),
      ].filter((r) => r.v !== undefined && r.v !== '' && r.v !== null);
    };
    const kinds = profileData.availability_type === 'incall' || profileData.availability_type === 'outcall' ? [profileData.availability_type] : ['incall', 'outcall'];
    const taxiCost = rateOutcall?.taxi;
    const fmtDate = (iso) => { try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; } };
    const latestInvoice = invoices[0] || null;
    const planLabel = subscription?.featured_active
      ? (subscription?.vip_active ? 'Featured + VIP Boost' : 'Featured')
      : (subscription?.vip_active ? 'VIP Boost' : null);
    const daysLeft = Math.max(0, Math.round(subscription?.featured_days_left || 0));
    const planDuration = subscription?.plans?.[latestInvoice?.featured_id]?.duration_days || null;
    const totalDays = planDuration || Math.max(daysLeft, 1);
    const planPct = Math.min(100, Math.max(0, totalDays ? (daysLeft / totalDays) * 100 : 0));
    const endDateStr = subscription?.featured_until ? fmtDate(subscription.featured_until) : null;
    const renewAmount = latestInvoice?.amount != null ? Math.round(latestInvoice.amount) : null;
    const renewSym = currencySymbol(latestInvoice?.currency || profileData.rates?.currency);
    const autoRenewOn = subscription?.auto_renew !== false;
    const displayMedia = (media && media.length)
      ? media
      : (p.photos || []).map((url, i) => ({ media_id: `p${i}`, url, media_type: 'photo', status: 'approved' }));
    const approvedPhotos = displayMedia.filter((m) => m.media_type === 'photo' && m.status === 'approved');
    const videoCount = displayMedia.filter((m) => m.media_type === 'video').length;
    const reviewCount = displayMedia.filter((m) => m.status === 'pending').length;
    const mediaCountLabel = [
      `${approvedPhotos.length} photo${approvedPhotos.length === 1 ? '' : 's'}`,
      videoCount ? `${videoCount} video${videoCount === 1 ? '' : 's'}` : null,
      reviewCount ? `${reviewCount} in review` : null,
    ].filter(Boolean).join(' · ') || 'No media yet';
    const coverUrl = approvedPhotos[0]?.url;
    const photoItems = displayMedia.filter((m) => m.media_type !== 'video');
    const videoItems = displayMedia.filter((m) => m.media_type === 'video');
    const previewEnquiries = (enquiries || []).slice(0, 3);
    const handleAutoRenewToggle = async () => {
      const next = !autoRenewOn;
      try {
        await updateAutoRenew(next, activeProviderId);
        fetchSubscription();
        toast.success(next ? 'Auto-renew enabled' : 'Auto-renew disabled');
      } catch (err) {
        notifyError(err, "We couldn't update auto-renew.");
      }
    };

    return (
      <div className="min-h-screen bg-[#F0EFF4] dashboard-light">
        <SiteHeader />
        <div className="pt-32 pb-20 section-padding">
          <div className="max-w-6xl mx-auto">
            <EmailVerificationBanner user={user} />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8" data-testid="manage-header">
              <div>
                <p className="text-[#7A2357] text-[11px] font-semibold uppercase tracking-[0.2em] mb-2">Manage Profile</p>
                {isAgencyScoped && (
                  <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1 text-sm text-[#7A2357] hover:text-[#A3243B] transition-colors mb-2" data-testid="back-to-agency-btn">
                    <CaretLeft size={16} /> Back to all profiles
                  </button>
                )}
                <h2 className="text-4xl md:text-5xl font-bold text-[#1B1820] mb-3">Welcome back, {firstName}</h2>
                <div className="flex items-center gap-4 flex-wrap">
                  {p.verified ? (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1B8A4B]" data-testid="verified-badge"><CheckCircle size={16} weight="fill" /> Verified</span>
                  ) : (
                    <span className="text-sm text-[#8E8597] capitalize">Verification {p.verification_status}</span>
                  )}
                  {p.location?.city && (
                    <span className="inline-flex items-center gap-1 text-sm text-[#5F5966]"><MapPin size={15} /> {p.location.city}, {p.location.country}</span>
                  )}
                </div>
              </div>
              <Link to={`/providers/${p.provider_id}`} className="inline-flex items-center gap-2 rounded-lg border border-[#DFDAE4] px-4 py-2.5 text-sm font-medium text-[#1B1820] hover:border-[#7A2357] transition-colors whitespace-nowrap" data-testid="view-public-profile-btn">
                View public profile <ArrowRight size={15} />
              </Link>
            </div>

            {/* Top row: status / messages / invoices */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6" data-testid="dashboard-top-row">
              {/* Profile status */}
              <div className="bg-white border border-[#ECE8EF] rounded-2xl p-5 flex flex-col" data-testid="subscription-banner">
                <div className="flex items-center gap-2 mb-3">
                  <Crown size={18} weight="fill" className="text-[#7A2357]" />
                  <h3 className="font-bold text-[#1B1820]">Profile status</h3>
                </div>
                {subscription?.in_grace ? (
                  <div className="flex-1 flex flex-col">
                    <p className="text-sm font-medium text-[#B45309] mb-1">Your listing has expired</p>
                    <p className="text-sm text-[#5F5966] mb-4">Visible for {Math.ceil(subscription.grace_days_left)} more day{Math.ceil(subscription.grace_days_left) === 1 ? '' : 's'}. Renew to stay on Browse.</p>
                    <Link to={subscribeHref} className="btn-primary text-sm self-start" data-testid="renew-cta">Renew now</Link>
                  </div>
                ) : !subscription?.featured_active ? (
                  <div className="flex-1 flex flex-col">
                    <p className="text-sm text-[#5F5966] mb-4">Choose a Featured plan to appear on Browse. Add VIP Boost to show at the very top.</p>
                    <Link to={subscribeHref} className="btn-primary text-sm self-start" data-testid="activate-cta">Choose a plan</Link>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
                      <span className="text-sm text-[#1B1820]">Online{planLabel ? ` · ${planLabel}` : ''}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-[#1B1820]">{daysLeft} of {totalDays} days left</span>
                      {endDateStr && <span className="text-[#8E8597]">Ends {endDateStr}</span>}
                    </div>
                    <div className="h-2 rounded-full bg-[#EBE0EA] overflow-hidden mb-4">
                      <div className="h-full rounded-full bg-[#7A2357]" style={{ width: `${planPct}%` }} />
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-[#F1ECF1] pt-3 mb-3">
                      <div>
                        <div className="text-sm font-medium text-[#1B1820]">Auto-renew</div>
                        {endDateStr && renewAmount != null && <div className="text-xs text-[#8E8597]">Renews {endDateStr} for {renewSym}{renewAmount}</div>}
                      </div>
                      <button type="button" role="switch" aria-checked={autoRenewOn} onClick={handleAutoRenewToggle} className={`flex-shrink-0 w-12 h-7 rounded-full p-0.5 transition-colors ${autoRenewOn ? 'bg-[#7A2357]' : 'bg-[#D8D2DC]'}`} data-testid="auto-renew-summary-toggle">
                        <span className={`block w-6 h-6 rounded-full bg-white transition-transform ${autoRenewOn ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                    <Link to={subscribeHref} className="text-sm font-semibold text-[#7A2357] hover:text-[#A3243B] self-start" data-testid="extend-plan-link">Extend or upgrade plan</Link>
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="bg-white border border-[#ECE8EF] rounded-2xl p-5 flex flex-col" data-testid="messages-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-[#1B1820]">Messages</h3>
                  {enquiriesUnread > 0 && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#7A2357] text-white">{enquiriesUnread} new</span>}
                </div>
                {previewEnquiries.length === 0 ? (
                  <p className="text-sm text-[#8E8597] flex-1">No messages yet.</p>
                ) : (
                  <div className="flex flex-col gap-3 flex-1">
                    {previewEnquiries.map((e) => (
                      <div key={e.enquiry_id} className="rounded-xl border border-[#F1ECF1] p-3">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${e.read ? 'bg-transparent' : 'bg-[#7A2357]'}`} />
                            <span className="text-sm font-semibold text-[#1B1820] truncate">{e.name}</span>
                          </div>
                          <span className="text-xs text-[#8E8597] flex-shrink-0">{e.created_at ? fmtDate(e.created_at) : ''}</span>
                        </div>
                        <p className="text-xs text-[#5F5966] truncate">{e.message}</p>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={() => setShowMessagesModal(true)} className="mt-4 text-sm font-semibold text-[#7A2357] hover:text-[#A3243B] text-left" data-testid="view-all-messages-btn">View all messages</button>
              </div>

              {/* Invoices */}
              <div className="bg-white border border-[#ECE8EF] rounded-2xl p-5 flex flex-col" data-testid="invoices-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-[#1B1820]">Invoices</h3>
                  <span className="text-sm text-[#8E8597]">{invoices.length} invoice{invoices.length === 1 ? '' : 's'}</span>
                </div>
                {invoices.length === 0 ? (
                  <p className="text-sm text-[#8E8597] flex-1">No invoices yet.</p>
                ) : (
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#F1ECF1] p-3">
                      <div className="min-w-0">
                        <p className="text-sm text-[#1B1820] truncate">{planLabel || 'Subscription'}{subscription?.plans?.[latestInvoice?.featured_id]?.duration_days ? ` · ${Math.round(subscription.plans[latestInvoice.featured_id].duration_days / 7)} weeks` : ''}</p>
                        <p className="text-xs text-[#8E8597]">{latestInvoice?.created_at ? fmtDate(latestInvoice.created_at) : ''}{renewAmount != null ? ` · ${renewSym}${renewAmount}` : ''}</p>
                      </div>
                      <a href={invoicePdfUrl(latestInvoice.invoice_id)} target="_blank" rel="noreferrer" className="flex-shrink-0 w-9 h-9 rounded-lg border border-[#DFDAE4] flex items-center justify-center text-[#7A2357] hover:border-[#7A2357] transition-colors" data-testid="invoice-download-btn"><DownloadSimple size={16} /></a>
                    </div>
                  </div>
                )}
                <button onClick={() => setShowInvoicesModal(true)} className="mt-4 text-sm font-semibold text-[#7A2357] hover:text-[#A3243B] text-left" data-testid="view-all-invoices-btn">View all invoices</button>
              </div>
            </div>

            {/* Verification banner */}
            {(() => {
              const s = p.verification_status || 'pending';
              if (p.verified === true) {
                return (
                  <div className="mb-6 rounded-2xl border border-[#1B8A4B]/25 bg-[#1B8A4B]/5 p-5 flex items-start gap-4" data-testid="verification-banner-approved">
                    <CheckCircle size={22} weight="fill" className="text-[#1B8A4B] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[#1B1820] font-semibold mb-1">Profile verified</p>
                      <p className="text-[#5F5966] text-sm">Your profile is live and shows the Verified badge in search results.</p>
                    </div>
                  </div>
                );
              }
              if (s === 'submitted') {
                return (
                  <div className="mb-6 rounded-2xl border border-[#7A2357]/25 bg-[#7A2357]/5 p-5 flex items-start gap-4" data-testid="verification-banner-submitted">
                    <ShieldCheck size={22} weight="thin" className="text-[#7A2357] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[#1B1820] font-semibold mb-1">Verification under review</p>
                      <p className="text-[#5F5966] text-sm">We&apos;re reviewing your documents — you&apos;ll receive an email within 24 hours.</p>
                    </div>
                  </div>
                );
              }
              if (s === 'rejected') {
                return (
                  <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/5 p-5 flex items-start gap-4" data-testid="verification-banner-rejected">
                    <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center shrink-0"><span className="text-red-500 text-lg">!</span></div>
                    <div className="flex-1">
                      <p className="text-[#1B1820] font-semibold mb-1">Verification needs attention</p>
                      {p.rejection_reason && <p className="text-[#5F5966] text-sm mb-3">Reason: {p.rejection_reason}</p>}
                      <button onClick={() => setShowVerificationModal(true)} className="btn-primary text-sm" data-testid="verification-resubmit-btn">Resubmit documents</button>
                    </div>
                  </div>
                );
              }
              return (
                <div className="mb-6 rounded-2xl border border-[#7A2357]/30 bg-gradient-to-br from-[#7A2357]/10 to-transparent p-6" data-testid="verification-banner-pending">
                  <div className="flex items-start gap-4">
                    <ShieldCheck size={24} weight="thin" className="text-[#7A2357] mt-1 shrink-0" />
                    <div className="flex-1">
                      <p className="text-[#1B1820] font-semibold mb-1">Unlock the Verified badge</p>
                      <p className="text-[#5F5966] text-sm mb-4 leading-relaxed">Verify your identity to appear in client search and build trust. Takes about 2 minutes.</p>
                      <button onClick={() => setShowVerificationModal(true)} className="btn-primary text-sm" data-testid="verification-start-btn">Start verification</button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Section cards */}
            <div className="flex flex-col gap-5">
              {/* 1. Basic info */}
              <div className="bg-white border border-[#ECE8EF] rounded-2xl p-6 md:p-8" data-testid="card-basic-info">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-[#EBE0EA] text-[#7A2357] text-sm font-bold flex items-center justify-center flex-shrink-0">1</span>
                    <div>
                      <h3 className="text-lg font-bold text-[#1B1820]">Basic info</h3>
                    </div>
                  </div>
                  <button onClick={() => openEdit(1)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#DFDAE4] px-3 py-1.5 text-sm font-medium text-[#1B1820] hover:border-[#7A2357] transition-colors flex-shrink-0" data-testid="edit-basic-info-btn"><PencilSimple size={14} /> Edit</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-3">
                  {basicRows.map((r) => (
                    <div key={r.label} className="flex items-center justify-between gap-4 border-b border-[#F3F0F5] pb-2">
                      <span className="text-sm text-[#8E8597]">{r.label}</span>
                      <span className={`text-sm font-medium text-[#1B1820] text-right ${r.cap ? 'capitalize' : ''}`}>{r.value || '—'}</span>
                    </div>
                  ))}
                </div>
                {(profileData.essence || p.bio) && (
                  <div className="mt-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#8E8597] mb-2">My essence</p>
                    <p className="text-sm text-[#1B1820] leading-relaxed">{profileData.essence || p.bio}</p>
                  </div>
                )}
              </div>

              {/* 2. Photos & videos */}
              <div className="bg-white border border-[#ECE8EF] rounded-2xl p-6 md:p-8" data-testid="card-photos">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-[#EBE0EA] text-[#7A2357] text-sm font-bold flex items-center justify-center flex-shrink-0">2</span>
                    <div>
                      <h3 className="text-lg font-bold text-[#1B1820]">Photos &amp; videos</h3>
                    </div>
                  </div>
                  <button onClick={() => openEdit(2)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#DFDAE4] px-3 py-1.5 text-sm font-medium text-[#1B1820] hover:border-[#7A2357] transition-colors flex-shrink-0" data-testid="edit-photos-btn"><PencilSimple size={14} /> Edit</button>
                </div>
                {displayMedia.length === 0 ? (
                  <div className="h-32 flex items-center justify-center border border-dashed border-[#DFDAE4] rounded-xl"><p className="text-sm text-[#8E8597] italic">No photos yet</p></div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {photoItems.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#8E8597] mb-2">Photos · {photoItems.length}</p>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                          {photoItems.slice(0, 12).map((m, i) => {
                            const isCover = m.url && m.url === coverUrl;
                            return (
                              <div key={m.media_id || i} className={`relative aspect-[3/4] rounded-xl overflow-hidden bg-[#EFE9F0] ${isCover ? 'ring-2 ring-[#7A2357]' : ''}`}>
                                {m.url ? (
                                  <img src={m.url} alt="" className={`w-full h-full object-cover ${m.status === 'pending' ? 'opacity-70' : ''}`} />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[#C9BED0]"><Camera size={20} /></div>
                                )}
                                {isCover && <span className="absolute top-1.5 left-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#7A2357] text-white">Cover</span>}
                                {m.status === 'pending' && <span className="absolute top-1.5 right-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#FACC15] text-[#5A4600]">In review</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {videoItems.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#8E8597] mb-2">Videos · {videoItems.length}</p>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                          {videoItems.slice(0, 12).map((m, i) => (
                            <div key={m.media_id || i} className="relative aspect-[3/4] rounded-xl overflow-hidden bg-[#2A2230]">
                              <div className="w-full h-full flex items-center justify-center"><span className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center text-[#2A2230]"><Play size={16} weight="fill" /></span></div>
                              {m.status === 'pending' && <span className="absolute top-1.5 right-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#FACC15] text-[#5A4600]">In review</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Services */}
              {(!isAgencyScoped || !applyServicesToAll) && (
              <div className="bg-white border border-[#ECE8EF] rounded-2xl p-6 md:p-8" data-testid="card-services">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-[#EBE0EA] text-[#7A2357] text-sm font-bold flex items-center justify-center flex-shrink-0">3</span>
                    <div>
                      <h3 className="text-lg font-bold text-[#1B1820]">Services</h3>
                    </div>
                  </div>
                  <button onClick={() => openEdit(3)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#DFDAE4] px-3 py-1.5 text-sm font-medium text-[#1B1820] hover:border-[#7A2357] transition-colors flex-shrink-0" data-testid="edit-services-btn"><PencilSimple size={14} /> Edit</button>
                </div>
                {legacyServices.length === 0 && inclusiveServices.length === 0 && extraServices.length === 0 ? (
                  <p className="text-sm text-[#8E8597] italic">No services set</p>
                ) : (
                  <div className="space-y-5">
                    {inclusiveServices.length === 0 && extraServices.length === 0 && legacyServices.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {legacyServices.map((s) => <span key={s} className="px-3 py-1 text-sm rounded-full bg-[#F7F2F6] text-[#1B1820]">{s}</span>)}
                      </div>
                    )}
                    {inclusiveServices.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#7A2357] mb-2">Included in your rate · {inclusiveServices.length}</p>
                        <div className="flex flex-wrap gap-2">
                          {inclusiveServices.map(([name]) => <span key={name} className="px-3 py-1 text-sm rounded-full bg-[#F7F2F6] text-[#1B1820]">{name}</span>)}
                        </div>
                      </div>
                    )}
                    {extraServices.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#7A2357] mb-2">Extras · {extraServices.length}</p>
                        <div className="divide-y divide-[#F3F0F5] border-t border-[#F3F0F5]">
                          {extraServices.map(([name, v]) => (
                            <div key={name} className="flex items-center justify-between py-2.5">
                              <span className="text-sm text-[#1B1820]">{name}</span>
                              <span className="text-sm font-medium text-[#1B1820]">{v.price ? `+ ${sym}${v.price}` : '—'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              )}

              {/* 4. Rates */}
              {(!isAgencyScoped || !applyRatesToAll) && (
              <div className="bg-white border border-[#ECE8EF] rounded-2xl p-6 md:p-8" data-testid="card-rates">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-[#EBE0EA] text-[#7A2357] text-sm font-bold flex items-center justify-center flex-shrink-0">4</span>
                    <div>
                      <h3 className="text-lg font-bold text-[#1B1820]">Rates</h3>
                    </div>
                  </div>
                  <button onClick={() => openEdit(4, 'rates-section')} className="inline-flex items-center gap-1.5 rounded-lg border border-[#DFDAE4] px-3 py-1.5 text-sm font-medium text-[#1B1820] hover:border-[#7A2357] transition-colors flex-shrink-0" data-testid="edit-rates-btn"><PencilSimple size={14} /> Edit</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                  {kinds.map((kind) => {
                    const col = kind === 'incall' ? rateIncall : rateOutcall;
                    const rows = rateRowsFor(col);
                    return (
                      <div key={kind}>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#7A2357] mb-2">{kind}</p>
                        <div className="divide-y divide-[#F3F0F5] border-t border-[#F3F0F5]">
                          {rows.length === 0 ? (
                            <p className="py-2.5 text-sm text-[#8E8597] italic">Not set</p>
                          ) : rows.map((r) => (
                            <div key={r.label} className="flex items-center justify-between py-2.5">
                              <span className="text-sm text-[#1B1820]">{r.label}</span>
                              <span className="text-sm font-medium text-[#1B1820]">{sym}{Number(r.v).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-sm text-[#8E8597] mt-5">
                  {kinds.includes('outcall') && taxiCost ? `Outcall: + ${sym}${taxiCost} taxi · ` : ''}Prices in {(profileData.rates?.currency || 'EUR').toLowerCase() === 'eur' ? 'euro (EUR)' : (profileData.rates?.currency || 'EUR')}
                </p>
              </div>
              )}

              {/* 5. Availability */}
              {(!isAgencyScoped || !applyRatesToAll) && (
              <div className="bg-white border border-[#ECE8EF] rounded-2xl p-6 md:p-8" data-testid="card-availability">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-[#EBE0EA] text-[#7A2357] text-sm font-bold flex items-center justify-center flex-shrink-0">5</span>
                    <div>
                      <h3 className="text-lg font-bold text-[#1B1820]">Availability</h3>
                    </div>
                  </div>
                  <button onClick={() => openEdit(4, 'availability-section')} className="inline-flex items-center gap-1.5 rounded-lg border border-[#DFDAE4] px-3 py-1.5 text-sm font-medium text-[#1B1820] hover:border-[#7A2357] transition-colors flex-shrink-0" data-testid="edit-availability-btn"><PencilSimple size={14} /> Edit</button>
                </div>
                <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-[#EBE0EA] text-[#7A2357] mb-4">{availTypeLabel}</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                  {scheduleDays.map(([day, sched]) => (
                    <div key={day} className={`rounded-xl border p-3 text-center ${sched?.available ? 'border-[#ECE8EF]' : 'border-[#F1ECF1] opacity-60'}`}>
                      <p className="text-[10px] uppercase tracking-[0.15em] text-[#8E8597] mb-2">{(dayLabels[day] || day.slice(0, 3)).toUpperCase()}</p>
                      {sched?.available ? (
                        <>
                          <p className="text-sm text-[#1B1820]">{sched.start}</p>
                          <p className="text-sm text-[#1B1820]">{sched.end}</p>
                        </>
                      ) : (
                        <p className="text-sm text-[#8E8597]">Closed</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              )}

              {/* Remove profile */}
              <div className="bg-white border border-[#E8C9CF] rounded-2xl p-6 md:p-8 mt-2" data-testid="card-danger-zone">
                <h3 className="text-lg font-bold text-[#A3243B] mb-2">Remove my profile</h3>
                <p className="text-sm text-[#5F5966] mb-5">This permanently deletes your profile, photos, subscriptions and verification documents. This can&apos;t be undone.</p>
                <button onClick={() => setConfirmRemove(true)} disabled={removing} className="rounded-lg border border-[#A3243B] text-[#A3243B] hover:bg-[#A3243B]/5 transition-colors px-5 py-2.5 text-sm font-semibold disabled:opacity-50" data-testid="remove-profile-btn">
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
        {showMessagesModal && (
          <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/40 p-4 sm:p-8" onClick={() => setShowMessagesModal(false)} data-testid="messages-modal">
            <div className="w-full max-w-2xl mx-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-end mb-2"><button onClick={() => setShowMessagesModal(false)} className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[#1B1820]" data-testid="close-messages-modal"><X size={18} /></button></div>
              <MessagesBox providerId={activeProviderId} />
            </div>
          </div>
        )}
        {showInvoicesModal && (
          <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/40 p-4 sm:p-8" onClick={() => setShowInvoicesModal(false)} data-testid="invoices-modal">
            <div className="w-full max-w-2xl mx-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-end mb-2"><button onClick={() => setShowInvoicesModal(false)} className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[#1B1820]" data-testid="close-invoices-modal"><X size={18} /></button></div>
              <InvoicesBox providerId={activeProviderId} />
            </div>
          </div>
        )}
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
                  Step {currentStep} of {steps.length} · {currentStep === steps.length ? 'Final step' : 'About 6 minutes left'}
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
            className={currentStep === 1 || currentStep === 4 || currentStep === 5 ? 'p-0' : 'bg-white border border-[#ECE8EF] rounded-2xl p-6 md:p-8 shadow-[0_6px_20px_rgba(52,24,60,0.06)] transition-none'}
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
                <h3 className="text-[24px] md:text-[28px] font-bold text-[#1B1820] mb-6">Photos & Video&apos;s</h3>
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
              <ServicesStep
                data={profileData}
                update={(patch) => setProfileData({ ...profileData, ...patch })}
              />
            )}


            {/* Step 4: Rates & Availability */}
            {currentStep === 4 && (
              <RatesAvailabilityStep
                data={profileData}
                update={(patch) => setProfileData({ ...profileData, ...patch })}
              />
            )}

            {/* Step 5: Activate (paid advertising) */}
            {currentStep === 5 && (
              <div className="flex flex-col gap-6">
                {/* Card 1: Activate your profile */}
                <div className="bg-white border border-[#ECE8EF] rounded-2xl p-6 md:p-8 shadow-[0_6px_20px_rgba(52,24,60,0.06)]">
                  <div className="mb-6">
                    <h3 className="text-[24px] md:text-[28px] font-bold text-[#1B1820] mb-1">Activate your profile</h3>
                    <p className="text-sm text-[#5F5966]">Your profile is saved. Pick how long it stays visible on Browse.</p>
                  </div>

                  <div className="flex flex-col gap-6">
                    {/* Featured listing */}
                    <div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-3">
                        <Sparkle size={18} weight="fill" className="text-[#7A2357]" />
                        <span className="font-bold text-[#1B1820]">Featured listing</span>
                        <span className="text-sm text-[#8E8597]">· required to appear on Browse</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {FEATURED_OPTIONS.map((opt) => {
                          const on = planFeatured === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setPlanFeatured(opt.id)}
                              className={`relative text-left rounded-xl border p-5 transition-colors ${on ? 'border-[#7A2357] bg-[#7A2357]/5' : 'border-[#DFDAE4] bg-white hover:border-[#7A2357]'}`}
                              data-testid={`featured-option-${opt.id}`}
                            >
                              <span className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center ${on ? 'border-[#7A2357]' : 'border-[#C9C3CE]'}`}>
                                {on && <span className="w-2.5 h-2.5 rounded-full bg-[#7A2357]" />}
                              </span>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#8E8597] mb-2">{opt.label}</p>
                              <p className="text-[34px] leading-none font-bold text-[#1B1820] mb-2">€{opt.price}</p>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-[#8E8597]">{opt.perDay}</span>
                                {opt.badge && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#7A2357] text-white">{opt.badge}</span>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* VIP Boost add-on */}
                    <button
                      type="button"
                      onClick={() => setPlanVipOn(!planVipOn)}
                      className={`flex items-center gap-3 sm:gap-4 text-left rounded-xl border p-4 transition-colors ${planVipOn ? 'border-[#7A2357] bg-[#7A2357]/5' : 'border-[#ECE8EF] bg-white hover:border-[#7A2357]'}`}
                      data-testid="vip-toggle"
                    >
                      <span className={`flex-shrink-0 w-5 h-5 rounded-[5px] border-2 flex items-center justify-center ${planVipOn ? 'bg-[#7A2357] border-[#7A2357]' : 'bg-white border-[#898989]'}`}>
                        {planVipOn && <Check size={13} weight="bold" className="text-white" />}
                      </span>
                      <span className="flex-shrink-0 w-10 h-10 rounded-full bg-[#EBE0EA] flex items-center justify-center text-[#7A2357]"><Crown size={20} weight="fill" /></span>
                      <span className="flex-1 min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-[#1B1820]">Add VIP Boost</span>
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#F0ECF2] text-[#8E8597]">Optional</span>
                        </span>
                        <span className="block text-sm text-[#5F5966]">Show at the very top of Browse for the same {featuredWeeks}.</span>
                      </span>
                      <span className="flex-shrink-0 font-bold text-[#1B1820]">+ €{vipPrice}</span>
                    </button>

                    {/* Auto-renew */}
                    <div className="flex items-center justify-between gap-4 rounded-xl bg-[#EBE0EA] px-5 py-4">
                      <div>
                        <div className="font-semibold text-[#1B1820]">Auto-renew</div>
                        <div className="text-sm text-[#5F5966]">Renew automatically when your plan ends. Cancel any time from your dashboard.</div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={autoRenew}
                        onClick={() => setAutoRenew(!autoRenew)}
                        className={`flex-shrink-0 w-12 h-7 rounded-full p-0.5 transition-colors ${autoRenew ? 'bg-[#7A2357]' : 'bg-[#D8D2DC]'}`}
                        data-testid="auto-renew-toggle"
                      >
                        <span className={`block w-6 h-6 rounded-full bg-white transition-transform ${autoRenew ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card 2: Your order */}
                <div className="bg-white border border-[#ECE8EF] rounded-2xl p-6 md:p-8 shadow-[0_6px_20px_rgba(52,24,60,0.06)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#8E8597] mb-4">Your order</p>
                  <div className="flex items-center justify-between gap-4 pb-4">
                    <span className="text-[#1B1820]">Featured listing · {featuredWeeks}</span>
                    <span className="text-[#1B1820] font-medium">€{featuredOpt?.price || 0}</span>
                  </div>
                  {planVipOn && (
                    <div className="flex items-center justify-between gap-4 pb-4">
                      <span className="text-[#1B1820]">VIP Boost · {featuredWeeks}</span>
                      <span className="text-[#1B1820] font-medium">€{vipPrice}</span>
                    </div>
                  )}
                  <div className="border-t border-[#ECE8EF] pt-4 flex items-center justify-between gap-4">
                    <span className="text-lg font-bold text-[#1B1820]">Total today</span>
                    <span className="text-[28px] font-bold text-[#1B1820]" data-testid="total-amount">€{stepTotal}</span>
                  </div>
                  <p className="text-sm text-[#8E8597] mt-3">
                    {autoRenew ? `Then €${stepTotal} every ${featuredWeeks} until cancelled. Cancel any time from your dashboard.` : 'One-time payment. No auto-renew.'}
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-5 text-sm text-[#8E8597]">
                    <Lock size={15} weight="fill" /> Visa, Mastercard, Apple Pay, PayPal &amp; more
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
                        : async () => { await saveDraft(); nextStep(); }}
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
                    <>
                      <p className="hidden sm:block text-sm text-[#8E8597]">Not ready? Your profile stays saved as a draft.</p>
                      <button
                        type="button"
                        onClick={handlePayAndActivate}
                        disabled={payRedirecting}
                        className="btn-primary flex items-center gap-2 disabled:opacity-50"
                        data-testid="pay-and-activate-button"
                      >
                        {payRedirecting ? 'Redirecting…' : (
                          <>Pay €{stepTotal} & activate <ArrowRight size={18} /></>
                        )}
                      </button>
                    </>
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

