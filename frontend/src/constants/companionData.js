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
  'Travel', 'Classic sex', '69 position', 'Cunnilingus', 'Dirty talk', 'Duo with girl',
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

// Categorised service catalog (41 services) for the Services step + profile grouping.
export const SERVICE_CATEGORIES = [
  { id: 'massage', label: 'Massage', services: ['Relaxing massage', 'Erotic massage', 'Couple massage', 'Body to body', 'Shower together'] },
  { id: 'companionship', label: 'Companionship & role-play', services: ['GFE', 'Dirty talk', 'French kissing', 'Role-play', 'Uniform', 'Striptease', 'Travel', 'Duo with girl'] },
  { id: 'intimate', label: 'Intimate', services: ['Classic sex', '69 position', 'Cunnilingus', 'Fingering', 'Handjob', 'Masturbation', 'Oral without condom', 'Rimming', 'Greek', 'Sex toys', 'Squirting', 'Cum on face', 'Cum in mouth', 'Deepthroat', 'Facefuck', 'Swallowing', 'Facesitting', 'Porn star experience'] },
  { id: 'couples', label: 'Couples & groups', services: ['Couples', 'With 2 men', 'Group sex', 'Double penetration'] },
  { id: 'photos', label: 'Photos & filming', services: ['Casual photos', 'Erotic photos', 'Filming'] },
  { id: 'fetish', label: 'Fetish & BDSM', services: ['Findom', 'BDSM - Femdom', 'Strapon service'] },
];

export const ALL_CATALOG_SERVICES = SERVICE_CATEGORIES.flatMap((c) => c.services);

// Returns the category label a service name belongs to (or 'Other' for custom services).
export const categoryForService = (name) => {
  const cat = SERVICE_CATEGORIES.find((c) => c.services.includes(name));
  return cat ? cat.label : 'Other';
};

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
