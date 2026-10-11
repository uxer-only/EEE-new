// Shared companion/profile constants used by the provider dashboard and the agency onboarding wizard.

export const COUNTRY_DIAL_CODES = {
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

// Dial-code options for the phone country selector (ISO + dial), ordered like COUNTRY_DIAL_CODES.
export const DIAL_CODE_OPTIONS = [
  { iso: 'BE', name: 'Belgium', dial: '+32' }, { iso: 'NL', name: 'Netherlands', dial: '+31' },
  { iso: 'LU', name: 'Luxembourg', dial: '+352' }, { iso: 'FR', name: 'France', dial: '+33' },
  { iso: 'DE', name: 'Germany', dial: '+49' }, { iso: 'GB', name: 'United Kingdom', dial: '+44' },
  { iso: 'ES', name: 'Spain', dial: '+34' }, { iso: 'IT', name: 'Italy', dial: '+39' },
  { iso: 'PT', name: 'Portugal', dial: '+351' }, { iso: 'CH', name: 'Switzerland', dial: '+41' },
  { iso: 'AT', name: 'Austria', dial: '+43' }, { iso: 'IE', name: 'Ireland', dial: '+353' },
  { iso: 'DK', name: 'Denmark', dial: '+45' }, { iso: 'SE', name: 'Sweden', dial: '+46' },
  { iso: 'NO', name: 'Norway', dial: '+47' }, { iso: 'FI', name: 'Finland', dial: '+358' },
  { iso: 'PL', name: 'Poland', dial: '+48' }, { iso: 'CZ', name: 'Czech Republic', dial: '+420' },
  { iso: 'GR', name: 'Greece', dial: '+30' }, { iso: 'HR', name: 'Croatia', dial: '+385' },
  { iso: 'HU', name: 'Hungary', dial: '+36' }, { iso: 'RO', name: 'Romania', dial: '+40' },
  { iso: 'BG', name: 'Bulgaria', dial: '+359' }, { iso: 'SI', name: 'Slovenia', dial: '+386' },
  { iso: 'SK', name: 'Slovakia', dial: '+421' }, { iso: 'EE', name: 'Estonia', dial: '+372' },
  { iso: 'LV', name: 'Latvia', dial: '+371' }, { iso: 'LT', name: 'Lithuania', dial: '+370' },
  { iso: 'CY', name: 'Cyprus', dial: '+357' }, { iso: 'MT', name: 'Malta', dial: '+356' },
  { iso: 'IS', name: 'Iceland', dial: '+354' }, { iso: 'MC', name: 'Monaco', dial: '+377' },
  { iso: 'US', name: 'United States', dial: '+1' }, { iso: 'CA', name: 'Canada', dial: '+1' },
  { iso: 'MX', name: 'Mexico', dial: '+52' }, { iso: 'BR', name: 'Brazil', dial: '+55' },
  { iso: 'AR', name: 'Argentina', dial: '+54' }, { iso: 'AU', name: 'Australia', dial: '+61' },
  { iso: 'NZ', name: 'New Zealand', dial: '+64' }, { iso: 'JP', name: 'Japan', dial: '+81' },
  { iso: 'KR', name: 'South Korea', dial: '+82' }, { iso: 'CN', name: 'China', dial: '+86' },
  { iso: 'IN', name: 'India', dial: '+91' }, { iso: 'SG', name: 'Singapore', dial: '+65' },
  { iso: 'HK', name: 'Hong Kong', dial: '+852' }, { iso: 'TH', name: 'Thailand', dial: '+66' },
  { iso: 'AE', name: 'UAE', dial: '+971' }, { iso: 'SA', name: 'Saudi Arabia', dial: '+966' },
  { iso: 'TR', name: 'Turkey', dial: '+90' }, { iso: 'RU', name: 'Russia', dial: '+7' },
  { iso: 'UA', name: 'Ukraine', dial: '+380' }, { iso: 'ZA', name: 'South Africa', dial: '+27' },
  { iso: 'EG', name: 'Egypt', dial: '+20' }, { iso: 'IL', name: 'Israel', dial: '+972' },
  { iso: 'LB', name: 'Lebanon', dial: '+961' }, { iso: 'MA', name: 'Morocco', dial: '+212' }
];

const _DIALS_BY_LEN = DIAL_CODE_OPTIONS.map((o) => o.dial).sort((a, b) => b.length - a.length);

// Split a stored phone string into { dial, number }. Falls back to the given dial when none is embedded.
export const splitPhone = (phone, fallbackDial = '') => {
  const raw = (phone || '').trim();
  const match = _DIALS_BY_LEN.find((d) => raw.startsWith(d));
  if (match) return { dial: match, number: raw.slice(match.length).replace(/^\s+/, '') };
  return { dial: fallbackDial, number: raw };
};

export const joinPhone = (dial, number) => `${dial || ''} ${(number || '').trim()}`.trim();

export const CURRENCY_OPTIONS = [
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

export const currencySymbol = (code) => CURRENCY_OPTIONS.find((c) => c.code === code)?.symbol || '€';

export const escortServices = [
  'Relaxing massage', 'Erotic massage', 'Couple massage', 'Body to body',
  'Classic sex', '69 position', 'Cunnilingus', 'Dirty talk', 'Duo with girl',
  'Facesitting', 'Fingering', 'French kissing', 'Handjob', 'GFE', 'Masturbation',
  'Oral without condom', 'Rimming', 'Role-play', 'Greek', 'Sex toys', 'Shower together',
  'Squirting', 'Striptease', 'Uniform', 'Casual photos', 'Couples', 'Cum on face',
  'Cum in mouth', 'Deepthroat', 'Erotic photos', 'Filming', 'Facefuck',
  'Porn star experience', 'Strapon service', 'Swallowing', 'With 2 men', 'Group sex',
  'Findom', 'Double penetration', 'BDSM - Femdom'
];

export const massageServices = [
  'Relaxing massage', 'Erotic massage', 'Couple massage', 'Body to body',
  'Role-play', 'Sex toys', 'Shower together', 'Striptease', 'Uniform',
  'Casual photos', 'Couples', 'Erotic photos', 'Filming'
];

export const serviceOptionsFor = (companionshipType) =>
  companionshipType === 'erotic-massage' ? massageServices : escortServices;

// Categorised service catalog (Travel is not a service — it is a profile option) for the Services step + profile grouping.
export const SERVICE_CATEGORIES = [
  { id: 'massage', label: 'Massage', services: ['Relaxing massage', 'Erotic massage', 'Couple massage', 'Body to body', 'Shower together'] },
  { id: 'companionship', label: 'Companionship & role-play', services: ['GFE', 'Dirty talk', 'French kissing', 'Role-play', 'Uniform', 'Striptease', 'Duo with girl'] },
  { id: 'intimate', label: 'Intimate', services: ['Classic sex', '69 position', 'Cunnilingus', 'Fingering', 'Handjob', 'Masturbation', 'Oral with condom', 'Oral without condom', 'Rimming', 'Greek', 'Sex toys', 'Squirting', 'Cum on face', 'Cum in mouth', 'Deepthroat', 'Facefuck', 'Swallowing', 'Facesitting', 'Porn star experience'] },
  { id: 'couples', label: 'Couples & groups', services: ['Couples', 'With 2 men', 'Group sex', 'Double penetration'] },
  { id: 'photos', label: 'Photos & filming', services: ['Casual photos', 'Erotic photos', 'Filming'] },
  { id: 'fetish', label: 'Fetish & BDSM', services: ['Findom', 'BDSM - Femdom', 'Strapon service'] },
];

export const ALL_CATALOG_SERVICES = SERVICE_CATEGORIES.flatMap((c) => c.services);

// Services step: two groups with a default pricing type when the service is ticked.
export const SERVICE_GROUPS = [
  { id: 'incl', title: 'Usual services', defaultType: 'inclusive', services: ['69 position', 'Body to body', 'Casual photos', 'Classic sex', 'Cunnilingus', 'Dirty talk', 'Erotic massage', 'Fingering', 'French kissing', 'GFE', 'Handjob', 'Masturbation', 'Oral with condom', 'Relaxing massage', 'Sex toys', 'Shower together', 'Striptease'] },
  { id: 'extra', title: 'Usually an extra', defaultType: 'extra', services: ['BDSM - Femdom', 'Couple massage', 'Couples', 'Cum in mouth', 'Cum on face', 'Deepthroat', 'Double penetration', 'Duo with girl', 'Erotic photos', 'Facefuck', 'Facesitting', 'Filming', 'Findom', 'Greek', 'Group sex', 'Oral without condom', 'Porn star experience', 'Rimming', 'Role-play', 'Squirting', 'Strapon service', 'Swallowing', 'Uniform', 'With 2 men'] },
];
export const GROUPED_SERVICES = SERVICE_GROUPS.flatMap((g) => g.services);

// Returns the category label a service name belongs to (or 'Other' for custom services).
const _norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const _CATEGORY_BY_NORM = SERVICE_CATEGORIES.reduce((map, c) => {
  c.services.forEach((s) => { map[_norm(s)] = c.label; });
  return map;
}, {});
export const categoryForService = (name) => _CATEGORY_BY_NORM[_norm(name)] || 'Other';

export const defaultSchedule = () => ({
  monday: { available: true, start: '10:00', end: '22:00' },
  tuesday: { available: true, start: '10:00', end: '22:00' },
  wednesday: { available: true, start: '10:00', end: '22:00' },
  thursday: { available: true, start: '10:00', end: '22:00' },
  friday: { available: true, start: '10:00', end: '23:00' },
  saturday: { available: true, start: '10:00', end: '23:00' },
  sunday: { available: true, start: '10:00', end: '22:00' }
});

export const blankRates = () => ({
  currency: 'EUR',
  incall: { '1hour': '', '2hours': '', '3hours': '', overnight: '', extras: [] },
  outcall: { '1hour': '', '2hours': '', '3hours': '', overnight: '', extras: [] }
});
