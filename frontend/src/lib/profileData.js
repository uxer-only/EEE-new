/* Shared profile-data helpers for the advertiser / agency editors. */
import { defaultSchedule } from '@/constants/companionData';

export const COUNTRY_DIAL_CODES = {
  Belgium: '+32', Netherlands: '+31', Luxembourg: '+352', France: '+33', Germany: '+49', 'United Kingdom': '+44',
  Spain: '+34', Italy: '+39', Portugal: '+351', Switzerland: '+41', Austria: '+43', Ireland: '+353', Denmark: '+45',
  Sweden: '+46', Norway: '+47', Finland: '+358', Poland: '+48', 'Czech Republic': '+420', Greece: '+30', Croatia: '+385',
  Hungary: '+36', Romania: '+40', Bulgaria: '+359', Slovenia: '+386', Slovakia: '+421', Estonia: '+372', Latvia: '+371',
  Lithuania: '+370', Cyprus: '+357', Malta: '+356', Monaco: '+377', Andorra: '+376', 'United States': '+1', Canada: '+1',
  Australia: '+61', 'New Zealand': '+64', Brazil: '+55', Argentina: '+54', Mexico: '+52', 'United Arab Emirates': '+971',
  Singapore: '+65', Japan: '+81', 'South Korea': '+82', Thailand: '+66',
};

const blankCol = () => ({ '1hour': '', '2hours': '', '3hours': '', overnight: '', extras: [] });

export const emptyProfile = (accountType = 'independent') => ({
  display_name: '', account_type: accountType, age: '', gender: '', essence: '', companionshipType: '',
  location: { city: '', country: '' }, bio: '', services: {},
  rates: { currency: 'EUR', incall: blankCol(), outcall: blankCol() },
  contact: { phone: '', email: '' },
  schedule: defaultSchedule(), availability_type: 'both', booking_advance: false, available247: false,
  worldwide_travel: false, accepts_disabilities: false,
  characteristics: {
    nationality: '', ethnicity: '', orientation: '', height: '', weight: '', eye_color: '', hair_color: '', hair_length: '',
    breast_size: '', breast_type: '', pubic_hair: '', languages: [], tattoos: '', piercings: '', smoker: '',
  },
});

/** Server profile → editable data (handles legacy shapes). */
export function normalizeProfile(p) {
  const base = emptyProfile(p.account_type || 'independent');
  const services = Array.isArray(p.services)
    ? p.services.reduce((acc, s) => ({ ...acc, [s]: { type: 'inclusive', price: '' } }), {})
    : (p.services || {});
  let rates;
  if (p.rates?.incall || p.rates?.outcall) {
    // round stored prices to cents (older data can hold float noise like 919.9999)
    const cents = (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 100) / 100 : v);
    const col = (c) => {
      const out = { ...blankCol() };
      Object.entries(c || {}).forEach(([k, v]) => { out[k] = k === 'extras' ? v : cents(v); });
      out.extras = Array.isArray(c?.extras) ? c.extras.map((e) => (e && typeof e === 'object' ? Object.fromEntries(Object.entries(e).map(([k, v]) => [k, cents(v)])) : e)) : [];
      return out;
    };
    rates = { currency: p.rates.currency || 'EUR', incall: col(p.rates.incall), outcall: col(p.rates.outcall) };
  } else {
    rates = {
      currency: 'EUR',
      incall: { ...blankCol(), '1hour': p.rates?.['1hour'] ?? p.rates?.hourly ?? '', '2hours': p.rates?.['2hours'] ?? '', '3hours': p.rates?.['3hours'] ?? '', overnight: p.rates?.overnight ?? '' },
      outcall: blankCol(),
    };
  }
  return {
    ...base,
    display_name: p.display_name || '',
    age: p.age ? String(p.age) : '',
    gender: p.gender || '',
    essence: p.essence || '',
    companionshipType: p.companionshipType || '',
    location: { city: p.location?.city || '', country: p.location?.country || '' },
    bio: p.bio || '',
    services,
    rates,
    contact: { ...base.contact, ...(p.contact || {}) },
    schedule: p.schedule && Object.keys(p.schedule).length ? p.schedule : defaultSchedule(),
    availability_type: p.availability_type === 'flexible' ? 'both' : (p.availability_type || 'both'),
    booking_advance: !!p.booking_advance,
    available247: !!p.available247,
    worldwide_travel: !!p.worldwide_travel,
    accepts_disabilities: !!p.accepts_disabilities,
    characteristics: { ...base.characteristics, ...(p.characteristics || {}), languages: Array.isArray(p.characteristics?.languages) ? p.characteristics.languages : [] },
  };
}

/** Editable data → API payload (photos are managed by the media endpoints, never sent here). */
export function toPayload(d) {
  const contact = { ...(d.contact || {}) };
  // keep the public profile's messaging links in sync with the IDs entered here
  if (contact.telegramId !== undefined) contact.telegram = contact.hasTelegram ? contact.telegramId : '';
  if (contact.hasWhatsapp && !contact.whatsapp) contact.whatsapp = contact.phone || '';
  return {
    display_name: (d.display_name || '').trim(),
    account_type: d.account_type,
    age: d.age ? parseInt(d.age, 10) : null,
    gender: d.gender,
    essence: d.essence,
    companionshipType: d.companionshipType,
    location: d.location,
    bio: d.bio,
    services: d.services,
    rates: d.rates,
    contact,
    schedule: d.schedule,
    availability_type: d.availability_type,
    booking_advance: !!d.booking_advance,
    available247: !!d.available247,
    worldwide_travel: !!d.worldwide_travel,
    accepts_disabilities: !!d.accepts_disabilities,
    characteristics: d.characteristics,
  };
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

/** Step 1 validation. Returns { field: message }. */
export function validateBasic(d, { withContact = true, who = 'you' } = {}) {
  const her = who === 'her';
  const e = {};
  const ageN = parseInt(d.age, 10);
  if (!(d.display_name || '').trim()) e.display_name = 'Enter a display name.';
  if (!String(d.age || '').trim()) e.age = her ? 'Enter her age.' : 'Enter your age.';
  else if (!(ageN >= 18)) e.age = her ? 'She must be 18 or older.' : 'You must be 18 or older to advertise.';
  if (withContact) {
    if (!(d.location?.city || '').trim()) e.city = her ? 'Enter the city she works in.' : 'Enter the city you work in.';
    if (!d.location?.country) e.country = 'Choose your country.';
    const digits = (d.contact?.phone || '').replace(/\D/g, '');
    if (digits.length < 8) e.phone = 'Enter a full mobile number, e.g. 470 12 34 56.';
    if (!EMAIL_RE.test((d.contact?.email || '').trim())) e.email = 'Enter a valid e-mail address, e.g. name@example.com.';
    if (d.contact?.hasTelegram && !(d.contact?.telegramId || '').trim()) e.telegramId = 'Required';
    if (d.contact?.hasLine && !(d.contact?.lineId || '').trim()) e.lineId = 'Required';
    if (d.contact?.hasWechat && !(d.contact?.wechatId || '').trim()) e.wechatId = 'Required';
  }
  return e;
}

const LABELS = { display_name: ['Display name', '#bi-name'], age: ['Age', '#bi-age'], city: ['City', '#bi-city'], country: ['Country', '#bi-country'], phone: ['Mobile phone', '#ct-phone'], email: ['E-mail', '#ct-mail'], telegramId: ['Telegram username', '#sec-contact'], lineId: ['Line ID', '#sec-contact'], wechatId: ['WeChat ID', '#sec-contact'] };
export const errorItems = (errors, names = {}) => Object.entries(errors).map(([k, msg]) => ({ msg: `${names[k] || LABELS[k]?.[0] || k}: ${msg === 'Required' ? 'Enter it or turn the app off.' : msg}`, href: LABELS[k]?.[1] || '#' }));
export const errorTitle = (n) => (n === 1 ? 'Fix 1 field to continue' : `Fix ${n} fields to continue`);

/** Quick summaries used on dashboards. */
export function summarize(d) {
  const svc = Object.entries(d.services || {}).filter(([, v]) => v?.type);
  const sched = d.schedule || {};
  const activeDays = Object.values(sched).filter((s) => s?.available).length;
  const one = [d.rates?.incall?.['1hour'], d.rates?.outcall?.['1hour']].map(Number).filter((x) => x > 0);
  return { services: svc.length, extras: svc.filter(([, v]) => v.type === 'extra').length, activeDays, fromRate: one.length ? Math.min(...one) : null };
}

/* ---------- agency ---------- */

/** Agency master profile (defaults) → editable data in the same shape as a profile. */
export function agencyToForm(ag = {}) {
  const av = ag.default_availability || {};
  const d = normalizeProfile({
    display_name: ag.agency_name || '', location: ag.location, bio: ag.description || '', contact: ag.contact,
    services: ag.default_services || {}, rates: ag.default_rates, accepts_disabilities: ag.accepts_disabilities,
    availability_type: av.availability_type, schedule: av.schedule, available247: av.available247,
    booking_advance: av.booking_advance, worldwide_travel: av.worldwide_travel,
    characteristics: { languages: Array.isArray(ag.languages) ? ag.languages : [] },
  });
  return { ...d, account_type: 'agency' };
}

/** Editable agency data → POST /agency/profile body. */
export function formToAgency(d) {
  const p = toPayload(d);
  return {
    agency_name: (d.display_name || '').trim(),
    location: d.location || {},
    description: d.bio || '',
    languages: d.characteristics?.languages || [],
    contact: p.contact,
    default_services: d.services || {},
    default_rates: d.rates || {},
    default_availability: {
      availability_type: d.availability_type, schedule: d.schedule, available247: !!d.available247,
      booking_advance: !!d.booking_advance, worldwide_travel: !!d.worldwide_travel,
    },
    accepts_disabilities: !!d.accepts_disabilities,
  };
}

/** Agency basic info validation (name, city, country, contact). */
export function validateAgency(d) {
  const e = validateBasic({ ...d, age: '99' });
  delete e.age;
  if (e.display_name) e.display_name = 'Enter your agency name.';
  return e;
}

/** A new companion profile, pre-filled from the agency defaults. */
export function companionFromAgency(ag) {
  const base = emptyProfile('independent');
  if (!ag) return base;
  const a = agencyToForm(ag);
  return {
    ...base,
    gender: 'female',
    companionshipType: 'escort',
    location: a.location,
    contact: a.contact,
    services: a.services,
    accepts_disabilities: a.accepts_disabilities,
    rates: a.rates,
    availability_type: a.availability_type,
    schedule: a.schedule,
    available247: a.available247,
    booking_advance: a.booking_advance,
    worldwide_travel: a.worldwide_travel,
    characteristics: { ...base.characteristics, orientation: 'Straight', languages: a.characteristics.languages },
  };
}
